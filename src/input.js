// ---------- input ----------
window.onkeydown = e => {
  keys[e.key.toLowerCase()] = 1;
  if(e.key === ' ') e.preventDefault();
};
window.onkeyup = e => {
  const k = e.key.toLowerCase();
  keys[k] = 0;
  if(scene === 'title'){
    if(k === 'arrowdown' || k === 's') pick = (pick + 1) % 4;
    if(k === 'arrowup' || k === 'w') pick = (pick + 3) % 4;
    if(k === 'enter' || k === ' ') start(MODES[pick]);
    if('1234'.includes(k)) start(MODES[+k - 1]);
    return;
  }
  if(k === 'c'){ cb = !cb; saveBest('cb', cb ? 1 : 0); }
  if(scene === 'intro'){ scene = 'play'; return; }
  if(scene === 'end'){
    if(k === 'r') start(mode);
    if(k === 'escape' || k === 'enter' || k === ' ') scene = 'title';
    return;
  }
  if(k === 'r') newGame();
  if(k === 'm') mute = !mute;
  if(k === 'escape'){ scene = 'title'; charging = 0; }
};
function toWorld(e){
  const b = cv.getBoundingClientRect(), t = e.touches ? e.touches[0] : e;
  aim.x = (t.clientX - b.left)/b.width * W;
  aim.y = (t.clientY - b.top)/b.height * H - HUD;
}
cv.onmousemove = e => { toWorld(e); e.preventDefault(); };
cv.onmousedown = e => {
  toWorld(e); e.preventDefault();
  if(tap()) return;
  charging = 1; charge = MINLEN;
};
window.onmouseup = () => { if(charging){ fire(); charging = 0; } };

/** A press outside play: menu row, past the intro, off the end card. */
function tap(){
  if(scene === 'title'){                             // menu rows sit 46px apart
    const i = (aim.y + HUD - 250)/46 | 0;
    if(i >= 0 && i < 4) start(MODES[i]);
    return 1;
  }
  if(scene === 'intro'){ scene = 'play'; return 1; }
  if(scene === 'end'){ scene = 'title'; return 1; }
  return 0;
}

// ---------- touch ----------
// Left half is a thumbstick, right half aims and charges, and a second finger
// on the left gallops. Without this the game is unplayable on a phone: you
// could aim and throw but never walk.
let stick = null, aimT = null, touchDash = 0, touched = 0;
const tpos = t => {
  const b = cv.getBoundingClientRect();
  return [(t.clientX - b.left)/b.width * W, (t.clientY - b.top)/b.height * H - HUD];
};
cv.ontouchstart = e => {
  e.preventDefault();
  touched = 1;
  for(const t of e.changedTouches){
    const [x, y] = tpos(t);
    aim.x = x; aim.y = y;
    if(tap()) return;
    if(x < W/2){
      if(stick) touchDash = 1;                       // second finger: gallop
      else stick = {id:t.identifier, ox:x, oy:y, x, y};
    } else if(aimT === null){
      aimT = t.identifier; charging = 1; charge = MINLEN;
    }
  }
};
cv.ontouchmove = e => {
  e.preventDefault();
  for(const t of e.changedTouches){
    const [x, y] = tpos(t);
    if(stick && t.identifier === stick.id){ stick.x = x; stick.y = y; }
    else if(t.identifier === aimT){ aim.x = x; aim.y = y; }
  }
};
window.ontouchend = window.ontouchcancel = e => {
  for(const t of e.changedTouches){
    if(stick && t.identifier === stick.id) stick = null;
    else if(t.identifier === aimT){ aimT = null; if(charging){ fire(); charging = 0; } }
  }
};
