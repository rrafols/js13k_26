// ---------- procedural dungeons ----------
// Every template writes its own way through, so a generated run is solvable by
// construction: water is never wider than one throw, a gate's crystals always
// sit in the open, a cracked wall always has floor on both sides.
const NAMES = ['Shallows','Terrace','Causeway','Cistern','Arch','Stair','Span'];
function rnd32(a){
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function blankRoom(){
  const m = [];
  for(let r = 0; r < ROWS; r++)
    m.push((r && r < ROWS - 1 ? '#' + '.'.repeat(COLS - 2) + '#' : '#'.repeat(COLS)).split(''));
  return m;
}
const box = (m, c0, r0, c1, r1, ch) => {
  for(let r = r0; r <= r1; r++) for(let c = c0; c <= c1; c++) m[r][c] = ch;
};
function arena(m){                                   // the storm's ring, mirrors and all
  box(m, 2, 2, 4, 4, '~'); box(m, 19, 2, 21, 4, '~');
  box(m, 2, 9, 4, 11, '~'); box(m, 19, 9, 21, 11, '~');
  m[4][12] = '\\'; m[8][12] = '/'; m[6][8] = '\\'; m[6][16] = '/'; m[6][12] = 'B';
  return m;
}
function gen(seed, len){
  const R = rnd32(seed), ri = n => R()*n | 0, pick = a => a[ri(a.length)];
  const drop = (m, ch, lo, hi) => {                  // onto open floor, never the corridor
    for(let i = 0; i < 80; i++){
      const c = lo + ri(hi - lo), r = 1 + ri(ROWS - 2);
      if(m[r][c] === '.' && r !== 6){ m[r][c] = ch; return 1; }
    }
    return 0;
  };
  const theme = (m, k) => {
    if(k === 'water'){ const w = 4 + ri(3), a = 8 + ri(4); box(m, a, 1, a + w - 1, ROWS - 2, '~'); }
    else if(k === 'crack'){ const a = 7 + ri(6); box(m, a, 1, a, ROWS - 2, '#'); box(m, a, 5, a, 7, 'X'); }
    else if(k === 'crystals'){ for(let i = 2 + ri(3); i--;) drop(m, '7', 3, 20); return 1; }
    else if(k === 'torch'){ for(let i = 2 + ri(2); i--;) drop(m, 'f', 3, 20); return 1; }
    else if(k === 'mirror'){                         // sealed channel: only a bounce gets in
      const a = 4 + ri(4);
      box(m, a, 2, a + 2, 2, '#'); m[1][a] = '7'; m[1][a + 3] = '\\';
      return 1;
    }
    else if(k === 'prism'){ m[6][12] = '>'; m[5][16] = '1'; m[6][16] = '2'; m[7][16] = '4'; return 1; }
    else if(k === 'filter'){
      const f = pick(['r','g','b']);
      box(m, 12, 3, 12, 9, '#');
      m[6][12] = f; m[6][16] = f === 'r' ? '1' : f === 'g' ? '2' : '4';
      return 1;
    }
    else if(k === 'plateau'){ const a = 17 + ri(4); box(m, a - 3, 8, a, 11, '^'); m[10][a - 1] = 'M'; }
    else if(k === 'blocks'){
      const a = 9 + ri(5); box(m, a, 1, a + 1, ROWS - 2, '~');
      for(let i = 3; i--;) drop(m, 'O', 3, a - 1);
      for(let i = 3; i--;) drop(m, 'q', 3, 20);
    }
    else for(let i = 3; i--;) drop(m, pick(['E','E','A','U','W']), 4, 20);
    return 0;
  };
  const pool = ['water','water','crack','crystals','torch','mirror','prism','filter',
                'plateau','blocks','combat'];
  const dun = [];
  for(let i = 0; i < len; i++){
    const m = blankRoom(), links = {}, last = i === len - 1;
    let name = NAMES[(seed + i*7) % NAMES.length], drain = 0;
    if(i){ m[6][0] = '.'; links.w = i - 1; }
    if(!last){ m[6][COLS - 1] = '.'; links.e = i + 1; }
    if(last){ arena(m); name = 'Storm Arena'; }
    else if(i === len - 2){
      m[6][COLS - 1] = 'Y'; name = 'Sun Gate';
      drop(m, 'H', 3, 20); drop(m, 'V', 6, 18);      // the thief guards the last door
    } else if(i === 0){ theme(m, 'water'); drop(m, 'H', 3, 20); drop(m, 'q', 3, 20); }
    else {
      if(theme(m, pick(pool))) m[6][COLS - 1] = 'G';
      for(let k = ri(3); k--;){                      // pools: never on the corridor, and
        const c0 = 3 + ri(17), r0 = 1 + ri(9);       // never touching other water, so no
        if(r0 === 6 || r0 + 1 === 6) continue;       // run ever grows past one throw
        let ok = 1;
        for(let r2 = r0 - 1; r2 <= r0 + 2; r2++) for(let c2 = c0 - 1; c2 <= c0 + 2; c2++)
          if(((m[r2] || [])[c2] || '.') !== '.') ok = 0;
        if(!ok) continue;
        for(let r2 = r0; r2 <= r0 + 1; r2++) for(let c2 = c0; c2 <= c0 + 1; c2++) m[r2][c2] = '~';
      }
      for(let k = ri(4); k--;) drop(m, 'q', 3, 20);
      if(i === 1) drop(m, 'P', 3, 20);               // the horn, early
      for(let k = 1 + ri(3); k--;) drop(m, pick(['E','E','A','U','W','q','H']), 4, 20);
      drain = R() < .25 ? 1 : 0;
    }
    dun.push({name, start:[i ? 1 : 2, 6], links, mp:[i, 1], m, drain});
  }
  let goal = 0;
  for(let b = 1 + ri(2); b--;){                      // side rooms, each with a chest
    let host = -1;
    for(let tr = 0; tr < 12 && host < 0; tr++){       // never hang two off one room
      const h = 1 + ri(Math.max(1, len - 3));
      if(dun[h].links.n == null) host = h;
    }
    if(host < 0) continue;
    const bi = dun.length, m = blankRoom();
    dun[host].m[0][3] = '.'; dun[host].links.n = bi;
    m[ROWS - 1][3] = '.';
    box(m, 9, 4, 14, 4, '#'); box(m, 9, 8, 14, 8, '#');
    box(m, 9, 5, 9, 7, '#'); box(m, 14, 5, 14, 7, '#');
    m[4][11] = 'X'; m[6][11] = 'M';                  // gallop in, take the shard
    drop(m, 'E', 16, 21); drop(m, 'q', 16, 21);
    dun.push({name:'Hidden ' + NAMES[(seed + bi) % NAMES.length],
              start:[3, 11], links:{s:host}, mp:[dun[host].mp[0], 0], m, drain:0});
    goal++;
  }
  for(let k = 2; k--;){                              // and a couple loose in the chain
    const i = 1 + ri(Math.max(1, len - 3));
    if(drop(dun[i].m, 'R', 3, 20)) goal++;
  }
  dun.forEach(d => d.m = d.m.map(r => r.join('')));
  dun.goal = goal;
  return dun;
}
const genRush = () => {
  const m = arena(blankRoom());
  const d = [{name:'Storm Arena', start:[2, 6], links:{}, mp:[0, 1], m:m.map(r => r.join('')), drain:0}];
  d.goal = 0; return d;
};
