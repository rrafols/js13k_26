// ---------- state ----------
const SPD = 2.7, MINLEN = 80, MAXLEN = 280, MAXBOWS = 3, BOWLIFE = 420, LENS = 200;
const STORY = 4019, KEEP = 5;         // the seed the middle of the story grows from
const WEIGHT = 2.6, FLOW = .55;                      // a bridge under your feet, and the pull of the water
const PMAX = 3, PRESP = 3000;                        // three splits, then a long walk back
let prismEnt = null;                                 // the horn on its pedestal, wherever it is
// A colour door opens for exactly one mask, the same rule a crystal follows.
const DOOR = {'!':1, '@':2, '%':3, '$':4, '&':5, '*':6, '=':7};
// Coloured keys and their locks. A lock never sits on the way out of a room --
// only on side vaults -- and its key always lies in a room you reach first, so
// there is no way to lock yourself out of the exit.
const KEY = {x:1, y:2, z:4}, LOCK = {'[':1, ']':2, '{':4};
const DASH = 13, DSPD = 6.6, DCD = 34;
let shardGoal = 7;
const BANDS = ['#ff4d5e','#ff9c3d','#ffe14d','#5ddb62','#4db6ff','#5a5aff','#b04dff'];
// A beam carries a 3-bit colour mask: 1 red, 2 green, 4 blue, 7 white. Prisms
// split it into channels, filters keep one, and beams crossing the same tile
// mix additively -- red + green lights a yellow crystal.
const MASKC = ['#666','#ff4d5e','#5ddb62','#ffe14d','#4db6ff','#ff5ef0','#4de1d5','#fff'];
let rooms, room, map, ents, bows, bridged, ramped, ps, pl, aim, charge, charging, won, shake = 0, tick = 0, keys = {};

let DUN = SRC, scene = 'title', mode = 'story', seed = 0, runF = 0, best = {}, pick = 0, cb = 0, endWin = 0;
let sig = 0, sigNeed = 0, tipT = 0, tipMsg = '', seenTip = new Set();
// Hand-built rooms teach the verbs; everything else is taught by the thing
// itself, the first time a run puts one in front of you. Keyed by the tile, so
// it works the same in a generated dungeon as in an authored one.
const MTIP = {
  '7':'A crystal wants light. White light, unless it is coloured.',
  'f':'Torches take a beam. Light them all and the gate opens.',
  'X':'Cracked stone. Shift to gallop straight through it.',
  '^':'High ground. Lay a rainbow up the cliff and walk up it.',
  'O':'Push it. Into water it sinks, and the tile stays crossable for good.',
  'q':'Pots break. Some of them are hiding something.',
  '+':'A lens. Light that crosses it carries five tiles further.',
  ')':'This mirror sits on a sledge. Shove it where the beam needs it.',
  '>':'A prism splits white light into red, green and blue.',
  'r':'Coloured glass keeps one channel and stops the rest.',
  'P':'The Prism Horn. A full charge splits into three, and it holds three.',
  'S':'A sun sigil. Light every one and a vault opens, somewhere else.',
  '|':'This is what the sigils open.',
  'x':'A coloured key. Its lock is somewhere ahead.',
  '[':'A keyed lock. You need the key of its colour.',
  'C':'Rain clouds drink rainbows. Gallop into one before you cross.',
  'M':'A chest. Stand beside it.',
  'Y':'The Sun Gate wants every colour before it opens.',
  '~':'The current pulls. Standing on a rainbow burns it, so keep moving.'
};
const daily = () => { const d = new Date(); return d.getFullYear()*1e4 + (d.getMonth() + 1)*100 + d.getDate(); };
const bestKey = () => mode === 'daily' ? 'daily' + seed : mode;
function loadBest(){ try { best = JSON.parse(localStorage.ru13 || '{}'); } catch(e){ best = {}; } cb = best.cb || 0; }
function saveBest(k, v){ try { best[k] = v; localStorage.ru13 = JSON.stringify(best); } catch(e){} }
const clock = f => (f/3600 | 0) + ':' + ('0' + (f/60 % 60 | 0)).slice(-2);
const MODES = ['story','daily','random','rush'];
function start(m){
  mode = m;
  if(m === 'story'){ DUN = hybrid(STORY, KEEP); shardGoal = DUN.goal; }
  else if(m === 'rush'){ DUN = genRush(); shardGoal = 0; }
  else {
    seed = m === 'daily' ? daily() : Math.random()*1e9 | 0;
    DUN = gen(seed, 9 + seed % 4);
    shardGoal = DUN.goal;
  }
  scene = 'intro'; newGame();
  if(m === 'rush') pl.prism = 1;
}
function newGame(){
  runF = 0; sig = 0; prismEnt = null; seenTip = new Set(); tipT = 0;
  // Sigil crystals are scattered across rooms and open one door somewhere else,
  // so a run has at least one objective that does not fit on a single screen.
  sigNeed = DUN.reduce((n, r) => n + r.m.join('').split('S').length - 1, 0);
  rooms = DUN.map(r => ({...r, m:r.m.map(s => s.split('')), ents:null, drain:r.drain || 0,
                         seen:0, lit:new Set(), paint:new Map(), go:null}));
  pl = {x:0, y:0, r:13, dir:0, hp:3, keys:0, kk:{}, shards:0, prism:0, pch:0, prech:0, inv:0, dash:0, cd:0, z:0, stolen:0, push:0};
  won = 0; aim = {x:600, y:300}; charge = 0; charging = 0; shake = 0;
  enter(0, SRC[0].start[0]*TS + TS/2, SRC[0].start[1]*TS + TS/2);
}
function enter(i, x, y){
  room = rooms[i]; map = room.m; room.seen = 1; room.go = null;
  if(!room.ents){                                   // spawn contents once per room
    room.ents = [];
    map.forEach((row, r) => row.forEach((t, c) => {
      if('EKHRPCBAUWVxyz'.includes(t)){
        room.ents.push({t, x:c*TS + TS/2, y:r*TS + TS/2, hx:c*TS + TS/2, hy:r*TS + TS/2,
                        hp:t === 'B' ? 5 : t === 'V' ? 3 : 1, w:Math.random()*7});
        const nb = [[1,0],[-1,0],[0,1],[0,-1]].map(([a,b]) => (map[r+b] || [])[c+a]);
        const cnt = ch => nb.filter(x => x === ch).length;
        map[r][c] = cnt('~') > 1 ? '~' : cnt('^') > 1 ? '^' : '.';   // keep its terrain
      }
    }));
  }
  ents = room.ents; bows = []; bridged = new Set(); ramped = new Set(); ps = [];
  if(mode === 'story'){                              // story teaches, the others do not
    if(room.tip && !room.tipped){ room.tipped = 1; tipMsg = room.tip; tipT = 300; }
    else {
      // the first mechanic in this room that the run has not shown yet
      const here = room.m.join('') + (room.flow ? '~' : '');
      for(const k in MTIP){
        const alt = k === 'r' ? 'rgb' : k === ')' ? '()' : k === 'x' ? 'xyz'
                  : k === '[' ? '[]{' : k === 'M' ? 'MN' : k;
        if(seenTip.has(k)) continue;
        if(![...alt].some(ch => here.includes(ch))) continue;
        if(k === '~' && !room.flow) continue;         // still water needs no warning
        seenTip.add(k); tipMsg = MTIP[k]; tipT = 300;
        break;
      }
    }
  }
  pl.x = x; pl.y = y; pl.dash = 0; pl.spawn = [x, y];
}
