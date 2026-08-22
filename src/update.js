// ---------- update ----------
function hurt(n){
  if(pl.inv > 0 || pl.dash > 0 || won) return;
  pl.hp -= n; pl.inv = 70; shake = Math.max(shake, 8);
  part(pl.x, pl.y, 16, '#ff5470', 3.4, 30);
  snd(220, .3, 'square', .07, 60);
  if(pl.hp <= 0){ tune([400, 300, 200, 120], 130, 'sawtooth', .07); scene = 'end'; endWin = 0; }
}
function step(){
  tick++;
  if(shake > 0) shake *= .88;
  for(let i = ps.length - 1; i >= 0; i--){
    const p = ps[i];
    p.x += p.vx; p.y += p.vy; p.vx *= .93; p.vy *= .93;
    if(--p.l <= 0) ps.splice(i, 1);
  }
  if(won){ if(++won > 96){ scene = 'end'; endWin = 1; } return; }
  runF++;
  if(charging) charge = Math.min(MAXLEN, charge + 4);
  if(pl.inv > 0) pl.inv--;
  if(pl.cd > 0) pl.cd--;
  if(!pl.prism && pl.prech > 0 && --pl.prech <= 0 && prismEnt){
    prismEnt.hp = 1;                                 // the horn has reformed where it stood
    if(ents.includes(prismEnt)) part(prismEnt.x, prismEnt.y, 40, '#dff3ff', 4, 50);
    tune([523, 784, 1047], 90, 'triangle', .06);
  }

  bows.forEach(b => b.life--);                      // rainbows fade, bridges go with them
  if(bows.some(b => b.life <= 0)){ bows = bows.filter(b => b.life > 0); resolve(); }

  if((keys.shift || keys[' '] || touchDash) && pl.cd <= 0){ pl.dash = DASH; pl.cd = DASH + DCD; snd(300, .12, 'triangle', .04, 620); }
  touchDash = 0;
  if(pl.dash > 0){                                  // gallop: committed, and it breaks things
    pl.dash--;
    const vx = Math.cos(pl.dir), vy = Math.sin(pl.dir);
    const fc = (pl.x + vx*(pl.r + 10))/TS | 0, fr = (pl.y + vy*(pl.r + 10))/TS | 0;
    if(at(fc, fr) === 'X'){
      map[fr][fc] = '.'; shake = 9;
      part(fc*TS + 20, fr*TS + 20, 26, '#8878c8', 4.5, 34, 4);
      snd(120, .25, 'square', .07, 40);
    }
    if(at(fc, fr) === 'q'){ map[fr][fc] = '.'; smash(fc, fr); }
    if(!blocked(pl.x + vx*DSPD, pl.y, pl.r, pl.z)) pl.x += vx*DSPD;
    if(!blocked(pl.x, pl.y + vy*DSPD, pl.r, pl.z)) pl.y += vy*DSPD;
    part(pl.x - vx*14, pl.y - vy*14, 2, 0, 1.6, 18, 2.5);
  } else {
    let vx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    let vy = (keys.s || keys.arrowdown  ? 1 : 0) - (keys.w || keys.arrowup   ? 1 : 0);
    if(stick){                                       // the thumbstick, if a finger is down
      const sx = stick.x - stick.ox, sy = stick.y - stick.oy, sd = Math.hypot(sx, sy);
      if(sd > 9){ vx = sx/sd; vy = sy/sd; }
    }
    if(vx || vy){
      const m = SPD / Math.hypot(vx, vy);
      pl.dir = Math.atan2(vy, vx);
      if(pl.push > 0) pl.push--;
      else if(!vx !== !vy){                          // shove a block, straight on only
        const fc = (pl.x + vx*(pl.r + 12))/TS | 0, fr = (pl.y + vy*(pl.r + 12))/TS | 0;
        const pt = at(fc, fr);
        if(pt === 'O' || pt === '(' || pt === ')'){
          const tc = fc + vx, tr = fr + vy, tt = at(tc, tr);
          const sink = tt === '~' && pt === 'O';       // a mirror is too precious to drown
          if(tt === '.' || sink){
            map[fr][fc] = '.'; pl.push = 16;
            if(sink){                                 // it fills the water for good
              map[tr][tc] = '.';
              part(tc*TS + 20, tr*TS + 20, 26, '#4db6ff', 4, 34);
              snd(160, .3, 'sine', .06, 60);
            } else {
              map[tr][tc] = pt;
              part(tc*TS + 20, tr*TS + 20, 8, pt === 'O' ? '#8878c8' : '#8fd8ff', 2, 20, 3);
              snd(90, .16, 'square', .05, 60);
            }
          }
        }
      }
      if(!blocked(pl.x + vx*m, pl.y, pl.r, pl.z)) pl.x += vx*m;
      if(!blocked(pl.x, pl.y + vy*m, pl.r, pl.z)) pl.y += vy*m;
    }
  }

  let c = pl.x/TS | 0, r = pl.y/TS | 0;
  if(at(c, r) === '~' && bridged.has(c + ',' + r)){
    // A rainbow is light, not stone: it burns where you stand on it, so a
    // crossing is a run rather than a stroll. And the current keeps pulling,
    // so standing still slides you off the edge into the water.
    for(const b of bows) if(b.parts.some(p => p.tiles.includes(c + ',' + r))) b.life -= WEIGHT;
    if(tick % 5 === 0) part(pl.x + (Math.random() - .5)*20, pl.y + 14, 1, 0, 1.2, 20, 2);
    if(room.flow){
      pl.y += room.flow*FLOW;                        // deliberately unchecked: it can sweep you in
      c = pl.x/TS | 0; r = pl.y/TS | 0;
    }
  }
  const t = at(c, r);
  if(t === '^' && !pl.z){ pl.z = 1; part(pl.x, pl.y + 8, 8, '#fff', 1.6, 16, 2); }
  else if(t !== '^' && pl.z){                        // step off the cliff and drop
    pl.z = 0; part(pl.x, pl.y + 6, 12, '#8878c8', 2.4, 20, 2.5);
    snd(200, .12, 'triangle', .04, 90);
  }
  if(t === '~' && !bridged.has(c + ',' + r)){       // the bridge faded underfoot
    part(pl.x, pl.y, 24, '#4db6ff', 4, 30);
    hurt(1); pl.dash = 0; pl.x = pl.spawn[0]; pl.y = pl.spawn[1];
  }
  if(t === 'T' && !won){
    won = 1; tune([784, 988, 1175, 1568], 150, 'triangle', .08);
    const k = bestKey();
    if(!best[k] || runF < best[k]) saveBest(k, runF);
  }

  for(const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const ct = at(c + dc, r + dr);
    if(ct === 'M' || ct === 'N'){
      map[r + dr][c + dc] = ct === 'M' ? 'm' : 'n';
      const x = (c + dc)*TS + 20, y = (r + dr)*TS + 20;
      if(ct === 'M'){ pl.shards++; part(x, y, 34, 0, 4, 44); }
      else { pl.keys++; part(x, y, 26, '#ffd84d', 3.4, 36); }
      shake = 6; tune([523, 784, 1047, 1568], 90, 'triangle', .08);
      break;
    }
  }
  for(const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]){   // a coloured lock beside you
    const lt = at(c + dc, r + dr), bit = LOCK[lt];
    if(bit && pl.kk[bit] > 0){
      pl.kk[bit]--; map[r + dr][c + dc] = '.';
      part((c + dc)*TS + 20, (r + dr)*TS + 20, 26, MASKC[bit], 3.6, 34);
      tune([500, 800, 1100], 70);
      break;
    }
  }
  if(pl.keys > 0) for(const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]])
    if(at(c + dc, r + dr) === 'D'){
      map[r + dr][c + dc] = '.'; pl.keys--;
      part((c + dc)*TS + 20, (r + dr)*TS + 20, 22, '#ffd84d', 3.5, 32);
      tune([500, 700], 80); break;
    }

  // colour returns once the room's crystals and torches burn and the storm is gone
  if(room.drain > 0 && gateOpen() && !ents.some(e => e.t === 'B' && e.hp)){
    room.drain = Math.max(0, room.drain - .012);
    if(!room.burst){
      room.burst = 1;
      for(let i = 0; i < 70; i++) part(Math.random()*W, Math.random()*WH, 1, 0, 2.5, 70, 3.5);
      tune([523, 659, 784, 1047, 1319], 90, 'triangle', .07);
    }
  }
  if(tick % 3 === 0) for(let r2 = 0; r2 < ROWS; r2++) for(let c2 = 0; c2 < COLS; c2++)
    if(map[r2][c2] === 'F' && Math.random() < .35)
      ps.push({x:c2*TS + 20 + (Math.random()-.5)*10, y:r2*TS + 18, vx:0, vy:-.7 - Math.random(),
               l:18, m:18, c:Math.random() < .5 ? '#ff9c3d' : '#ffe14d', r:2.5});

  const L = room.links;                             // room exits sit in the border ring
  if(c === COLS-1 && L.e != null) enter(L.e, TS*1.5, pl.y);
  else if(c === 0 && L.w != null) enter(L.w, W - TS*1.5, pl.y);
  else if(r === 0 && L.n != null) enter(L.n, pl.x, WH - TS*1.5);
  else if(r === ROWS-1 && L.s != null) enter(L.s, pl.x, TS*1.5);

  for(const e of ents){
    if(e.pop) e.pop--;
    if(e.iv) e.iv--;
    if(e.flash) e.flash--;
    if(!e.hp) continue;
    const d = Math.hypot(pl.x - e.x, pl.y - e.y) || 1;
    const hid = inDark(e);                          // only your light makes them real
    const spd = room.drain > .02 ? (hid ? 1.3 : .55) : 1;
    if(e.t === 'E'){                                // slime
      const dx = pl.x - e.x, dy = pl.y - e.y;
      const sp = (1.15 + Math.sin(tick/20 + e.w)*.35) * spd;
      if(!blocked(e.x + dx/d*sp, e.y, 11, 0)) e.x += dx/d*sp;
      if(!blocked(e.x, e.y + dy/d*sp, 11, 0)) e.y += dy/d*sp;
      if(d < 26) bump(e, d, !hid);                  // you cannot ram what you cannot see
    } else if(e.t === 'C'){                         // rain cloud: it eats rainbows
      let tx = e.hx, ty = e.hy;
      const b = bows[0];
      if(b){ const s = b.parts[0].segs[0]; tx = s.x + s.dx*s.len*.5; ty = s.y + s.dy*s.len*.5; }
      else { tx = e.hx + Math.sin(tick/60 + e.w)*70; ty = e.hy + Math.cos(tick/70 + e.w)*50; }
      e.x += (tx - e.x)*.012; e.y += (ty - e.y)*.012;
      for(const bw of bows){
        let on = 0;
        for(const p of bw.parts) for(const s of p.segs) for(let f = 0; f <= 1; f += .25)
          if(Math.hypot(s.x + s.dx*s.len*f - e.x, s.y + s.dy*s.len*f - e.y) < 34) on = 1;
        if(on){                                      // ~2s of bridge with two clouds on it
          bw.life -= 1.5;
          if(tick % 4 === 0) part(e.x, e.y + 10, 1, 0, 1.4, 22, 2.5);
        }
      }
      if(d < 30 && pl.dash > 0){ e.hp = 0; e.pop = 12; part(e.x, e.y, 22, '#c9d4e8', 3.4, 30); snd(260, .2, 'sawtooth', .05, 80); }
    } else if(e.t === 'B'){                          // the storm
      if(!e.tx || tick % 130 === 0){ e.tx = 300 + Math.random()*(W - 600); e.ty = 130 + Math.random()*(WH - 260); }
      const sp = e.hp <= 1 ? 1.9 : e.hp <= 3 ? 1.4 : 1;
      const bx = e.tx - e.x, by = e.ty - e.y, bd = Math.hypot(bx, by) || 1;
      e.x += bx/bd*sp; e.y += by/bd*sp;
      if(tick % (e.hp <= 3 ? 78 : 108) === 0)
        ents.push({t:'L', x:pl.x, y:pl.y, hp:1, tmr:52, w:0});
      if(d < 44) hurt(1);
    } else if(e.t === 'L'){                          // lightning: telegraph, then strike
      if(--e.tmr <= 0){
        e.hp = 0; shake = Math.max(shake, 12);
        part(e.x, e.y, 30, '#ffe14d', 5.5, 30);
        snd(70, .45, 'sawtooth', .09, 30);
        if(Math.hypot(pl.x - e.x, pl.y - e.y) < 40) hurt(1);
      }
    } else if(e.t === 'A'){                          // charger: winds up, then bolts
      if(e.stun > 0){ e.stun--; }
      else if(e.ch){
        if(!blocked(e.x + e.vx, e.y + e.vy, 12, 0)){ e.x += e.vx; e.y += e.vy; }
        else {
          e.ch = 0; e.stun = 70; shake = Math.max(shake, 7);
          part(e.x, e.y, 16, '#ffb84d', 3.4, 26); snd(130, .2, 'square', .06, 50);
        }
        if(--e.t2 <= 0) e.ch = 0;
        part(e.x - e.vx*3, e.y - e.vy*3, 1, '#ffb84d', 1, 14, 2);
      } else if(d < 280 && (e.tel = (e.tel || 0) + 1) > 42){
        const a = Math.atan2(pl.y - e.y, pl.x - e.x);
        e.vx = Math.cos(a)*5.4; e.vy = Math.sin(a)*5.4; e.ch = 1; e.t2 = 80; e.tel = 0;
        snd(520, .16, 'sawtooth', .05, 210);
      }
      if(d < 27) bump(e, d, !e.ch);
    } else if(e.t === 'U'){                          // turret: lobs bubbles at you
      if(tick % 100 === 0 && d < 420){
        const a = Math.atan2(pl.y - e.y, pl.x - e.x);
        ents.push({t:'o', x:e.x + Math.cos(a)*16, y:e.y + Math.sin(a)*16,
                   vx:Math.cos(a)*2.7, vy:Math.sin(a)*2.7, hp:1, tmr:160, w:0});
        snd(320, .12, 'sine', .04, 150);
      }
      if(d < 26) bump(e, d, 1);
    } else if(e.t === 'o'){                          // bubble
      e.x += e.vx; e.y += e.vy;
      if(--e.tmr <= 0 || blocked(e.x, e.y, 6, 0)){ e.hp = 0; part(e.x, e.y, 8, '#8fd8ff', 2, 18, 2); }
      else if(d < 20){ e.hp = 0; part(e.x, e.y, 10, '#8fd8ff', 2.4, 20, 2); bump(e, d, 0); }
    } else if(e.t === 'W'){                          // bridge weevil: chases you onto a rainbow
      const id = (e.x/TS | 0) + ',' + (e.y/TS | 0), on = bridged.has(id);
      const dx = pl.x - e.x, dy = pl.y - e.y, sp = (on ? 2.3 : 1.1) * spd;
      if(!blocked(e.x + dx/d*sp, e.y, 10, 0)) e.x += dx/d*sp;
      if(!blocked(e.x, e.y + dy/d*sp, 10, 0)) e.y += dy/d*sp;
      if(on){                                        // and gnaws the bridge under itself
        for(const bw of bows) if(bw.parts.some(q => q.tiles.includes(id))) bw.life -= 1.3;
        if(tick % 6 === 0) part(e.x, e.y, 1, 0, 1.2, 20, 2);
      }
      if(d < 24) bump(e, d, !hid);
    } else if(e.t === 'V'){                          // colour thief
      const away = e.holds ? -1 : 1;
      const sp = e.holds ? 2.1 : 1.35;
      if(!blocked(e.x + (pl.x - e.x)/d*sp*away, e.y, 10, 0)) e.x += (pl.x - e.x)/d*sp*away;
      if(!blocked(e.x, e.y + (pl.y - e.y)/d*sp*away, 10, 0)) e.y += (pl.y - e.y)/d*sp*away;
      if(e.x < 30 || e.x > W - 30 || e.y < 30 || e.y > WH - 30) e.holds && (e.hx = 0);
      if(d < 28 && !e.holds && !pl.stolen){
        const av = [1, 2, 4].filter(b => !(pl.stolen & b));
        const b = av[Math.random()*av.length | 0];
        pl.stolen |= b; e.holds = b; shake = 9;
        part(pl.x, pl.y, 24, MASKC[b], 3.8, 34);
        snd(520, .32, 'sawtooth', .07, 110);
      }
    } else if(d < 24){                               // pickups
      e.hp = 0;
      if(e.t === 'K'){ pl.keys++; part(e.x, e.y, 18, '#ffd84d', 3, 30); tune([700, 1000], 70); }
      else if(KEY[e.t]){
        const bit = KEY[e.t];
        pl.kk[bit] = (pl.kk[bit] || 0) + 1;
        part(e.x, e.y, 22, MASKC[bit], 3.2, 34); tune([700, 1000, 1300], 60);
      }
      else if(e.t === 'H'){ if(pl.hp < 3){ pl.hp++; part(e.x, e.y, 18, '#ff5470', 3, 30); tune([600, 900], 70); } else e.hp = 1; }
      else if(e.t === 'R'){ part(e.x, e.y, 30, BANDS[pl.shards % 7], 4, 44); pl.shards++; tune([600, 800, 1000, 1300], 60); }
      else if(e.t === 'P'){ pl.prism = 1; pl.pch = PMAX; pl.prech = 0; prismEnt = e; part(e.x, e.y, 50, 0, 4.5, 60, 4); shake = 8; tune([523, 784, 1047, 1568], 90, 'triangle', .08); }
    }
  }
  if(tick % 180 === 0) ents = room.ents = ents.filter(e => e.hp || e.t !== 'L');
}
