// ---------- drawing ----------
function drawBow(b){
  const a = Math.min(1, b.life/70) * (b.life < 110 && b.life % 12 < 5 ? .55 : 1);
  g.globalAlpha = a; g.lineCap = 'butt';
  for(const p of b.parts) for(const s of p.segs){
    const nx = -s.dy, ny = s.dx, ex = s.x + s.dx*s.len, ey = s.y + s.dy*s.len;
    const white = p.col === 7;                                       // hue: all seven, or one
    const slim = p.thin || !white;                                   // refracted light is thinner
    g.strokeStyle = '#ffffff33'; g.lineWidth = slim ? 24 : 46;
    g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(ex, ey); g.stroke();
    BANDS.forEach((col, i) => {
      const o = (i - 3) * (slim ? 3.1 : 5.8);
      g.globalAlpha = a * (white ? 1 : .5 + Math.abs(3 - i)/6);      // banded, in its own hue
      g.strokeStyle = white ? col : MASKC[p.col]; g.lineWidth = slim ? 3.4 : 6;
      g.beginPath(); g.moveTo(s.x + nx*o, s.y + ny*o); g.lineTo(ex + nx*o, ey + ny*o); g.stroke();
    });
  }
  g.globalAlpha = 1;
}

function unicorn(){
  g.save(); g.translate(pl.x, pl.y); g.rotate(pl.dir);
  if(pl.inv > 0) g.globalAlpha = pl.inv % 10 < 5 ? .4 : 1;
  const b = Math.sin(tick/(pl.dash ? 3 : 6)) * (pl.dash ? 2.2 : 1.2);
  g.fillStyle = '#0008';
  ell(-1, 5 + (pl.z ? 7 : 0), 18, 13);
  if(pl.z) g.translate(0, -6);                                        // up on the plateau
  g.lineCap = 'round'; g.lineWidth = 3.4;
  BANDS.forEach((c, i) => {                                           // tail
    g.strokeStyle = c; const a = (i - 3) * .17;
    g.beginPath(); g.moveTo(-14, b);
    g.lineTo(-14 - Math.cos(a)*13, b + Math.sin(a)*13); g.stroke();
  });
  g.fillStyle = '#fff'; g.strokeStyle = '#2a2350'; g.lineWidth = 2;
  ell(-2, b, 16, 11); g.stroke();
  g.fillStyle = '#f2eefc';
  [[-9,-9],[-9,9],[7,-9],[7,9]].forEach(([x, y]) => {
    ell(x, y + b*.5, 4, 3);
  });
  g.lineWidth = 3.2;
  BANDS.forEach((c, i) => {                                           // mane
    g.globalAlpha = ((i < 3 ? 1 : i < 5 ? 2 : 4) & pl.stolen) ? .15 : 1;   // the thief's take shows
    g.strokeStyle = c;
    g.beginPath(); g.moveTo(6, b - 7.5 + i*2.5); g.lineTo(-3, b - 7.5 + i*2.5); g.stroke();
  });
  g.globalAlpha = pl.inv > 0 && pl.inv % 10 < 5 ? .4 : 1;
  g.fillStyle = '#fff'; g.strokeStyle = '#2a2350';
  ell(12, b, 8.5, 7); g.stroke();
  g.beginPath(); g.moveTo(9, b - 8); g.lineTo(12, b - 4); g.lineTo(7, b - 4); g.fill();
  g.beginPath(); g.moveTo(9, b + 8); g.lineTo(12, b + 4); g.lineTo(7, b + 4); g.fill();
  g.fillStyle = pl.prism ? '#dff3ff' : '#ffd84d';                     // horn (prism = crystal)
  g.beginPath(); g.moveTo(17, b - 3.5); g.lineTo(28, b); g.lineTo(17, b + 3.5); g.fill();
  g.fillStyle = '#222';
  circ(15, b - 4.5, 1.6);
  circ(15, b + 4.5, 1.6);
  g.fillStyle = '#ffb0c8';
  circ(19.5, b, 2);
  g.restore(); g.globalAlpha = 1;
}

const circ = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
const ell = (x, y, a, b) => { g.beginPath(); g.ellipse(x, y, a, b, 0, 0, 7); g.fill(); };
// Every colour in this game is also a channel mask, so it can be spelled out
// as three dots: red, green, blue, filled if present. White is all three.
function pips(x, y, m){
  g.fillStyle = '#0b0918cc';
  g.fillRect(x - 14, y - 6, 28, 12);                 // a plate, so they read on any tile
  for(let i = 0; i < 3; i++){
    const on = (m >> i) & 1;
    g.fillStyle = on ? '#fff' : '#0b0918';
    circ(x - 7 + i*7, y, 3.2);
    if(!on){ g.strokeStyle = '#ffffff66'; g.lineWidth = 1.4; g.beginPath(); g.arc(x - 7 + i*7, y, 3.2, 0, 7); g.stroke(); }
  }
}
// Every barred thing in the dungeon -- gate, sun gate, sigil door, colour door
// -- is a slab of n bars that retracts when it opens. One drawer, five callers.
function barred(x, y, n, open, col){
  if(open){
    g.globalAlpha = .4;
    for(let i = 0; i < n; i++){ g.fillStyle = col(i); g.fillRect(x + 2 + i*(36/n), y, 34/n, 6); }
    g.globalAlpha = 1;
    return;
  }
  g.fillStyle = '#2a2350'; g.fillRect(x, y, TS, TS);
  for(let i = 0; i < n; i++){ g.fillStyle = col(i); g.fillRect(x + 2 + i*(36/n), y + 3, 34/n, TS - 6); }
  g.fillStyle = '#0006'; g.fillRect(x + 2, y + TS/2 - 3, TS - 4, 6);
}
function star(x, y, n, ri, ro, rot){
  g.beginPath();
  for(let i = 0; i < n*2; i++){
    const a = i*Math.PI/n + rot, rr = i%2 ? ri : ro;
    g.lineTo(x + Math.cos(a)*rr, y + Math.sin(a)*rr);
  }
  g.closePath(); g.fill();
}

// ---------- darkness ----------
// A room the storm drank is dark as well as grey, and your rainbow is the lamp.
// Nothing here casts a shadow by hand: cast() already stops a beam at the first
// solid tile and records every tile it entered, so the tiles behind a wall are
// simply never in that set. What you have already painted stays faintly lit,
// which turns room.paint into the map you carry.
const WAVE = [0,1,2,3,4,5,6,7].map(i =>
  'rgba(255,255,255,' + (.019 + .019*Math.sin(i/8*6.283)).toFixed(3) + ')');
const LMAP = new Float32Array(COLS*ROWS);
// 1 in a room the storm never touched; in a dark room, how lit that spot is.
const litAt = (x, y) => room.drain > .02 ? LMAP[(y/TS | 0)*COLS + (x/TS | 0)] : 1;
const inDark = e => room.drain > .02 && litAt(e.x, e.y) < .45;
function darkness(){
  const d = room.drain;
  if(d < .02) return;
  LMAP.fill(0);
  const put = (c, r, v) => {
    if(c >= 0 && r >= 0 && c < COLS && r < ROWS && LMAP[r*COLS + c] < v) LMAP[r*COLS + c] = v;
  };
  const lamp = (c, r, rad, p) => {                  // a soft pool of light
    for(let y = -rad; y <= rad; y++) for(let x = -rad; x <= rad; x++){
      const f = 1 - Math.hypot(x, y)/rad;
      if(f > 0) put(c + x, r + y, p*f);
    }
  };
  room.paint.forEach((m, id) => {                   // memory of your own light
    const [c, r] = id.split(',');
    put(+c, +r, .3);
  });
  for(const b of bows) for(const q of b.parts) for(const id of q.lit){
    const [c, r] = id.split(',');
    put(+c, +r, 1);                                 // line of sight, for free
    lamp(+c, +r, 2, .55);
  }
  for(let r = 0; r < ROWS; r++) for(let c = 0; c < COLS; c++)
    if(map[r][c] === 'F') lamp(c, r, 5, 1);         // torches earn their keep
  lamp(pl.x/TS | 0, pl.y/TS | 0, 3, .8);
  for(const e of ents){
    if(!e.hp) continue;
    if(e.t === 'L' || e.t === 'B') lamp(e.x/TS | 0, e.y/TS | 0, 4, .5);
    else if('KHRP'.includes(e.t)) lamp(e.x/TS | 0, e.y/TS | 0, 2, .5);   // treasure glimmers
  }

  for(let r = 0; r < ROWS; r++) for(let c = 0; c < COLS; c++){
    const a = (1 - Math.min(1, .22 + LMAP[r*COLS + c])) * d;
    if(a > .02){ g.fillStyle = 'rgba(6,4,18,' + a.toFixed(2) + ')'; g.fillRect(c*TS, r*TS, TS, TS); }
  }
}

function drawWorld(){
  for(let r = 0; r < ROWS; r++) for(let c = 0; c < COLS; c++){       // ground
    const t = map[r][c], x = c*TS, y = r*TS;
    if('#X/\\fF>rgb+'.includes(t)){
      g.fillStyle = '#4a3d78'; g.fillRect(x, y, TS, TS);
      g.fillStyle = '#6b5aa8'; g.fillRect(x + 2, y + 2, TS - 4, TS - 10);
      g.fillStyle = '#8878c8'; g.fillRect(x + 2, y + 2, TS - 4, 4);
      g.fillStyle = WAVE[(c - r + (tick/9 | 0)) & 7]; g.fillRect(x + 2, y + 2, TS - 4, 4);
    } else if(t === '^'){                            // high ground: lighter, with a cliff face
      const up = ramped.has(c + ',' + r);
      g.fillStyle = '#1c1738'; g.fillRect(x, y, TS, TS);
      g.fillStyle = up ? '#9c86e8' : '#7d6cc0'; g.fillRect(x, y - 4, TS, TS - 2);
      g.fillStyle = up ? '#d8c9ff' : '#a495e0'; g.fillRect(x, y - 4, TS, 6);
      if(up){ g.fillStyle = BANDS[(tick/6 | 0) % 7]; g.globalAlpha = .5; g.fillRect(x, y - 4, TS, 3); g.globalAlpha = 1; }
      g.fillStyle = '#00000066'; g.fillRect(x, y + TS - 6, TS, 6);
      g.fillStyle = '#ffffff10'; g.fillRect(x + 4, y + 6, 4, 4);
    } else if(t === '~'){
      g.fillStyle = '#1e4f96'; g.fillRect(x, y, TS, TS);
      g.fillStyle = '#3a78c8';
      const w = Math.sin((c + r)*.9 + tick/28) * 6;
      g.fillRect(x + 6 + w, y + 12, 14, 3);
      g.fillRect(x + 16 - w, y + 26, 10, 3);
      g.fillStyle = '#5b9ae0';
      g.fillRect(x + 10 - w*.6, y + 32 + Math.sin(tick/23 + c)*1.5, 8, 2);
      if(at(c, r - 1) !== '~'){                        // shoreline
        g.fillStyle = '#7fc4ff'; g.globalAlpha = .18 + Math.sin(tick/30 + c*.7)*.1;
        g.fillRect(x, y, TS, 3); g.globalAlpha = 1;
      }
    } else {
      g.fillStyle = (c + r) % 2 ? '#37305c' : '#3b3462';
      g.fillRect(x, y, TS, TS);
      g.fillStyle = WAVE[((c + r >> 1) + (tick/9 | 0)) & 7];   // a slow, wide diagonal swell
      g.fillRect(x, y, TS, TS);
      g.fillStyle = '#ffffff08'; g.fillRect(x + 4, y + 4, 3, 3);
    }
    const pm = room.paint.get(c + ',' + r);          // colour this tile has been shown
    if(pm){
      g.globalAlpha = pm === 7 ? .22 : .3;            // white light leaves a faint rainbow
      g.fillStyle = pm === 7 ? BANDS[(c*3 + r*5) % 7] : MASKC[pm];
      g.fillRect(x, y, TS, TS); g.globalAlpha = 1;
    }
  }

  for(let i = 0; i < 16; i++){                       // motes drifting through the room
    const mx2 = (i*167 + tick*(.25 + (i%4)*.12)) % (W + 40) - 20;
    const my2 = (i*283 + Math.sin(tick/70 + i)*26) % WH;
    g.globalAlpha = .05 + (i % 3)*.025;
    g.fillStyle = BANDS[i % 7];
    circ(mx2, my2, 1.4 + (i % 2));
  }
  g.globalAlpha = 1;

  bows.forEach(drawBow);

  for(let r = 0; r < ROWS; r++) for(let c = 0; c < COLS; c++){       // props, above rainbows
    const t = map[r][c], x = c*TS, y = r*TS, mx = x + TS/2, my = y + TS/2;
    if(t === 'X'){
      g.fillStyle = '#b0724a66'; g.fillRect(x + 2, y + 2, TS - 4, TS - 10);
      g.fillStyle = '#d99a6a55'; g.fillRect(x + 2, y + 2, TS - 4, 4);
      g.strokeStyle = '#2a2350'; g.lineWidth = 3; g.beginPath();
      g.moveTo(x + 8, y); g.lineTo(x + 16, y + 16); g.lineTo(x + 6, y + 26); g.lineTo(x + 14, TS + y);
      g.moveTo(x + 16, y + 16); g.lineTo(x + 32, y + 22); g.stroke();
    } else if('/\\()'.includes(t)){
      if(t === '(' || t === ')'){                    // sledge under a movable mirror
        g.fillStyle = '#4a3d78'; g.fillRect(x + 3, y + 3, TS - 6, TS - 6);
        g.fillStyle = '#5b4d94'; g.fillRect(x + 6, y + 6, TS - 12, TS - 12);
      }
      const d = t === '/' || t === '(' ? 1 : -1;
      g.strokeStyle = '#dff3ff'; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x + 7, my + d*13); g.lineTo(x + 33, my - d*13); g.stroke();
      g.strokeStyle = '#7fd0ff'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x + 9, my + d*11); g.lineTo(x + 31, my - d*11); g.stroke();
    } else if(t === '+'){                            // lens
      g.fillStyle = '#dff3ff'; g.globalAlpha = .18;
      circ(mx, my, 17 + Math.sin(tick/22)*1.5); g.globalAlpha = 1;
      g.strokeStyle = '#8fd8ff'; g.lineWidth = 3;
      g.beginPath();
      for(let i = 0; i < 6; i++){
        const A = i*1.047 + tick/300;
        g.lineTo(mx + Math.cos(A)*13, my + Math.sin(A)*13);
      }
      g.closePath(); g.stroke();
      g.fillStyle = '#eaf7ff'; circ(mx, my, 5);
    } else if(t === 'f' || t === 'F'){
      g.fillStyle = '#3a3260'; g.fillRect(x + 12, y + 14, 16, 22);
      g.fillStyle = t === 'F' ? '#ffe14d' : '#5c5580';
      const s = t === 'F' ? 3 + Math.sin(tick/5)*1.6 : 0;
      circ(mx, y + 13, 7 + s);
      if(t === 'F'){ g.globalAlpha = .35; circ(mx, y + 13, 18 + s); g.globalAlpha = 1; }
    } else if(t === 'q'){                            // pot
      g.fillStyle = '#c98b3f';
      ell(mx, my + 3, 13, 14);
      g.fillStyle = '#8a5a2a'; g.fillRect(x + 8, y + 5, 24, 5);
      g.fillStyle = '#ffffff22'; ell(mx - 4, my, 3, 6);
    } else if(t === 'O'){                            // push block
      g.fillStyle = '#6b5aa8'; g.fillRect(x + 2, y + 2, TS - 4, TS - 4);
      g.fillStyle = '#8878c8'; g.fillRect(x + 5, y + 5, TS - 10, TS - 14);
      g.fillStyle = '#4a3d78'; g.fillRect(x + 5, y + TS - 11, TS - 10, 6);
      g.strokeStyle = '#2a2350'; g.lineWidth = 2; g.strokeRect(x + 2.5, y + 2.5, TS - 5, TS - 5);
    } else if('MNmn'.includes(t)){                   // chest
      const open = t === 'm' || t === 'n', gold = t === 'M' || t === 'm';
      g.fillStyle = '#8a5a2a'; g.fillRect(x + 4, y + 12, TS - 8, TS - 16);
      g.fillStyle = gold ? '#ffd84d' : '#c98b3f';
      g.fillRect(x + 4, open ? y + 2 : y + 8, TS - 8, open ? 6 : 10);
      if(!open){ g.fillStyle = '#5c3a18'; g.fillRect(mx - 3, y + 14, 6, 7); }
      else { g.globalAlpha = .3; g.fillStyle = '#ffe14d';
             circ(mx, my, 16); g.globalAlpha = 1; }
    } else if(t === 'D'){
      g.fillStyle = '#8a5a2a'; g.fillRect(x, y, TS, TS);
      g.fillStyle = '#c98b3f'; g.fillRect(x + 4, y + 4, TS - 8, TS - 8);
      g.fillStyle = '#5c3a18'; circ(mx, my, 5);
    } else if(t === 'G'){
      barred(x, y, 4, gateOpen(), () => '#8c8ca8');
    } else if(t === 'Y'){                            // sun gate: one bar per colour held
      barred(x, y, shardGoal, pl.shards >= shardGoal, i => i < pl.shards ? BANDS[i] : '#4b4468');
    } else if(t >= '1' && t <= '7'){                 // crystal: wants exactly this colour
      const on = room.lit.has(c + ',' + r), col = MASKC[+t];
      if(cb) pips(mx, my + 16, +t);
      g.fillStyle = on ? col : '#6d6d92';
      star(mx, my, 4, 5, on ? 15 : 12, tick/50);
      if(on){ g.globalAlpha = .3; g.fillStyle = col; star(mx, my, 4, 8, 22, -tick/40); g.globalAlpha = 1; }
      else { g.fillStyle = col; star(mx, my, 4, 2, 6, tick/50); }
    } else if(t === '>'){                            // prism
      g.fillStyle = '#dff3ff';
      g.beginPath(); g.moveTo(mx, y + 5); g.lineTo(x + 35, y + 33); g.lineTo(x + 5, y + 33); g.fill();
      BANDS.forEach((cc, i) => { g.fillStyle = cc; g.fillRect(x + 6 + i*4, y + 29, 3.6, 6); });
    } else if(t === 'r' || t === 'g' || t === 'b'){  // colour filter
      const col = MASKC[t === 'r' ? 1 : t === 'g' ? 2 : 4];
      g.globalAlpha = .8; g.fillStyle = col; g.fillRect(x + 3, y + 3, TS - 6, TS - 6); g.globalAlpha = 1;
      g.strokeStyle = '#ffffff77'; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, TS - 6, TS - 6);
      g.fillStyle = '#ffffff55'; g.fillRect(x + 7, y + 7, 8, TS - 14);
      if(cb) pips(mx, my, t === 'r' ? 1 : t === 'g' ? 2 : 4);
    } else if(t === 'S'){                            // sigil crystal
      const on = room.lit.has(c + ',' + r);
      g.fillStyle = on ? '#ffe14d' : '#5c5580';
      star(mx, my, 8, 6, on ? 17 : 13, tick/70);
      if(on){ g.globalAlpha = .25; star(mx, my, 8, 9, 24 + Math.sin(tick/12)*2, -tick/60); g.globalAlpha = 1; }
      g.fillStyle = on ? '#fff' : '#3a3260'; circ(mx, my, 4);
    } else if(t === '|'){                            // the door those sigils open
      barred(x, y, sigNeed, sig >= sigNeed, i => i < sig ? '#ffe14d' : '#4b4468');
    } else if(LOCK[t]){                              // keyed lock
      const col = MASKC[LOCK[t]];
      g.fillStyle = '#2a2350'; g.fillRect(x, y, TS, TS);
      g.fillStyle = col; g.fillRect(x + 3, y + 3, TS - 6, TS - 6);
      g.fillStyle = '#0007'; circ(mx, my - 2, 6); g.fillRect(mx - 2.5, my - 2, 5, 11);
      if(cb) pips(mx, my + 15, LOCK[t]);
    } else if(DOOR[t]){                              // colour door
      const m = DOOR[t], open = room.lit.has(c + ',' + r);
      barred(x, y, 4, open, () => MASKC[m]);
      if(cb && !open) pips(mx, my, m);
    } else if(t === 'T'){
      g.fillStyle = '#ffb84d'; g.globalAlpha = .3;
      circ(mx, my, 26 + Math.sin(tick/15)*3);
      g.globalAlpha = 1; g.fillStyle = '#ffe14d';
      star(mx, my, 8, 7, 19, tick/60);
    }
  }

  if(charging){                                      // preview + charge ring
    const bs = cast(pl.x, pl.y, Math.atan2(aim.y - pl.y, aim.x - pl.x), charge, 0, 7, 0, [], 0);
    g.setLineDash([7, 7]); g.lineWidth = 3;
    for(const p of bs){
      g.strokeStyle = p.col === 7 ? '#ffffff77' : MASKC[p.col] + 'aa';
      g.beginPath();
      for(const s of p.segs){ g.moveTo(s.x, s.y); g.lineTo(s.x + s.dx*s.len, s.y + s.dy*s.len); }
      g.stroke();
      const e = p.segs[p.segs.length - 1];
      g.fillStyle = '#ffffffaa';
      circ(e.x + e.dx*e.len, e.y + e.dy*e.len, 4);
    }
    g.setLineDash([]);
    if(cb) pips(pl.x, pl.y + 34, (7 & ~pl.stolen) || 7);
    const f = (charge - MINLEN)/(MAXLEN - MINLEN);
    g.strokeStyle = pl.prism && f > .87 ? '#dff3ff' : '#ffe14d'; g.lineWidth = 4;
    g.beginPath(); g.arc(pl.x, pl.y, 24, -1.57, -1.57 + f*6.283); g.stroke();
  }

  for(const e of ents){
    if(e.pop){
      g.globalAlpha = e.pop/(e.t === 'B' ? 30 : 12); g.fillStyle = '#ffe14d';
      star(e.x, e.y, 6, 4, (e.t === 'B' ? 60 : 26) - e.pop, 0); g.globalAlpha = 1;
    }
    if(!e.hp) continue;
    if(e.t === 'E'){
      const s = Math.sin(tick/8 + e.w) * 2;
      g.fillStyle = '#0005'; ell(e.x, e.y + 8, 12, 5);
      g.fillStyle = '#b04dff';
      ell(e.x, e.y, 12 + s, 12 - s);
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(e.x - 4, e.y - 2, 3, 0, 7); g.arc(e.x + 4, e.y - 2, 3, 0, 7); g.fill();
      g.fillStyle = '#222';
      g.beginPath(); g.arc(e.x - 4, e.y - 2, 1.4, 0, 7); g.arc(e.x + 4, e.y - 2, 1.4, 0, 7); g.fill();
    } else if(e.t === 'A'){                          // charger
      const wind = !e.ch && e.tel > 20 && tick % 6 < 3;
      g.fillStyle = '#0005'; ell(e.x, e.y + 9, 13, 5);
      g.fillStyle = e.stun > 0 ? '#8a8ab0' : wind ? '#fff' : '#ff8a3d';
      g.beginPath();
      for(let i = 0; i < 12; i++){
        const a = i*Math.PI/6, rr = i % 2 ? 9 : 15;
        g.lineTo(e.x + Math.cos(a)*rr, e.y + Math.sin(a)*rr);
      }
      g.fill();
      g.fillStyle = '#2a2350';
      g.beginPath(); g.arc(e.x - 4, e.y - 2, 2, 0, 7); g.arc(e.x + 4, e.y - 2, 2, 0, 7); g.fill();
      if(e.stun > 0){
        g.strokeStyle = '#ffe14d'; g.lineWidth = 2;
        for(let i = 0; i < 3; i++){
          const a = tick/6 + i*2.1;
          g.beginPath(); g.arc(e.x + Math.cos(a)*16, e.y - 18, 3, 0, 7); g.stroke();
        }
      }
    } else if(e.t === 'U'){                          // bubble turret
      g.fillStyle = '#0005'; ell(e.x, e.y + 10, 14, 5);
      g.fillStyle = '#3f7a8c'; circ(e.x, e.y, 15);
      g.fillStyle = '#8fd8ff';
      const a = Math.atan2(pl.y - e.y, pl.x - e.x);
      circ(e.x + Math.cos(a)*7, e.y + Math.sin(a)*7, 7);
      g.fillStyle = '#2a2350'; circ(e.x + Math.cos(a)*10, e.y + Math.sin(a)*10, 3);
    } else if(e.t === 'o'){                          // bubble
      g.fillStyle = '#8fd8ff'; g.globalAlpha = .75;
      circ(e.x, e.y, 8); g.globalAlpha = 1;
      g.fillStyle = '#fff'; circ(e.x - 3, e.y - 3, 2.4);
    } else if(e.t === 'W'){                          // bridge weevil
      const w = Math.sin(tick/5 + e.w)*2;
      g.fillStyle = '#0005'; ell(e.x, e.y + 7, 10, 4);
      g.fillStyle = '#4b3a6e';
      ell(e.x, e.y, 11 + w*.4, 8);
      g.strokeStyle = '#8878c8'; g.lineWidth = 2;
      for(let i = -1; i < 2; i += 2){
        g.beginPath(); g.moveTo(e.x - 3, e.y + i*6); g.lineTo(e.x - 9, e.y + i*10 + w); g.stroke();
        g.beginPath(); g.moveTo(e.x + 3, e.y + i*6); g.lineTo(e.x + 9, e.y + i*10 - w); g.stroke();
      }
      g.fillStyle = '#ffe14d';
      g.beginPath(); g.arc(e.x + 6, e.y - 2, 2, 0, 7); g.arc(e.x + 6, e.y + 2, 2, 0, 7); g.fill();
    } else if(e.t === 'V'){                          // colour thief
      const w = Math.sin(tick/10 + e.w)*3, hit = e.flash > 0 && e.flash % 6 < 3;
      g.fillStyle = '#0005'; ell(e.x, e.y + 14, 13, 5);
      g.fillStyle = hit ? '#fff' : '#5b4f8e';
      g.beginPath(); g.moveTo(e.x, e.y - 22 + w); g.lineTo(e.x + 17, e.y + 16); g.lineTo(e.x - 17, e.y + 16); g.fill();
      g.fillStyle = hit ? '#fff' : '#8878c8';                       // hood
      g.beginPath(); g.moveTo(e.x, e.y - 20 + w); g.lineTo(e.x + 11, e.y + 2 + w); g.lineTo(e.x - 11, e.y + 2 + w); g.fill();
      g.fillStyle = '#1c1738';
      ell(e.x, e.y - 3 + w, 9, 6);
      g.fillStyle = '#ffe14d';
      g.beginPath(); g.arc(e.x - 4, e.y - 3 + w, 2.4, 0, 7); g.arc(e.x + 4, e.y - 3 + w, 2.4, 0, 7); g.fill();
      BANDS.forEach((cc, i) => {                                    // stolen-colour trim
        g.fillStyle = cc; g.fillRect(e.x - 15 + i*4.3, e.y + 12, 4, 4);
      });
      if(e.holds){
        g.fillStyle = MASKC[e.holds]; g.globalAlpha = .35;
        circ(e.x, e.y + 18, 12 + Math.sin(tick/8)*2); g.globalAlpha = 1;
        g.fillStyle = MASKC[e.holds];
        circ(e.x, e.y + 18, 6);
      }
      g.fillStyle = '#0007'; g.fillRect(e.x - 22, e.y - 30, 44, 6);
      g.fillStyle = '#b04dff'; g.fillRect(e.x - 21, e.y - 29, 42*e.hp/3, 4);
    } else if(e.t === 'C'){                          // rain cloud
      g.fillStyle = '#5b6480';
      const w = Math.sin(tick/16 + e.w)*3;
      [[-13,0,13],[0,-6,15],[13,0,12]].forEach(([dx, dy, rr]) => {
        circ(e.x + dx, e.y + dy + w*.3, rr);
      });
      g.strokeStyle = '#8fa3c8'; g.lineWidth = 2.5; g.lineCap = 'round';
      for(let i = 0; i < 4; i++){
        const rx = e.x - 14 + i*9, ry = e.y + 12 + ((tick*1.6 + i*11) % 16);
        g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 1, ry + 6); g.stroke();
      }
    } else if(e.t === 'B'){                          // the storm
      const s = Math.sin(tick/14)*5, hit = e.flash > 0 && e.flash % 6 < 3;
      g.fillStyle = hit ? '#fff' : (room.drain > .3 ? '#6a6f8c' : '#4a4a78');
      [[-34,4,26],[0,-10,34],[34,4,26],[-16,16,22],[18,16,22]].forEach(([dx, dy, rr]) => {
        circ(e.x + dx, e.y + dy + s*.4, rr + s*.2);
      });
      g.fillStyle = '#ffe14d';                       // eye
      ell(e.x, e.y, 15, 10 + Math.sin(tick/9)*2);
      g.fillStyle = '#2a2350';
      circ(e.x + (pl.x > e.x ? 4 : -4), e.y, 6);
      g.fillStyle = '#0007'; g.fillRect(e.x - 62, e.y - 62, 124, 9);
      g.fillStyle = '#ff4d5e'; g.fillRect(e.x - 60, e.y - 60, 120*e.hp/5, 5);
    } else if(e.t === 'L'){                          // lightning telegraph
      const f = 1 - e.tmr/52;
      g.strokeStyle = '#ffe14d'; g.lineWidth = 3; g.globalAlpha = .3 + f*.7;
      g.beginPath(); g.arc(e.x, e.y, 40*(1 - f) + 8, 0, 7); g.stroke();
      g.globalAlpha = .25; g.fillStyle = '#ffe14d';
      circ(e.x, e.y, 38); g.globalAlpha = 1;
      if(e.tmr < 8){
        g.strokeStyle = '#fff'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(e.x - 8, 0); g.lineTo(e.x + 6, e.y - 30); g.lineTo(e.x - 4, e.y - 14);
        g.lineTo(e.x + 4, e.y); g.stroke();
      }
    } else if(KEY[e.t]){                             // coloured key
      const col = MASKC[KEY[e.t]], b = Math.sin(tick/13)*2;
      g.globalAlpha = .25; g.fillStyle = col; circ(e.x, e.y + b, 14); g.globalAlpha = 1;
      g.fillStyle = col;
      circ(e.x - 5, e.y + b, 5);
      g.fillRect(e.x - 1, e.y - 2 + b, 13, 4);
      g.fillRect(e.x + 8, e.y + b, 4, 6);
      g.fillStyle = '#0009'; circ(e.x - 5, e.y + b, 2);
      if(cb) pips(e.x, e.y + 20, KEY[e.t]);
    } else if(e.t === 'K'){
      g.fillStyle = '#ffd84d';
      circ(e.x - 4, e.y, 5);
      g.fillRect(e.x, e.y - 2, 13, 4); g.fillRect(e.x + 9, e.y, 4, 6);
    } else if(e.t === 'H'){
      g.fillStyle = '#ff5470'; const b = Math.sin(tick/12);
      g.beginPath(); g.arc(e.x - 4, e.y - 2 + b, 5, 0, 7); g.arc(e.x + 4, e.y - 2 + b, 5, 0, 7);
      g.moveTo(e.x - 9, e.y + b); g.lineTo(e.x, e.y + 10 + b); g.lineTo(e.x + 9, e.y + b); g.fill();
    } else if(e.t === 'R'){                          // colour shard
      const b = Math.sin(tick/14)*3;
      g.globalAlpha = .25; g.fillStyle = '#fff';
      circ(e.x, e.y + b, 20); g.globalAlpha = 1;
      BANDS.forEach((col, i) => {
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(e.x - 11 + i*3.1, e.y + 12 + b);
        g.lineTo(e.x - 4 + i*1.6, e.y - 13 + b);
        g.lineTo(e.x - 1 + i*1.6, e.y - 13 + b);
        g.lineTo(e.x - 8 + i*3.1, e.y + 12 + b); g.fill();
      });
    } else if(e.t === 'P'){                          // prism horn
      const b = Math.sin(tick/12)*3;
      g.globalAlpha = .3; g.fillStyle = '#dff3ff';
      circ(e.x, e.y + b, 22 + Math.sin(tick/9)*3); g.globalAlpha = 1;
      g.fillStyle = '#dff3ff';
      g.beginPath(); g.moveTo(e.x, e.y - 16 + b); g.lineTo(e.x + 8, e.y + 14 + b);
      g.lineTo(e.x - 8, e.y + 14 + b); g.fill();
      g.fillStyle = '#8fd8ff';
      g.beginPath(); g.moveTo(e.x, e.y - 16 + b); g.lineTo(e.x + 8, e.y + 14 + b);
      g.lineTo(e.x, e.y + 14 + b); g.fill();
    }
  }

  unicorn();
  darkness();

  for(const p of ps){
    g.globalAlpha = Math.min(1, p.l/p.m * 1.6); g.fillStyle = p.c;
    circ(p.x, p.y, p.r);
  }
  g.globalAlpha = 1;
}

function minimap(){
  const s = 10, cols = Math.max(...rooms.map(r => r.mp[0])) + 1;
  const rws = Math.max(...rooms.map(r => r.mp[1])) + 1;
  const x0 = W - 18 - cols*s, y0 = HUD + 12;
  g.fillStyle = '#0e0b1ee6'; g.fillRect(x0 - 6, y0 - 6, cols*s + 12, rws*s + 12);
  g.strokeStyle = '#ffffff33'; g.lineWidth = 1;
  g.strokeRect(x0 - 5.5, y0 - 5.5, cols*s + 11, rws*s + 11);
  rooms.forEach(r => {
    if(!r.seen) return;
    const x = x0 + r.mp[0]*s, y = y0 + r.mp[1]*s;
    g.fillStyle = r === room ? '#fff' : '#6b5aa8';
    g.fillRect(x, y, s - 2, s - 2);
    if(r.ents && r.ents.some(e => e.t === 'R' && e.hp)){
      g.fillStyle = '#ffe14d';
      circ(x + s/2 - 1, y + s/2 - 1, 2);
    }
    if(r.ents && r.ents.some(e => e.t === 'P' && e.hp)){          // where the horn waits
      g.fillStyle = '#dff3ff';
      circ(x + s/2 - 1, y + s/2 - 1, 2.6);
    }
  });
}

function draw(){
  g = gw;
  gw.setTransform(1,0,0,1,0,0);
  gw.fillStyle = '#1a1633'; gw.fillRect(0, 0, W, WH);
  drawWorld();

  g = gm;
  gm.setTransform(1,0,0,1,0,0);
  gm.fillStyle = '#12102a'; gm.fillRect(0, 0, W, H);
  gm.filter = room.drain > .01 ? 'grayscale(' + (room.drain*.6).toFixed(2) + ')' : 'none';
  gm.drawImage(oc, (Math.random() - .5)*shake, HUD + (Math.random() - .5)*shake);
  gm.filter = 'none';
  minimap();

  // ---- HUD ----
  for(let i = 0; i < 3; i++){
    g.fillStyle = i < pl.hp ? '#ff5470' : '#ffffff22';
    const x = 20 + i*26, y = 20;
    g.beginPath(); g.arc(x - 4, y - 3, 5, 0, 7); g.arc(x + 4, y - 3, 5, 0, 7);
    g.moveTo(x - 9, y - 1); g.lineTo(x, y + 9); g.lineTo(x + 9, y - 1); g.fill();
  }
  g.fillStyle = '#ffd84d'; g.font = 'bold 15px system-ui';
  g.fillText('⚑ ' + pl.keys, 106, 27);
  [1, 2, 4].forEach((bit, i) => {                                 // coloured keys in hand
    if(!pl.kk[bit]) return;
    g.fillStyle = MASKC[bit];
    circ(134 + i*10, 34, 3.4);
  });
  g.fillStyle = pl.cd > 0 ? '#ffffff33' : '#5ddb62';              // gallop lamp
  circ(152, 22, 6);
  for(let i = 0; i < PMAX; i++){                                  // prism horn charges
    g.fillStyle = pl.prism && i < pl.pch ? '#dff3ff' : '#ffffff22';
    g.beginPath();
    g.moveTo(170 + i*11, 14); g.lineTo(175 + i*11, 29); g.lineTo(165 + i*11, 29); g.fill();
  }
  if(!pl.prism && pl.prech > 0){                                  // reforming somewhere
    g.fillStyle = '#dff3ff33'; g.fillRect(165, 31, 32, 3);
    g.fillStyle = '#dff3ff'; g.fillRect(165, 31, 32*(1 - pl.prech/PRESP), 3);
  }
  for(let i = 0; i < shardGoal; i++){                                // the colours you carry
    g.fillStyle = i < pl.shards ? BANDS[i] : '#ffffff1a';
    circ(206 + i*15, 21, 5);
  }
  g.fillStyle = '#fff'; g.font = 'bold 17px system-ui'; g.textAlign = 'center';
  g.fillText(room.name, W/2 + 40, 27);
  g.fillStyle = '#fff'; g.font = 'bold 14px system-ui';
  g.fillText(clock(runF), 218 + shardGoal*15, 26);
  if(pl.stolen){                                     // the thief is holding one of your colours
    g.fillStyle = MASKC[pl.stolen]; g.globalAlpha = .5;
    circ(178, 34, 5); g.globalAlpha = 1;
    g.strokeStyle = '#ff5470'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(174, 38); g.lineTo(182, 30); g.stroke();
  }
  g.textAlign = 'right'; g.fillStyle = '#ffffff88'; g.font = '11px system-ui';
  g.fillText(mode === 'story' ? 'shift: gallop · esc: menu' : 'seed ' + seed, W - 16, 27);
  g.textAlign = 'left';

  if(sigNeed){                                                    // sigils, next to the colours
    g.fillStyle = '#ffe14d'; g.font = 'bold 13px system-ui';
    g.fillText('\u2600 ' + sig + '/' + sigNeed, 218 + shardGoal*15 + 52, 26);
  }
  if(tipT > 0 && mode === 'story' && !won){                       // story mode teaches
    tipT--;
    const a = Math.min(1, tipT/60);
    g.globalAlpha = a;
    g.fillStyle = '#0e0b1ecc'; g.fillRect(W/2 - 250, H - 46, 500, 30);
    g.fillStyle = '#ffe14d'; g.font = '14px system-ui'; g.textAlign = 'center';
    g.fillText(room.tip, W/2, H - 26);
    g.textAlign = 'left'; g.globalAlpha = 1;
  }
  if(stick){                                                      // thumbstick
    const sx = stick.x - stick.ox, sy = stick.y - stick.oy, sd = Math.hypot(sx, sy) || 1;
    const kx = stick.ox + sx/sd*Math.min(sd, 34), ky = stick.oy + sy/sd*Math.min(sd, 34) + HUD;
    g.globalAlpha = .25; g.fillStyle = '#fff'; circ(stick.ox, stick.oy + HUD, 40);
    g.globalAlpha = .55; circ(kx, ky, 18); g.globalAlpha = 1;
  }
  if(touched && scene === 'play' && runF < 600){                  // one-time touch hint
    g.globalAlpha = Math.min(1, (600 - runF)/120);
    g.fillStyle = '#ffffff88'; g.font = '12px system-ui'; g.textAlign = 'center';
    g.fillText('left half: walk    right half: aim and throw    second finger: gallop', W/2, H - 10);
    g.textAlign = 'left'; g.globalAlpha = 1;
  }
  if(won){
    g.fillStyle = '#000b'; g.fillRect(0, H/2 - 70, W, 140);
    g.textAlign = 'center'; g.fillStyle = '#ffe14d'; g.font = 'bold 40px system-ui';
    g.fillText('The Sun Door opens!', W/2, H/2);
    g.fillStyle = '#fff'; g.font = '18px system-ui';
    const k = bestKey();
    g.fillText(clock(runF) + '   best ' + clock(best[k] || runF) + '   R: again  esc: menu', W/2, H/2 + 36);
    g.textAlign = 'left';
  }
}
