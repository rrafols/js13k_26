// ---------- rainbow ----------
// March from the unicorn: bridge water, light crystals and torches, blast
// slimes, bounce off mirrors. A beam only harms the storm after a bounce.
function cast(x0, y0, dir, len, real, col, depth, out, bnc, skip){
  out = out || [];
  let dx = Math.cos(dir), dy = Math.sin(dir);
  let x = x0, y = y0, sx = x, sy = y, rem = len, bounces = bnc || 0, lastM = '', lastT = '', pc = -1, pr = -1;
  const segs = [], tiles = [], lit = [], ramps = [];
  out.push({segs, tiles, lit, ramps, col});
  const end = () => { segs.push({x:sx, y:sy, dx, dy, len:Math.hypot(x - sx, y - sy)}); return out; };
  while(rem > 0){
    const s = Math.min(4, rem);
    x += dx*s; y += dy*s; rem -= s;
    const c = x/TS | 0, r = y/TS | 0, t = at(c, r), id = c + ',' + r;
    if('#XDO'.includes(t) || (t === 'G' && !gateOpen()) || (t === 'Y' && pl.shards < shardGoal)
       || (DOOR[t] && !room.lit.has(id))
       || (t === '|' && sig < sigNeed)){             // a shut door stops light too
      if(DOOR[t] && id !== lastT) lit.push(id);       // but the light lands on its face
      x -= dx*s; y -= dy*s; return end();
    }
    if('/\\()'.includes(t) && bounces < 6 && id !== lastM){
      bounces++; lastM = id;
      const up = t === '/' || t === '(';               // ( and ) ride on sledges
      const mx = c*TS + 20, my = r*TS + 20;
      segs.push({x:sx, y:sy, dx, dy, len:Math.hypot(mx - sx, my - sy)});
      const ndx = up ? -dy : dy, ndy = up ? -dx : dx;
      dx = ndx; dy = ndy; x = sx = mx; y = sy = my;
      if(real) part(mx, my, 8, '#fff', 2.6, 20, 2);
      continue;
    }
    if(t === '>' && id !== skip){                    // prism: fan the channels apart
      const mx = c*TS + 20, my = r*TS + 20;
      x = mx; y = my; end();
      if(depth < 2){
        const a = Math.atan2(dy, dx);
        [[1, -.17], [2, 0], [4, .17]].forEach(([bit, off]) => {
          if(col & bit) cast(mx, my, a + off, rem, real, bit, depth + 1, out, bounces, id);
        });
      }
      if(real){ part(mx, my, 16, 0, 3, 26); snd(900, .2, 'triangle', .045, 1900); }
      return out;
    }
    if(t === '+'){                                   // lens: the beam leaves it longer
      const seen = out.lens || (out.lens = new Set());
      if(!seen.has(id)){
        seen.add(id); rem += LENS;
        if(real){ part(c*TS + 20, r*TS + 20, 14, '#dff3ff', 2.6, 26, 2); snd(1500, .18, 'triangle', .05, 2400); }
      }
    }
    if('rgb'.includes(t) && id !== skip){            // filter: one channel survives
      const bit = t === 'r' ? 1 : t === 'g' ? 2 : 4;
      const mx = c*TS + 20, my = r*TS + 20;
      x = mx; y = my; end();
      if(col & bit) cast(mx, my, Math.atan2(dy, dx), rem, real, bit, depth + 1, out, bounces, id);
      else if(real) part(mx, my, 8, '#3a3260', 1.6, 18, 2);
      return out;
    }
    if(id !== lastT){                                // one entry per tile entered
      lastT = id; lit.push(id);
      if(t === '~') tiles.push(id);
      if(t === '^') ramps.push(id);                  // a rainbow laid up a cliff is a ramp
      // A diagonal step leaves a staircase of tiles that only touch at their
      // corners. The drawn band is wider than a tile and covers the two elbows,
      // so bridge them as well -- otherwise the walkable path is diagonal only
      // and the unicorn wedges between two tiles it cannot enter.
      if(pc >= 0 && pc !== c && pr !== r) for(const [ec, er] of [[pc, r], [c, pr]]){
        const et = at(ec, er), eid = ec + ',' + er;
        if(et === '~') tiles.push(eid);
        if(et === '^') ramps.push(eid);
      }
      pc = c; pr = r;
    }
    if(real){
      if(t === 'q'){                                 // pot
        map[r][c] = '.'; smash(c, r);
      }
      if(t === 'f'){
        map[r][c] = 'F'; room.go = null;
        part(c*TS + 20, r*TS + 20, 20, '#ff9c3d', 3.4, 34); snd(170, .3, 'sawtooth', .05, 90);
      }
      for(const e of ents){
        if(!e.hp) continue;
        const ed = Math.hypot(e.x - x, e.y - y);
        if('EW'.includes(e.t) && ed < 20) kill(e);
        if(e.t === 'U' && ed < 22) kill(e);
        if(e.t === 'o' && ed < 16){ e.hp = 0; part(e.x, e.y, 8, '#8fd8ff', 2, 18, 2); }
        if(e.t === 'A' && ed < 22 && !e.ch) kill(e);  // a charger is only open when it is not charging
        if(e.t === 'V' && ed < 24 && !e.iv) thiefHit(e);
        if(e.t === 'B' && bounces > 0 && !e.iv && ed < 36) bossHit(e);
      }
    }
  }
  return end();
}
function bump(e, d, dashKills){                      // enemy touches you
  const dx = pl.x - e.x, dy = pl.y - e.y;
  if(dashKills && pl.dash > 0){ kill(e); return; }
  if(pl.inv > 0 || pl.dash > 0) return;
  hurt(1);
  pl.x -= dx/d*22; pl.y -= dy/d*22;
  if(blocked(pl.x, pl.y, pl.r, pl.z)){ pl.x += dx/d*22; pl.y += dy/d*22; }
}
function kill(e){ e.hp = 0; e.pop = 12; part(e.x, e.y, 16, '#b04dff', 3.2, 28); snd(400, .12, 'square', .04, 110); }
function smash(c, r){                                // a pot, and what was hiding in it
  part(c*TS + 20, r*TS + 20, 20, '#c98b3f', 3.6, 28, 3);
  snd(220, .16, 'square', .05, 70);
  if(Math.random() < .35) ents.push({t:'H', x:c*TS + 20, y:r*TS + 20, hp:1, w:0});
}
function thiefHit(e){                                // the colour thief
  e.hp--; e.iv = 34; e.flash = 14; shake = 7;
  part(e.x, e.y, 20, MASKC[e.holds || 7], 3.6, 30);
  snd(300, .2, 'sawtooth', .06, 120);
  if(e.hp <= 0){
    e.pop = 16;
    if(e.holds){                                     // it gives the colour back
      pl.stolen &= ~e.holds;
      part(pl.x, pl.y, 34, MASKC[e.holds], 4, 44);
      tune([600, 900, 1200], 80);
      e.holds = 0;
    }
  }
}
function fire(){
  // A full charge through the horn splits white into its three channels, one
  // charge at a time. Anything less is an ordinary white beam, so the choice is
  // reach and colour against a horn that has to refill.
  const fan = pl.prism && pl.pch > 0 && charge > MAXLEN - 25;
  const a0 = Math.atan2(aim.y - pl.y, aim.x - pl.x);
  const parts = [];
  const col = (7 & ~pl.stolen) || 7;                 // the thief takes a channel with it
  if(fan){
    pl.pch--; pl.prech = PRECH;
    [[1, -.16], [2, 0], [4, .16]].forEach(([bit, a]) => {
      if(col & bit) cast(pl.x, pl.y, a0 + a, charge, 1, bit, 0, parts, 0);
    });
  } else cast(pl.x, pl.y, a0, charge, 1, col, 0, parts, 0);
  bows.push({parts, life:BOWLIFE});
  if(bows.length > MAXBOWS) bows.shift();
  resolve();
  part(pl.x + Math.cos(pl.dir)*16, pl.y + Math.sin(pl.dir)*16, 12, 0, 3, 24);
  if(fan) tune([700, 950, 1250], 45, 'sawtooth', .05); else snd(680, .18, 'sawtooth', .045, 190);
}
// Gather every live beam: bridges, the colour standing on each tile, the paint
// the room keeps, and any crystal whose exact colour is now shining on it.
function resolve(){
  bridged = new Set();
  const light = new Map();
  ramped = new Set();
  for(const b of bows) for(const p of b.parts){
    for(const id of p.tiles) bridged.add(id);
    for(const id of p.ramps) ramped.add(id);
    for(const id of p.lit) light.set(id, (light.get(id) || 0) | p.col);
  }
  light.forEach((m, id) => {
    room.paint.set(id, (room.paint.get(id) || 0) | m);
    const [c, r] = id.split(',');
    const t = map[r][c];
    if(t >= '1' && t <= '7' && +t === m && !room.lit.has(id)){
      room.lit.add(id); room.go = null;
      part(c*TS + 20, r*TS + 20, 26, MASKC[m], 3.6, 36);
      snd(620 + m*120, .28, 'triangle', .06, 1700);
    }
    if(t === 'S' && !room.lit.has(id)){              // sigil: any colour will do
      room.lit.add(id); sig++;
      part(c*TS + 20, r*TS + 20, 40, 0, 4.4, 46);
      tune([700, 900, 1100, 1400], 70, 'triangle', .07);
    }
    if(DOOR[t] === m && !room.lit.has(id)){          // a door that wanted this colour
      room.lit.add(id);
      part(c*TS + 20, r*TS + 20, 34, MASKC[m], 4, 40);
      tune([500, 700, 900], 70, 'triangle', .06);
    }
  });
  if(room.drain > 0){                                // light you route repaints the room,
    let lift = Math.max(0, 1 - room.paint.size/60);  // but the storm keeps drinking it
    if(ents.some(e => e.t === 'B' && e.hp)) lift = Math.max(lift, .5);
    room.drain = Math.min(room.drain, lift);
  }
}
