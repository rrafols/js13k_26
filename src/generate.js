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
function gen(seed, len, taught){
  const R = rnd32(seed), ri = n => R()*n | 0, pick = a => a[ri(a.length)];
  // Onto open floor, and never where it would plug a doorway: the corridor row,
  // or the tile just inside a north or south opening. A crystal parked there
  // seals a whole wing off, which the reachability audit duly caught.
  const drop = (m, ch, lo, hi) => {
    for(let i = 0; i < 80; i++){
      const c = lo + ri(hi - lo), r = 1 + ri(ROWS - 2);
      if(r === 6 || (c === 3 && (r === 1 || r === ROWS - 2))) continue;
      if(m[r][c] === '.'){ m[r][c] = ch; return 1; }
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
    else if(k === 'chroma'){                         // a lock that wants one channel
      const i = ri(3), door = '!@$'[i], glass = 'rgb'[i];
      box(m, 12, 1, 12, ROWS - 2, '#');
      m[6][12] = door; m[6][10] = glass;              // the glass that makes its colour
      return 0;
    }
    else if(k === 'sledge'){                         // shove the mirror into the lane
      const a = 4 + ri(4);
      box(m, a, 2, a + 2, 2, '#'); m[1][a] = '7';
      m[3][a + 3] = ')';                             // push it north twice to line it up
      return 1;
    }
    else if(k === 'lens'){                           // reach past the usual range
      const r0 = 2 + ri(3)*3;
      m[r0][10] = '+'; m[r0][20] = '7';
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
  // Templates are dealt, not sampled: shuffle two decks and hand them out, so a
  // run shows most of its vocabulary once instead of rolling the same die every
  // room. The simple half is dealt first, so a run teaches before it tests.
  const shuffle = a => {
    for(let i = a.length; --i > 0;){ const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const early = shuffle(['water','crack','crystals','torch','blocks','combat','mirror','plateau']);
  const late = shuffle(['prism','filter','lens','sledge','chroma']);
  const dun = [];
  for(let i = 0; i < len; i++){
    const m = blankRoom(), links = {}, last = i === len - 1;
    let name = NAMES[(seed + i*3) % NAMES.length], drain = 0, flow = 0;
    if(i){ m[6][0] = '.'; links.w = i - 1; }
    if(!last){ m[6][COLS - 1] = '.'; links.e = i + 1; }
    if(last){ arena(m); name = 'Storm Arena'; }
    else if(i === len - 2){
      m[6][COLS - 1] = 'Y'; name = 'Sun Gate';
      drop(m, 'H', 3, 20); drop(m, 'V', 6, 18);      // the thief guards the last door
    } else if(i === 0){ theme(m, 'water'); drop(m, 'H', 3, 20); drop(m, 'q', 3, 20); }
    else {
      // A dungeon that follows hand-built teaching rooms has no tutorial tier
      // to repeat, so `taught` pushes it straight to the advanced deck.
      const deck = (taught || 0) + i < 2 + len*.28 ? early : late;
      if(!deck.length) deck.push(...shuffle(['water','crystals','combat','mirror','plateau']));
      if(theme(m, deck.pop())) m[6][COLS - 1] = 'G';
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
      const wet = m.some(row => row.includes('~'));
      const foes = wet ? ['E','A','U','W','C'] : ['E','A','U','W','q','H'];
      for(let k = 1 + (i*3/len | 0); k--;) drop(m, pick(foes), 4, 20);   // more of them, deeper in
      drain = R() < .25 ? 1 : 0;
      // Water only starts pulling once a player knows how to cross still water.
      if(wet && i > len*.45) flow = ri(2) ? 1 : -1;
    }
    dun.push({name, start:[i ? 1 : 2, 6], links, mp:[i, 1], m, drain, flow});
  }
  let goal = 0;
  // A dead end is a detour; a loop is a route. Wings come in both shapes: a
  // single hidden room off one chain room, or a pair that rejoins the chain two
  // rooms along, so part of the run has an upper road and a lower one.
  const wing = (host, exits, name) => {
    const m = blankRoom();
    m[ROWS - 1][3] = '.';                            // the way back down
    dun[host].m[0][3] = '.'; dun[host].links.n = dun.length;
    const room = {name:'Hidden ' + NAMES[(seed + dun.length) % NAMES.length],
                  start:[3, 11], links:{s:host}, mp:[dun[host].mp[0], 0], m, drain:0, flow:0};
    dun.push(room);
    return room;
  };
  const freeHost = () => {
    for(let tr = 0; tr < 14; tr++){
      const h = 1 + ri(Math.max(1, len - 3));
      if(dun[h].links.n == null) return h;
    }
    return -1;
  };

  if(len >= 7 && ri(3) < 2){                         // an upper road, two rooms long
    let a1 = -1;
    for(let tr = 0; tr < 14 && a1 < 0; tr++){
      const h = 1 + ri(Math.max(1, len - 5));
      if(dun[h].links.n == null && dun[h + 2] && dun[h + 2].links.n == null && h + 2 < len - 2) a1 = h;
    }
    if(a1 >= 0){
      const w1 = wing(a1), i1 = dun.length - 1;
      const w2 = wing(a1 + 2), i2 = dun.length - 1;
      w1.links.e = i2; w1.m[6][COLS - 1] = '.';
      w2.links.w = i1; w2.m[6][0] = '.';
      w2.mp = [dun[a1 + 2].mp[0], 0];
      box(w1.m, 8, 3, 8, 9, '#'); w1.m[6][8] = 'X';  // the upper road is not free
      if(drop(w1.m, 'R', 12, 20)) goal++;          // only count what actually landed
      drop(w2.m, 'H', 10, 20); drop(w2.m, pick(['E','A','U']), 12, 20);
    }
  }

  for(let b = 1 + ri(2); b--;){                      // and a hidden room or two
    const host = freeHost();
    if(host < 0) continue;
    const w = wing(host);
    box(w.m, 9, 4, 14, 4, '#'); box(w.m, 9, 8, 14, 8, '#');
    box(w.m, 9, 5, 9, 7, '#'); box(w.m, 14, 5, 14, 7, '#');
    w.m[4][11] = 'X'; w.m[6][11] = 'M';              // gallop in, take the shard
    drop(w.m, 'E', 16, 21); drop(w.m, 'q', 16, 21);
    goal++;
  }
  for(let k = 2; k--;){                              // and a couple loose in the chain
    const i = 1 + ri(Math.max(1, len - 3));
    if(drop(dun[i].m, 'R', 3, 20)) goal++;
  }
  // Sigils: two crystals in different rooms, and the door they open somewhere
  // else, so a generated run also has an objective bigger than one screen.
  let host = -1;
  for(let tr = 0; tr < 14 && host < 0; tr++){
    const h = 1 + ri(Math.max(1, len - 3)), m2 = dun[h].m;
    let clear = 1;                                   // never build over what is already there
    for(let r = 8; r <= 11; r++) for(let c = 18; c <= 21; c++) if(m2[r][c] !== '.') clear = 0;
    if(clear) host = h;
  }
  if(host >= 0){
    const m2 = dun[host].m;
    box(m2, 19, 8, 21, 8, '#'); box(m2, 18, 9, 18, 11, '#');
    m2[8][20] = '|'; m2[10][20] = 'R';
    goal++;
  }
  for(let k = 2, guard = 0; k > 0 && guard < 20; guard++){
    const i = 1 + ri(Math.max(1, len - 3));
    if(i !== host && drop(dun[i].m, 'S', 3, 20)) k--;
  }
  // Coloured keys: the key always lands in an earlier chain room than its lock,
  // and the lock always guards a walled alcove -- never a way out of a room.
  for(let n = 1 + ri(2); n--;){
    const i = ri(3), key = 'xyz'[i], lock = '[]{'[i];
    let lockRoom = -1;
    for(let tr = 0; tr < 14 && lockRoom < 0; tr++){
      const h = 2 + ri(Math.max(1, len - 4)), m3 = dun[h].m;
      let clear = 1;
      // Check every tile this alcove writes, walls included -- column 6 is part
      // of it, and building over a shard that was already counted throws the
      // colour total out.
      for(let r = 8; r <= 11; r++) for(let c = 2; c <= 6; c++) if(m3[r][c] !== '.') clear = 0;
      if(clear) lockRoom = h;
    }
    if(lockRoom < 0) continue;
    const m3 = dun[lockRoom].m;
    box(m3, 2, 8, 5, 8, '#'); box(m3, 6, 9, 6, 11, '#');
    m3[8][3] = lock; m3[10][3] = ri(2) ? 'H' : 'R';
    if(m3[10][3] === 'R') goal++;
    const keyRoom = ri(lockRoom - 1) + 1;              // strictly earlier in the chain
    // Keep the key clear of both alcove footprints, or it can end up sealed
    // inside the very vault it opens.
    if(!drop(dun[keyRoom].m, key, 8, 17)) m3[8][3] = '.';   // no key placed, no lock
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

// ---------- the story dungeon ----------
// The opening rooms are hand built, because that is where the game teaches:
// bridge, key, crystals, gallop, mirrors, one verb at a time. Past that a
// player knows the vocabulary, so the middle is grown from a fixed seed and
// costs four bytes instead of a hundred a room.
function hybrid(seed, keep){
  const head = SRC.slice(0, keep).map(r => ({...r, links:{...r.links}}));
  head.forEach((r, i) => {                           // drop links that left the prefix
    for(const k of Object.keys(r.links)) if(r.links[k] >= keep) {
      delete r.links[k];
      if(k === 'n') r.m = r.m.map((row, y) => y === 0 ? row.slice(0, 3) + '#' + row.slice(4) : row);
      if(k === 's') r.m = r.m.map((row, y) => y === ROWS - 1 ? row.slice(0, 3) + '#' + row.slice(4) : row);
    }
  });
  const tail = gen(seed, 9, keep);   // the authored rooms already taught the basics
  head[keep - 1].links.e = keep;                     // graft the two chains together
  tail.forEach((r, i) => {
    const links = {};
    for(const k of Object.keys(r.links)) links[k] = r.links[k] + keep;
    if(i === 0){ links.w = keep - 1; r.m = r.m.map((row, y) => y === 6 ? '.' + row.slice(1) : row); }
    r.links = links;
    r.mp = [r.mp[0] + keep, r.mp[1]];
  });
  const dun = head.concat(tail);
  const all = dun.map(r => r.m.join('')).join('');
  const shards = (all.split('R').length - 1) + (all.split('M').length - 1);
  dun.goal = Math.max(3, Math.min(7, shards - 2));
  return dun;
}
