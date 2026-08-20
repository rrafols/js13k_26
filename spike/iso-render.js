/**
 * Isometric renderer for the real game.
 *
 * Loaded after the game's own sources, it reassigns two of its functions and
 * nothing else: drawWorld (how a room is painted) and toWorld (where the mouse
 * points). Every rule -- collision, light, the grid -- is untouched, because
 * this is a projection, not a different game.
 *
 *   world (px)          screen
 *   sx = (wx - wy)*A + ox
 *   sy = (wx + wy)*B + oy      A = HW/TS, B = HH/TS
 */
const HW = 44, HH = 22, WALLH = 34;                 // half tile width/height, wall rise
const A = HW/TS, B = HH/TS;
const SUN = [0.75, 0.55];        // longer, so the shadows read                           // where shadows fall, in world units
let ox = 0, oy = 0;

const px = (wx, wy) => [(wx - wy)*A + ox, (wx + wy)*B + oy];

function camera(){                                  // keep the unicorn centred
  ox = W/2 - (pl.x - pl.y)*A;
  oy = WH/2 - (pl.x + pl.y)*B;
}

toWorld = e => {                                    // screen -> world, inverted
  const b = cv.getBoundingClientRect(), t = e.touches ? e.touches[0] : e;
  const sx = (t.clientX - b.left)/b.width * W, sy = (t.clientY - b.top)/b.height * H - HUD;
  const u = (sx - ox)/A, v = (sy - oy)/B;
  aim.x = (u + v)/2; aim.y = (v - u)/2;
};

const diamond = (x, y, w, h) => {
  g.beginPath();
  g.moveTo(x, y - h); g.lineTo(x + w, y); g.lineTo(x, y + h); g.lineTo(x - w, y);
  g.closePath(); g.fill();
};
const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const cl = v => Math.max(0, Math.min(255, v*f | 0));
  return `rgb(${cl(n >> 16)},${cl((n >> 8) & 255)},${cl(n & 255)})`;
};

/** A tile-high box: two side faces, then the lit top. */
function cube(x, y, h, top, side){
  g.fillStyle = shade(side, .62);
  g.beginPath();
  g.moveTo(x - HW, y - h); g.lineTo(x, y - h + HH); g.lineTo(x, y + HH); g.lineTo(x - HW, y);
  g.closePath(); g.fill();
  g.fillStyle = shade(side, .42);
  g.beginPath();
  g.moveTo(x + HW, y - h); g.lineTo(x, y - h + HH); g.lineTo(x, y + HH); g.lineTo(x + HW, y);
  g.closePath(); g.fill();
  g.fillStyle = top;
  diamond(x, y - h, HW, HH);
}

/** The shadow a box of height h throws along the sun direction. */
function castShadow(wx, wy, h){
  const len = 1.35*h/WALLH;                              // one tile of shadow per tile of height
  const a = px(wx - TS/2, wy - TS/2), b = px(wx + TS/2, wy - TS/2);
  const c = px(wx + TS/2 + SUN[0]*TS*len, wy + TS/2 + SUN[1]*TS*len);
  const d = px(wx - TS/2 + SUN[0]*TS*len, wy + TS/2 + SUN[1]*TS*len);
  g.beginPath();
  g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]);
  g.closePath(); g.fill();
}

const TALL = { '#':WALLH, 'X':WALLH, 'O':WALLH*.8, '^':WALLH*.5,
               'M':WALLH*.5, 'N':WALLH*.5, 'm':WALLH*.4, 'n':WALLH*.4,
               'D':WALLH, 'G':WALLH*.8, 'Y':WALLH*.8, '|':WALLH*.8, 'q':WALLH*.4 };

drawWorld = function (){
  camera();
  const lightUp = room.drain > .02;

  // 1. ground, back to front. Row major works: both neighbours that can cover
  //    a tile are drawn after it.
  for(let r = 0; r < ROWS; r++) for(let c = 0; c < COLS; c++){
    const t = map[r][c], [x, y] = px(c*TS + TS/2, r*TS + TS/2);
    if(x < -HW*2 || x > W + HW*2 || y < -80 || y > WH + 80) continue;
    let base = (c + r) % 2 ? '#37305c' : '#3b3462';
    if(t === '~') base = '#1e4f96';
    else if(t === '^') base = '#7d6cc0';
    const m = room.paint.get(c + ',' + r);
    g.fillStyle = m ? shade(MASKC[m], .5) : base;
    if(!TALL[t] || t === '^') diamond(x, y, HW, HH);
    if(t === '~'){                                  // moving water
      g.fillStyle = '#3a78c8';
      const w = Math.sin((c + r)*.9 + tick/28)*8;
      g.fillRect(x - 14 + w, y - 2, 16, 3);
      g.fillRect(x - 4 - w, y + 6, 10, 3);
    }
  }

  // 2. the shadows everything standing throws, on the ground, before the walls
  g.fillStyle = 'rgba(6,4,16,.55)';
  for(let r = 0; r < ROWS; r++) for(let c = 0; c < COLS; c++){
    const h = TALL[map[r][c]];
    if(h) castShadow(c*TS + TS/2, r*TS + TS/2, h);
  }
  for(const e of ents) if(e.hp && 'EAUWVBC'.includes(e.t)) castShadow(e.x, e.y, WALLH*.5);
  castShadow(pl.x, pl.y, WALLH*.55);

  // 3. rainbows lie on the ground, so they go under the walls
  for(const b of bows){
    const al = Math.min(1, b.life/70)*(b.life < 110 && b.life % 12 < 5 ? .55 : 1);
    g.globalAlpha = al;
    for(const p of b.parts) for(const s of p.segs){
      const white = p.col === 7, slim = p.thin || !white;
      const a0 = px(s.x, s.y), a1 = px(s.x + s.dx*s.len, s.y + s.dy*s.len);
      const dx = a1[0] - a0[0], dy = a1[1] - a0[1], d = Math.hypot(dx, dy) || 1;
      const nx = -dy/d, ny = dx/d;
      BANDS.forEach((col, i) => {
        const o = (i - 3)*(slim ? 2.2 : 4.4);
        g.strokeStyle = white ? col : MASKC[p.col];
        g.lineWidth = slim ? 3 : 5;
        g.globalAlpha = al*(white ? 1 : .5 + Math.abs(3 - i)/6);
        g.beginPath();
        g.moveTo(a0[0] + nx*o, a0[1] + ny*o - 6);
        g.lineTo(a1[0] + nx*o, a1[1] + ny*o - 6);
        g.stroke();
      });
    }
  }
  g.globalAlpha = 1;

  // 4. everything with height, interleaved with the actors by depth
  const queue = [];
  for(let r = 0; r < ROWS; r++) for(let c = 0; c < COLS; c++){
    const t = map[r][c];
    if(t !== '.' ) queue.push({d:c + r, c, r, t});
  }
  for(const e of ents) if(e.hp || e.pop) queue.push({d:(e.x/TS | 0) + (e.y/TS | 0) + .5, e});
  queue.push({d:(pl.x/TS | 0) + (pl.y/TS | 0) + .5, hero:1});
  queue.sort((p, q) => p.d - q.d);

  for(const it of queue){
    if(it.hero){ isoHero(); continue; }
    if(it.e){ isoEnt(it.e); continue; }
    const {c, r, t} = it, [x, y] = px(c*TS + TS/2, r*TS + TS/2);
    if(x < -HW*2 || x > W + HW*2 || y < -90 || y > WH + 90) continue;
    if(t === '#') cube(x, y, WALLH, '#6b5aa8', '#4a3d78');
    else if(t === 'X') cube(x, y, WALLH, '#b0724a', '#7d4f33');
    else if(t === 'O') cube(x, y, WALLH*.8, '#8878c8', '#5b4d94');
    else if(t === '^'){ cube(x, y, WALLH*.5, ramped.has(c + ',' + r) ? '#9c86e8' : '#7d6cc0', '#3a3160'); }
    else if(t === 'D') cube(x, y, WALLH, '#c98b3f', '#8a5a2a');
    else if(t === 'q'){ g.fillStyle = '#c98b3f'; g.beginPath(); g.ellipse(x, y - 12, 12, 15, 0, 0, 7); g.fill(); }
    else if('MNmn'.includes(t)) cube(x, y, WALLH*.5, 'MN'.includes(t) ? '#ffd84d' : '#c98b3f', '#8a5a2a');
    else if(t === 'G' || t === 'Y' || t === '|'){
      const open = t === 'G' ? gateOpen() : t === 'Y' ? pl.shards >= shardGoal : sig >= sigNeed;
      if(!open) cube(x, y, WALLH*.8, '#8c8ca8', '#5c5c78');
      else { g.fillStyle = '#2c2650'; diamond(x, y, HW, HH); }
    }
    else if(LOCK[t]) cube(x, y, WALLH*.9, MASKC[LOCK[t]], shade(MASKC[LOCK[t]], .6));
    else if(DOOR[t]){
      if(room.lit.has(c + ',' + r)){ g.fillStyle = shade(MASKC[DOOR[t]], .4); diamond(x, y, HW, HH); }
      else cube(x, y, WALLH*.9, MASKC[DOOR[t]], shade(MASKC[DOOR[t]], .6));
    }
    else if(t === '/' || t === '\\' || t === '(' || t === ')'){
      const up = t === '/' || t === '(';
      if(t === '(' || t === ')') cube(x, y, 10, '#5b4d94', '#3a3160');
      g.strokeStyle = '#dff3ff'; g.lineWidth = 8; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x - HW*.5, y - 16 + (up ? 9 : -9));
      g.lineTo(x + HW*.5, y - 16 - (up ? 9 : -9));
      g.stroke();
    }
    else if(t === 'f' || t === 'F'){
      cube(x, y, 16, '#3a3260', '#2a2350');
      g.fillStyle = t === 'F' ? '#ffe14d' : '#5c5580';
      const s2 = t === 'F' ? 3 + Math.sin(tick/5)*1.6 : 0;
      g.beginPath(); g.arc(x, y - 26, 7 + s2, 0, 7); g.fill();
      if(t === 'F'){ g.globalAlpha = .3; g.beginPath(); g.arc(x, y - 26, 22 + s2, 0, 7); g.fill(); g.globalAlpha = 1; }
    }
    else if(t === '>' ){
      g.fillStyle = '#dff3ff';
      g.beginPath(); g.moveTo(x, y - 40); g.lineTo(x + 14, y + 4); g.lineTo(x - 14, y + 4); g.fill();
    }
    else if('rgb'.includes(t)){
      const col = MASKC[t === 'r' ? 1 : t === 'g' ? 2 : 4];
      g.globalAlpha = .8; cube(x, y, WALLH*.85, col, shade(col, .6)); g.globalAlpha = 1;
    }
    else if(t === '+'){
      g.strokeStyle = '#8fd8ff'; g.lineWidth = 3;
      g.beginPath();
      for(let i = 0; i < 6; i++){
        const an = i*1.047 + tick/300;
        g.lineTo(x + Math.cos(an)*13, y - 12 + Math.sin(an)*7);
      }
      g.closePath(); g.stroke();
      g.fillStyle = '#eaf7ff'; g.beginPath(); g.arc(x, y - 12, 5, 0, 7); g.fill();
    }
    else if(t >= '1' && t <= '7'){
      const on = room.lit.has(c + ',' + r), col = MASKC[+t];
      g.fillStyle = on ? col : '#6d6d92';
      g.beginPath(); g.moveTo(x, y - 40); g.lineTo(x + 10, y - 14); g.lineTo(x, y + 2); g.lineTo(x - 10, y - 14); g.fill();
      if(on){ g.globalAlpha = .25; g.beginPath(); g.arc(x, y - 18, 26, 0, 7); g.fill(); g.globalAlpha = 1; }
    }
    else if(t === 'S'){
      const on = room.lit.has(c + ',' + r);
      g.fillStyle = on ? '#ffe14d' : '#5c5580';
      g.beginPath();
      for(let i = 0; i < 16; i++){
        const an = i*Math.PI/8 + tick/70, rr = i % 2 ? 6 : on ? 18 : 13;
        g.lineTo(x + Math.cos(an)*rr, y - 16 + Math.sin(an)*rr*.6);
      }
      g.fill();
    }
    else if(t === 'T'){
      g.fillStyle = '#ffe14d'; g.globalAlpha = .3;
      g.beginPath(); g.arc(x, y - 20, 30 + Math.sin(tick/15)*3, 0, 7); g.fill();
      g.globalAlpha = 1;
      g.beginPath();
      for(let i = 0; i < 16; i++){
        const an = i*Math.PI/8 + tick/60, rr = i % 2 ? 8 : 22;
        g.lineTo(x + Math.cos(an)*rr, y - 20 + Math.sin(an)*rr*.6);
      }
      g.fill();
    }
  }

  // 5. darkness, as diamonds so it lines up with the ground
  if(lightUp){
    darkness();                                     // fills LMAP with line-of-sight light
    for(let r = 0; r < ROWS; r++) for(let c = 0; c < COLS; c++){
      const al = (1 - Math.min(1, .22 + LMAP[r*COLS + c]))*room.drain;
      if(al > .02){
        const [x, y] = px(c*TS + TS/2, r*TS + TS/2);
        g.fillStyle = 'rgba(6,4,18,' + al.toFixed(2) + ')';
        diamond(x, y, HW, HH);                      // exact tiling, no scale pattern
        const h = TALL[map[r][c]];
        if(h){                                      // and again over the top face
          diamond(x, y - h, HW, HH);
          g.fillRect(x - HW, y - h, HW*2, h);
        }
      }
    }
  }

  for(const p of ps){                               // particles, projected
    const [x, y] = px(p.x, p.y);
    g.globalAlpha = Math.min(1, p.l/p.m*1.6);
    g.fillStyle = p.c;
    g.beginPath(); g.arc(x, y - 8, p.r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
};

function isoEnt(e){
  const [x, y] = px(e.x, e.y);
  if(e.pop){
    g.globalAlpha = e.pop/(e.t === 'B' ? 30 : 12); g.fillStyle = '#ffe14d';
    g.beginPath(); g.arc(x, y - 10, (e.t === 'B' ? 60 : 26) - e.pop, 0, 7); g.fill();
    g.globalAlpha = 1;
  }
  if(!e.hp) return;
  const lift = 12;
  if(e.t === 'E'){
    const dk = room.drain > .02 && litAt(e.x, e.y) < .45;
    g.fillStyle = dk ? '#2b2448' : '#b04dff';
    g.beginPath(); g.ellipse(x, y - lift, 13, 13, 0, 0, 7); g.fill();
    g.fillStyle = dk ? '#ffe14d' : '#fff';
    g.beginPath(); g.arc(x - 4, y - lift - 2, 3, 0, 7); g.arc(x + 4, y - lift - 2, 3, 0, 7); g.fill();
  } else if(e.t === 'A'){
    g.fillStyle = e.stun > 0 ? '#8a8ab0' : '#ff8a3d';
    g.beginPath();
    for(let i = 0; i < 12; i++){
      const an = i*Math.PI/6, rr = i % 2 ? 9 : 16;
      g.lineTo(x + Math.cos(an)*rr, y - lift + Math.sin(an)*rr);
    }
    g.fill();
  } else if(e.t === 'U'){
    g.fillStyle = '#3f7a8c'; g.beginPath(); g.arc(x, y - lift, 15, 0, 7); g.fill();
    g.fillStyle = '#8fd8ff'; g.beginPath(); g.arc(x, y - lift - 4, 7, 0, 7); g.fill();
  } else if(e.t === 'W'){
    g.fillStyle = '#4b3a6e'; g.beginPath(); g.ellipse(x, y - lift, 12, 8, 0, 0, 7); g.fill();
    g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(x + 6, y - lift, 2, 0, 7); g.fill();
  } else if(e.t === 'V'){
    g.fillStyle = e.flash > 0 && e.flash % 6 < 3 ? '#fff' : '#5b4f8e';
    g.beginPath(); g.moveTo(x, y - lift - 26); g.lineTo(x + 16, y - lift + 12); g.lineTo(x - 16, y - lift + 12); g.fill();
    g.fillStyle = '#ffe14d';
    g.beginPath(); g.arc(x - 4, y - lift - 6, 2.4, 0, 7); g.arc(x + 4, y - lift - 6, 2.4, 0, 7); g.fill();
  } else if(e.t === 'C'){
    g.fillStyle = '#5b6480';
    [[-13,0,13],[0,-6,15],[13,0,12]].forEach(([dx, dy, rr]) => {
      g.beginPath(); g.arc(x + dx, y - 34 + dy, rr, 0, 7); g.fill();
    });
  } else if(e.t === 'B'){
    const s2 = Math.sin(tick/14)*5;
    g.fillStyle = room.drain > .3 ? '#6a6f8c' : '#4a4a78';
    [[-34,4,26],[0,-10,34],[34,4,26],[-16,16,22],[18,16,22]].forEach(([dx, dy, rr]) => {
      g.beginPath(); g.arc(x + dx, y - 40 + dy + s2*.4, rr + s2*.2, 0, 7); g.fill();
    });
    g.fillStyle = '#ffe14d';
    g.beginPath(); g.ellipse(x, y - 40, 15, 10, 0, 0, 7); g.fill();
    g.fillStyle = '#2a2350';
    g.beginPath(); g.arc(x + (pl.x > e.x ? 4 : -4), y - 40, 6, 0, 7); g.fill();
    g.fillStyle = '#0007'; g.fillRect(x - 62, y - 104, 124, 9);
    g.fillStyle = '#ff4d5e'; g.fillRect(x - 60, y - 102, 120*e.hp/5, 5);
  } else if(e.t === 'L'){
    const f = 1 - e.tmr/52;
    g.strokeStyle = '#ffe14d'; g.lineWidth = 3; g.globalAlpha = .3 + f*.7;
    g.beginPath(); g.ellipse(x, y, 40*(1 - f) + 8, (40*(1 - f) + 8)*.55, 0, 0, 7); g.stroke();
    g.globalAlpha = 1;
  } else if(e.t === 'o'){
    g.fillStyle = '#8fd8ff'; g.globalAlpha = .75;
    g.beginPath(); g.arc(x, y - lift, 8, 0, 7); g.fill(); g.globalAlpha = 1;
  } else {                                          // pickups
    const col = e.t === 'H' ? '#ff5470' : e.t === 'K' ? '#ffd84d'
              : e.t === 'P' ? '#dff3ff' : KEY[e.t] ? MASKC[KEY[e.t]] : '#ffe14d';
    const b = Math.sin(tick/13)*3;
    g.globalAlpha = .25; g.fillStyle = col;
    g.beginPath(); g.arc(x, y - 16 + b, 16, 0, 7); g.fill(); g.globalAlpha = 1;
    g.fillStyle = col;
    if(e.t === 'R'){
      BANDS.forEach((cc, i) => { g.fillStyle = cc; g.fillRect(x - 10 + i*3, y - 26 + b, 3, 22); });
    } else {
      g.beginPath(); g.arc(x, y - 16 + b, 9, 0, 7); g.fill();
    }
  }
}

function isoHero(){
  const [x, y] = px(pl.x, pl.y);
  const b = Math.sin(tick/(pl.dash ? 3 : 6))*(pl.dash ? 2.2 : 1.2) - (pl.z ? 16 : 0);
  const face = Math.cos(pl.dir) >= 0 ? 1 : -1;
  g.save(); g.translate(x, y - 20 + b); g.scale(face, 1);
  if(pl.inv > 0) g.globalAlpha = pl.inv % 10 < 5 ? .4 : 1;
  g.lineCap = 'round'; g.lineWidth = 3.4;
  BANDS.forEach((c, i) => {                          // tail
    g.strokeStyle = c;
    g.beginPath(); g.moveTo(-12, -2 + i*1.4); g.lineTo(-24, -8 + i*2.2); g.stroke();
  });
  g.fillStyle = '#fff'; g.strokeStyle = '#2a2350'; g.lineWidth = 2;
  g.beginPath(); g.ellipse(0, 0, 15, 11, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#f2eefc';
  [[-8, 10], [6, 10]].forEach(([hx, hy]) => { g.beginPath(); g.ellipse(hx, hy, 4, 4, 0, 0, 7); g.fill(); });
  g.lineWidth = 3.2;
  BANDS.forEach((c, i) => {                          // mane
    g.globalAlpha = ((i < 3 ? 1 : i < 5 ? 2 : 4) & pl.stolen) ? .15 : 1;
    g.strokeStyle = c;
    g.beginPath(); g.moveTo(4, -12 + i*2.2); g.lineTo(-4, -10 + i*2.4); g.stroke();
  });
  g.globalAlpha = pl.inv > 0 && pl.inv % 10 < 5 ? .4 : 1;
  g.fillStyle = '#fff'; g.strokeStyle = '#2a2350';
  g.beginPath(); g.ellipse(11, -12, 8.5, 7, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = pl.prism ? '#dff3ff' : '#ffd84d';
  g.beginPath(); g.moveTo(15, -20); g.lineTo(26, -26); g.lineTo(16, -13); g.fill();
  g.fillStyle = '#222'; g.beginPath(); g.arc(14, -13, 1.6, 0, 7); g.fill();
  g.restore(); g.globalAlpha = 1;
}
