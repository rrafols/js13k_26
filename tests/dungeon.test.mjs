import { load, helpers } from './harness.mjs'
const a = load(), { TS, mid, s, shoot, T, done, at, go } = helpers(a)
const room=()=>a.rooms.indexOf(a.room);

a.newGame();
T('starts in Rainbow Falls', a.rooms.length > 12 && a.room.name==='Rainbow Falls');

// --- fading rainbows ---
shoot(9,6,16,6); s(5);
T('bridge exists after throwing', a.bridged.size>0);
s(300); T('bridge still up mid-life', a.bridged.size>0 && a.bows.length===1);
s(200); T('rainbow fades and takes its bridge with it', a.bows.length===0 && a.bridged.size===0);

// --- particles ---
const n0=a.ps.length; shoot(9,6,16,6);
T('throwing spawns particles', a.ps.length>n0);
s(120); T('particles expire', a.ps.length===0);

// --- walk the first rooms ---
a.pl.x=mid(9);a.pl.y=mid(6); shoot(9,6,16,6); s(260,{d:1});
T('crossed the water and reached Key Chamber', room()===1);
const k=a.ents.find(e=>e.t==='K'); a.pl.x=k.x;a.pl.y=k.y; s(2);
a.pl.x=mid(22);a.pl.y=mid(6); s(2);
T('key opens the door', a.map[6][23]==='.' && a.pl.keys===0);
s(40,{d:1}); T('into Switch Isles', room()===2);
shoot(1,6,5,3); shoot(1,6,5,9); shoot(1,6,18,6);
a.pl.x=mid(16);a.pl.y=mid(6); shoot(16,6,18,3); shoot(16,6,18,9);
T('four crystals lit -> gate open', a.gateOpen());
a.pl.y=mid(6); s(300,{d:1}); T('into Gallop Hall', room()===3);

// --- gallop ---
T('cracked wall blocks the way', a.map[6][8]==='X' && a.solid(mid(8),mid(6))===1);
a.pl.x=mid(6);a.pl.y=mid(6);a.pl.dir=0; s(30,{shift:1});
T('gallop smashes the cracked wall', a.map[6][8]==='.');
const sl=a.ents.find(e=>e.t==='E'); sl.x=a.pl.x+30; sl.y=a.pl.y; const hp=a.pl.hp;
s(4,{shift:1});
T('galloping through a slime kills it, no damage', !sl.hp && a.pl.hp===hp);
// the 8-tile channel needs two bridges
a.pl.x=mid(11);a.pl.y=mid(6); shoot(11,6,21,6);
T('one throw cannot span the wide channel', !a.bridged.has('19,6'));
a.pl.x=mid(17);a.pl.y=mid(6); shoot(17,6,23,6);
T('a second bridge finishes the crossing', a.bridged.has('19,6'));
a.pl.y=mid(6); s(300,{d:1}); T('into Mirror Hall', room()===4);

// --- mirrors ---
T('mirror is solid', a.solid(mid(7),mid(1))===1);
shoot(7,4,7,1);
T('beam bounces off \\\\ into the sealed crystal', a.room.lit.has('4,1'));
shoot(16,4,16,1);
T('beam bounces off / into the other crystal', a.room.lit.has('19,1'));
T('both lit -> gate opens', a.gateOpen());
a.pl.y=mid(6); s(300,{d:1}); T('into Drained Vault', room()===5);

// --- torches + drain ---
T('room starts drained (greyscale)', a.room.drain===1);
shoot(4,8,4,4); T('direct beam lights a torch', a.map[4][4]==='F');
shoot(6,8,6,11); T('bounced beam lights the channel torch', a.map[11][3]==='F');
T('gate still shut with one torch dark', !a.gateOpen());
shoot(17,5,17,1); T('third torch lit through the / mirror', a.map[1][20]==='F');
T('all torches lit -> gate opens', a.gateOpen());
const d0=a.room.drain; s(30);
T('colour floods back', a.room.drain<d0 && a.ps.length>50);
a.pl.y=mid(6); s(300,{d:1}); T('into Prism Sanctum', room()===6);
a.draw();
// ---------- a bridge must be walkable, not just present ----------
// A diagonal throw used to leave a staircase of tiles touching only at their
// corners; the hitbox is wider than that corner, so the unicorn wedged.
function orphans(deg){
  a.newGame(); a.enter(at('falls'), 60, 262);
  a.pl.x = mid(9); a.pl.y = mid(6);
  const th = deg*Math.PI/180;
  a.aim.x = a.pl.x + Math.cos(th)*300; a.aim.y = a.pl.y + Math.sin(th)*300;
  a.charge = 280; a.fire();
  const open = id => { const [c, r] = id.split(',').map(Number); return a.bridged.has(id) || a.map[r][c] !== '~'; };
  const seen = new Set(['9,6']), q = [[9, 6]];
  while(q.length){
    const [c, r] = q.pop();
    for(const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nc = c + dc, nr = r + dr, id = nc + ',' + nr;
      if(nc < 0 || nr < 0 || nc > 23 || nr > 12 || seen.has(id)) continue;
      if(a.map[nr][nc] === '#' || !open(id)) continue;
      seen.add(id); q.push([nc, nr]);
    }
  }
  return [...a.bridged].filter(id => !seen.has(id));
}
T('a 45 degree bridge is walkable end to end', orphans(45).length === 0 && orphans(-45).length === 0);
let worst = 0;
for(let d = -60; d <= 60; d += 3) worst = Math.max(worst, orphans(d).length);
T('no throw angle leaves a tile you can only reach diagonally', worst === 0);

// ---------- the authored dungeon has to be walkable ----------
// Anything you can open, break, bridge, ramp or shove counts as passable,
// because you carry the tools for all of them. Only real walls and fixed glass
// stop the flood.
const HARD = '#/\\()>rgb+' + "'";
function reach(r){
  const g = r.m.map(x => x.split(''));
  const start = [];
  if(r.links.w != null) start.push([1, 6]);
  if(r.links.e != null) start.push([22, 6]);
  if(r.links.n != null) start.push([3, 1]);
  if(r.links.s != null) start.push([3, 11]);
  if(!start.length) start.push([r.start[0], r.start[1]]);
  start.push([r.start[0], r.start[1]]);
  const seen = new Set(), q = [...start];
  while(q.length){
    const [c, rr] = q.pop(), k = c + ',' + rr;
    if(c < 0 || rr < 0 || c > 23 || rr > 12 || seen.has(k)) continue;
    if(HARD.includes(g[rr][c]) || (g[rr][c] >= '1' && g[rr][c] <= '7') || g[rr][c] === 'S') continue;
    seen.add(k);
    q.push([c+1, rr], [c-1, rr], [c, rr+1], [c, rr-1]);
  }
  return seen;
}
let broken = [];
for(const r of a.SRC){
  const seen = reach(r), near = (c, rr) =>
    [[1,0],[-1,0],[0,1],[0,-1]].some(([dc, dr]) => seen.has((c+dc) + ',' + (rr+dr)));
  if(r.links.w != null && !seen.has('1,6')) broken.push(r.name + ' west door');
  if(r.links.e != null && !seen.has('22,6')) broken.push(r.name + ' east door');
  if(r.links.n != null && !seen.has('3,1')) broken.push(r.name + ' north door');
  if(r.links.s != null && !seen.has('3,11')) broken.push(r.name + ' south door');
  r.m.forEach((row, rr) => [...row].forEach((t, c) => {
    if('RKHP'.includes(t) && !seen.has(c + ',' + rr)) broken.push(r.name + ' ' + t + ' at ' + c + ',' + rr);
    if('MN'.includes(t) && !near(c, rr)) broken.push(r.name + ' chest at ' + c + ',' + rr);
  }));
}
T('every door and every treasure in the dungeon can be reached', broken.length === 0);
if(broken.length) console.log('   ', broken.slice(0, 6));

done();
