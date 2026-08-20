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
  if(k === 'r') newGame();
  if(k === 'm') mute = !mute;
  if(k === 'escape'){ scene = 'title'; charging = 0; }
};
function toWorld(e){
  const b = cv.getBoundingClientRect(), t = e.touches ? e.touches[0] : e;
  aim.x = (t.clientX - b.left)/b.width * W;
  aim.y = (t.clientY - b.top)/b.height * H - HUD;
}
cv.onmousemove = cv.ontouchmove  = e => { toWorld(e); e.preventDefault(); };
cv.onmousedown = cv.ontouchstart = e => {
  toWorld(e); e.preventDefault();
  if(scene === 'title'){                             // menu rows sit 46px apart
    const i = (aim.y + HUD - 250)/46 | 0;
    if(i >= 0 && i < 4) start(MODES[i]);
    return;
  }
  charging = 1; charge = MINLEN;
};
window.onmouseup = window.ontouchend = () => { if(charging){ fire(); charging = 0; } };
