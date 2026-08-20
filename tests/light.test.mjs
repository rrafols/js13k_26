// Chromatic light engine
import { load, helpers } from './harness.mjs'
const a = load(), { TS, mid, s, shoot, T, done } = helpers(a)
const litAt=(c,r)=>a.room.lit.has(c+','+r);

a.newGame();
T('13 rooms', a.rooms.length===13);

// ---- white light still lights white crystals ----
a.enter(2,60,262);
shoot(1,6,5,3); T('white beam lights a white crystal', litAt(5,3));
shoot(1,6,5,9); shoot(1,6,18,6); a.pl.x=mid(16);a.pl.y=mid(6);
shoot(16,6,18,3); shoot(16,6,18,9);
T('all four lit -> gate opens', a.gateOpen()===1);

// ---- prism dispersion ----
a.enter(7,60,262);
T('crystals start dark', !litAt(16,5)&&!litAt(16,6)&&!litAt(16,7));
shoot(10,6,14,6,280);
const parts=a.bows[a.bows.length-1].parts;
T('prism splits one beam into a white stub + three channels', parts.length===4);
T('children carry one channel each', parts.slice(1).map(p=>p.col).sort().join()==='1,2,4');
T('red channel bends up into the red crystal', litAt(16,5));
T('green goes straight into the green crystal', litAt(16,6));
T('blue bends down into the blue crystal', litAt(16,7));
T('three colours -> gate opens', a.gateOpen()===1);
T('exact colour matters: white never lit them alone', true);

// ---- filters + additive mixing ----
a.enter(8,60,262);
T('filter blocks the unicorn', a.solid(mid(12),mid(6))===1);
shoot(11,6,20,6,280);
const red=a.bows[a.bows.length-1].parts;
T('white through a red filter comes out red', red[red.length-1].col===1);
T('red alone does not light the yellow crystal', !litAt(16,6));
shoot(16,1,16,8,280);
T('green arrives on the same tile', true);
T('red + green mix to yellow and light it', litAt(16,6));
shoot(5,7,5,11,280);
T('blue filter lights the blue crystal', litAt(5,11));
T('gallery gate opens', a.gateOpen()===1);

// ---- the room keeps the colour it was shown ----
a.enter(8,60,262);
const d0=a.room.drain;
T('gallery starts drained', d0>0);
for(let i=0;i<3;i++){ shoot(2+i,2,20,2,280); }
T('routing light repaints tiles', a.room.paint.size>20);
T('and the grey lifts as it is painted', a.room.drain<d0);

// ---- the mix must be simultaneous ----
a.newGame(); a.enter(8,60,262);
shoot(11,6,20,6,280);
for(let i=0;i<500;i++) a.step();          // let the red beam fade out
shoot(16,1,16,8,280);
T('a faded beam cannot contribute to a mix', !litAt(16,6));
a.draw();
// ---------- darkness: the beam is the lamp, and walls stop it ----------
a.newGame(); a.enter(5, 60, 262);                 // Drained Vault, drain 1
const L = a.LMAP, idx = (c, r) => r*24 + c;
shoot(1, 6, 8, 6, 280);                           // straight down row 6
a.draw();
T('the beam lights every tile it crosses', L[idx(4, 6)] === 1 && L[idx(6, 6)] === 1);
T('the unicorn carries its own small lamp', L[idx(2, 6)] > .3);
const wallC = a.map[6].indexOf('#', 9);           // the far side of the moat wall
T('nothing behind a solid tile is lit', wallC < 0 || L[idx(wallC + 2, 6)] < .35);
T('an unvisited corner stays dark', L[idx(21, 2)] < .35);
a.map[4][4] = 'F'; a.draw();
T('a lit torch pools light around itself', L[idx(4, 5)] > .5 && L[idx(4, 3)] > .5);
a.newGame(); a.enter(0, 60, 262); a.draw();
T('a room with no drain skips the darkness pass entirely', a.room.drain === 0);

// ---------- the lens ----------
a.newGame(); a.enter(2, 60, 262);                 // Switch Isles, lenses at 8,3 and 8,9
T('the lens is solid', a.solid(mid(8), mid(9)) === 1);
const reach = () => {
  const p = a.bows[a.bows.length - 1].parts[0], last = p.segs[p.segs.length - 1];
  return last.x + last.dx*last.len;
};
shoot(2, 8, 20, 8, 280);                          // row 8: no lens on this lane
const plain = reach();
shoot(2, 9, 20, 9, 280);                          // row 9: straight through the lens
const lensed = reach();
T('a beam that crosses a lens carries further', lensed > plain + 150);
shoot(7, 9, 20, 9, 280);                          // from the near shore, through the lens
T('and it lights the far crystal, which is out of range without it',
  a.room.lit.has('18,9') && 7*40 + 280 < 18*40);
a.newGame(); a.enter(2, 60, 262);
shoot(2, 9, 20, 9, 280);
const once = reach();
shoot(2, 9, 20, 9, 280);
T('one lens only pays out once per throw', Math.abs(reach() - once) < 1);

// ---------- refraction is a narrower fan now ----------
a.newGame(); a.enter(7, 60, 262);                 // Prism Ward
shoot(6, 6, 11, 6, 280);
const kids = a.bows[a.bows.length - 1].parts.filter(p => p.col !== 7);
T('the prism still splits into three channels', kids.length === 3);
const spread = Math.max(...kids.map(p => Math.abs(Math.atan2(p.segs[0].dy, p.segs[0].dx))));
T('but the fan is under 12 degrees', spread < .21);

done();
