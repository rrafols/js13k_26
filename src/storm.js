// ---------- storm ----------
function bossHit(e){
  e.hp--; e.iv = 45; e.flash = 16; shake = 13;
  part(e.x, e.y, 30, '#fff', 5, 34, 4);
  snd(110, .35, 'sawtooth', .09, 40);
  if(e.hp === 3){                                   // phase 2: it drinks the colour,
    room.drain = 1; room.burst = 0; shake = 20;     // paint and all -- repaint it while you fight
    room.paint.clear();
    for(let i = 0; i < 2; i++) ents.push({t:'C', x:120 + i*600, y:120, hx:0, hy:0, hp:1, w:i*3});
    tune([300, 240, 180], 110, 'sawtooth', .07);
  }
  if(e.hp === 1){                                   // phase 3: it floods the arena
    shake = 24; tune([200, 160, 120], 110, 'sawtooth', .07);
    for(let c = 3; c <= 20; c++){ flood(c, 2); flood(c, 10); }
    for(let r = 3; r <= 9; r++){ flood(3, r); flood(20, r); }
  }
  if(e.hp <= 0){                                    // and the sun comes back
    e.pop = 30; shake = 26;
    part(e.x, e.y, 90, 0, 6, 70, 5);
    map[6][12] = 'T';
    tune([523, 659, 784, 1047, 1319, 1568], 110, 'triangle', .08);
  }
}
function flood(c, r){
  if(map[r][c] !== '.' || (pl.x/TS | 0) === c && (pl.y/TS | 0) === r) return;
  map[r][c] = '~';
  part(c*TS + 20, r*TS + 20, 5, '#4db6ff', 2.5, 26);
}
