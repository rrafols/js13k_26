// ---------- rainbow feel spike ----------
// Overlays the shipping game: nothing in src/ changes. Every function here
// wraps the original, so the gameplay stays authoritative and only the feel
// moves. Press F to A/B against the current behaviour.
//
// The five beats, in the order they were proposed:
//   1  the unicorn faces the throw while charging
//   2  the arc sweeps out of the horn instead of appearing whole
//   3  charging has a rising voice, and a chime when the horn caps
//   4  release kicks: shake, recoil, a flash at the horn, a fatter sound
//   5  the beam lands: a burst where it stops, coloured by what it hit

const FEEL = { on: 1 };
const FEELGROW = 46;                       // px of arc drawn per frame (~6 frames at full charge)
const baseFire = fire, baseStep = step, baseDraw = draw, baseDrawBow = drawBow;

// F toggles. addEventListener, not window.onkeyup - input.js owns that slot and
// assigning to it would silently unbind the whole game.
window.addEventListener('keyup', e => {
  if(e.key.toLowerCase() === 'f'){ FEEL.on = !FEEL.on; snd(FEEL.on ? 900 : 400, .1, 'triangle', .05); }
});

// ---------- 4: release ----------
fire = function(){
  const a0 = Math.atan2(aim.y - pl.y, aim.x - pl.x);
  // 1: point the horn where the throw is going. The original muzzle spray in
  // light.js uses pl.dir, which is the *walking* heading - aim behind you and
  // the sparks came out the front. Setting it first fixes that for free.
  if(FEEL.on) pl.dir = a0;
  const f = Math.min(1, (charge - MINLEN)/(MAXLEN - MINLEN));
  baseFire();
  if(!FEEL.on) return;
  const b = bows[bows.length - 1];
  if(!b) return;

  b.front = 0;                                       // 2: the arc has to travel
  for(const p of b.parts) p.tot = p.segs.reduce((n, s) => n + s.len, 0);

  shake = Math.max(shake, 2 + f*4);                  // a flick barely nudges, a full throw kicks
  pl.rec = 4 + f*6;
  pl.flash = 7;
  part(pl.x + Math.cos(a0)*22, pl.y + Math.sin(a0)*22, 5 + (f*10 | 0), '#fff', 2 + f*2.4, 16, 2);
  // Layered under the original sawtooth blip rather than replacing it: longer
  // throws get a lower, longer body, so charge is audible as weight.
  snd(210 - f*70, .13 + f*.22, 'triangle', .05, 70);
};

// ---------- 5: where it lands ----------
function feelLand(p){
  const s = p.segs[p.segs.length - 1];
  if(!s) return;
  const x = s.x + s.dx*s.len, y = s.y + s.dy*s.len;
  const hue = p.col === 7 ? 0 : MASKC[p.col];        // 0 lets part() pick a band
  // cast() backs the endpoint off the blocker, so ask one step further along.
  const t = at((x + s.dx*7)/TS | 0, (y + s.dy*7)/TS | 0);
  if(at(x/TS | 0, y/TS | 0) === '~'){                // settling onto water: a bridge lands
    part(x, y, 12, '#8fd8ff', 2.4, 26, 2.4);
    snd(540, .14, 'sine', .035, 190);
  } else if('#XDOG'.includes(t) || LOCK[t]){         // stone: sparks, and they scatter back
    for(let i = 0; i < 9; i++){
      const a = Math.atan2(-s.dy, -s.dx) + (Math.random() - .5)*1.9, sp = 1 + Math.random()*2.4;
      ps.push({x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, l:12 + Math.random()*10,
               m:22, c:hue || BANDS[Math.random()*7 | 0], r:1.4 + Math.random()*1.6});
    }
    snd(250, .08, 'square', .03, 140);
  } else {
    part(x, y, 7, hue, 1.8, 22, 2);                  // out of reach: it just fizzles
  }
}

// ---------- 2 and 3: the tick ----------
step = function(){
  const pre = charge;
  baseStep();
  if(!FEEL.on) return;
  if(pl.rec > 0) pl.rec *= .74;
  if(pl.flash > 0) pl.flash--;

  if(charging){
    pl.dir = Math.atan2(aim.y - pl.y, aim.x - pl.x);          // 1: hold the aiming pose
    const f = Math.min(1, (charge - MINLEN)/(MAXLEN - MINLEN));
    if(tick % 5 === 0) snd(190 + f*430, .07, 'triangle', .018 + f*.02);
    if(pre < MAXLEN && charge >= MAXLEN) snd(1180, .13, 'triangle', .05, 1560);
  }

  for(const b of bows){
    if(b.front === undefined) continue;
    b.front += FEELGROW;
    for(const p of b.parts) if(!p.hit && b.front >= p.tot){ p.hit = 1; feelLand(p); }
  }
};

// ---------- 2: the arc, drawn as far as it has travelled ----------
drawBow = function(b){
  if(!FEEL.on || b.front === undefined) return baseDrawBow(b);
  const a = Math.min(1, b.life/70) * (b.life < 110 && b.life % 12 < 5 ? .55 : 1);
  g.globalAlpha = a; g.lineCap = 'butt';
  for(const p of b.parts){
    const white = p.col === 7, slim = p.thin || !white;
    let run = 0, hx = 0, hy = 0, live = 0;
    for(const s of p.segs){
      const vis = Math.min(s.len, b.front - run);
      if(vis <= 0) break;
      run += s.len;
      live = 1;
      const nx = -s.dy, ny = s.dx;
      hx = s.x + s.dx*vis; hy = s.y + s.dy*vis;
      g.globalAlpha = a; g.strokeStyle = '#ffffff33'; g.lineWidth = slim ? 24 : 46;
      g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(hx, hy); g.stroke();
      BANDS.forEach((col, i) => {
        const o = (i - 3) * (slim ? 3.1 : 5.8);
        g.globalAlpha = a * (white ? 1 : .5 + Math.abs(3 - i)/6);
        g.strokeStyle = white ? col : MASKC[p.col]; g.lineWidth = slim ? 3.4 : 6;
        g.beginPath(); g.moveTo(s.x + nx*o, s.y + ny*o); g.lineTo(hx + nx*o, hy + ny*o); g.stroke();
      });
    }
    if(live && b.front < p.tot){                     // a bright head while it is still flying
      g.globalAlpha = a; g.fillStyle = '#ffffff55'; circ(hx, hy, slim ? 11 : 17);
      g.fillStyle = '#fff'; circ(hx, hy, slim ? 4.5 : 7);
    }
  }
  g.globalAlpha = 1;
};

// ---------- 4: recoil, and the horn flash ----------
draw = function(){
  const ox = pl.x, oy = pl.y;
  if(FEEL.on && pl.rec > 0){                         // visual only: physics never sees this
    pl.x -= Math.cos(pl.dir)*pl.rec; pl.y -= Math.sin(pl.dir)*pl.rec;
  }
  baseDraw();
  pl.x = ox; pl.y = oy;
  if(!FEEL.on){ feelHud(); return; }

  gm.save(); gm.translate(0, HUD);
  if(pl.flash > 0){                                  // muzzle flash at the horn tip
    const k = pl.flash/7, hx = pl.x + Math.cos(pl.dir)*26, hy = pl.y + Math.sin(pl.dir)*26;
    gm.globalAlpha = k*.85; gm.fillStyle = '#fff';
    gm.beginPath(); gm.arc(hx, hy, 6 + (1 - k)*22, 0, 7); gm.fill();
    gm.globalAlpha = 1;
  }
  if(charging && charge >= MAXLEN){                  // 3: the horn is full, and it shows
    const p2 = 33 + Math.sin(tick/3)*3.5;             // clear of the base ring at 24
    gm.strokeStyle = pl.prism && pl.pch > 0 ? '#dff3ff' : '#ffe14d';
    gm.globalAlpha = .5 + Math.sin(tick/3)*.25; gm.lineWidth = 2;
    gm.beginPath(); gm.arc(pl.x, pl.y, p2, 0, 7); gm.stroke();
    gm.globalAlpha = 1;
  }
  gm.restore();
  feelHud();
};

function feelHud(){
  gm.font = '11px system-ui'; gm.textAlign = 'right';
  gm.fillStyle = FEEL.on ? '#5ddb62' : '#ffffff55';
  gm.fillText('feel: ' + (FEEL.on ? 'ON' : 'off') + '  (F)', W - 16, H - 10);
  gm.textAlign = 'left';
}
