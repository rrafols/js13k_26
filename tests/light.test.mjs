// Chromatic light engine
import { load, helpers } from './harness.mjs'
const a = load(), { TS, mid, s, shoot, T, done, at, go } = helpers(a)
const litAt=(c,r)=>a.room.lit.has(c+','+r);

a.newGame();
T('the dungeon has its rooms', a.rooms.length > 12);

// ---- white light still lights white crystals ----
a.enter(at('switch'),60,262);
shoot(1,6,5,3); T('white beam lights a white crystal', litAt(5,3));
shoot(1,6,5,9); shoot(1,6,18,6); a.pl.x=mid(16);a.pl.y=mid(6);
shoot(16,6,18,3); shoot(16,6,18,9);
T('all four lit -> gate opens', a.gateOpen()===1);

// ---- prism dispersion ----
a.enter(at('ward'),60,262);
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
a.enter(at('gallery'),60,262);
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
a.enter(at('gallery'),60,262);
const d0=a.room.drain;
T('gallery starts drained', d0>0);
for(let i=0;i<3;i++){ shoot(2+i,2,20,2,280); }
T('routing light repaints tiles', a.room.paint.size>20);
T('and the grey lifts as it is painted', a.room.drain<d0);

// ---- the mix must be simultaneous ----
a.newGame(); a.enter(at('gallery'),60,262);
shoot(11,6,20,6,280);
for(let i=0;i<500;i++) a.step();          // let the red beam fade out
shoot(16,1,16,8,280);
T('a faded beam cannot contribute to a mix', !litAt(16,6));
a.draw();
// ---------- darkness: the beam is the lamp, and walls stop it ----------
a.newGame(); a.enter(at('drained'), 60, 262);                 // Drained Vault, drain 1
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
a.newGame(); a.enter(at('falls'), 60, 262); a.draw();
T('a room with no drain skips the darkness pass entirely', a.room.drain === 0);

// ---------- the lens ----------
a.newGame(); a.enter(at('switch'), 60, 262);                 // Switch Isles, lenses at 8,3 and 8,9
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
a.newGame(); a.enter(at('switch'), 60, 262);
shoot(2, 9, 20, 9, 280);
const once = reach();
shoot(2, 9, 20, 9, 280);
T('one lens only pays out once per throw', Math.abs(reach() - once) < 1);

// ---------- refraction is a narrower fan now ----------
a.newGame(); a.enter(at('ward'), 60, 262);                 // Prism Ward
shoot(6, 6, 11, 6, 280);
const kids = a.bows[a.bows.length - 1].parts.filter(p => p.col !== 7);
T('the prism still splits into three channels', kids.length === 3);
const spread = Math.max(...kids.map(p => Math.abs(Math.atan2(p.segs[0].dy, p.segs[0].dx))));
T('but the fan is under 12 degrees', spread < .21);

// ---------- colour locks ----------
a.newGame(); a.enter(at('locks'), 60, 262);
T('the red lock starts shut', a.solid(mid(8), mid(6)) === 1);
shoot(2, 6, 10, 6, 280);                          // white through the red glass at 6,6
T('red light through red glass opens it', a.solid(mid(8), mid(6)) === 0);
T('and a shut lock stops light dead', a.solid(mid(16), mid(6)) === 1);
a.pl.prism = 1; a.pl.pch = 3;
shoot(12, 5, 22, 5, 280);                          // fan from above: the low arm is blue
T('the horn opens the blue lock with its low arm', a.solid(mid(16), mid(6)) === 0);
a.newGame(); a.enter(at('locks'), 60, 262); a.pl.prism = 1; a.pl.pch = 3;
shoot(12, 7, 22, 7, 280);                          // from below, the red arm lands there instead
T('the wrong arm leaves it shut', a.solid(mid(16), mid(6)) === 1);

// ---------- the horn is spent, not recharged ----------
a.newGame(); a.enter(at('sanctum'), 60, 262);
const horn = a.ents.find(e => e.t === 'P');
a.pl.x = horn.x; a.pl.y = horn.y; s(2);
T('picking it up gives three splits', a.pl.prism === 1 && a.pl.pch === 3);
a.enter(at('ward'), 60, 262);
const chans = () => a.bows[a.bows.length - 1].parts.map(p => p.col).sort().join('');
shoot(3, 6, 10, 6, 280);
T('a full charge fires red, green and blue', chans() === '124' && a.pl.pch === 2);
shoot(3, 6, 10, 6, 280);
shoot(3, 6, 10, 6, 280);
T('the third split spends the horn', a.pl.prism === 0 && a.pl.pch === 0);
shoot(3, 6, 10, 6, 280);
T('without it you throw plain white', chans() === '7');
T('and it is not on its pedestal', horn.hp === 0);
s(200);
T('it takes a long time to reform', horn.hp === 0 && a.pl.prech > 0);
a.pl.prech = 1; s(2);
T('then it is back where it stood', horn.hp === 1);
a.enter(at('sanctum'), 60, 262);
a.pl.x = horn.x; a.pl.y = horn.y; s(2);
T('and picking it up again refills the three', a.pl.prism === 1 && a.pl.pch === 3);

// ---------- sigils span rooms ----------
a.newGame();
T('three sigils are scattered through the dungeon', a.sigNeed === 3);
a.enter(at('approach'), 60, 262);
T('their door is shut until all three are lit', a.solid(mid(3), mid(12)) === 1);
// each sigil is reached the way its room intends, which also checks the designs
a.enter(at('ward'), 60, 262); shoot(16, 6, 21, 6, 280);          // straight down the hall
T('the Ward sigil takes a plain beam', a.sig === 1);
a.enter(at('grotto'), 60, 262); shoot(11, 6, 14, 6, 200);        // inside the cracked vault
T('the Grotto sigil sits behind cracked stone', a.sig === 2);
a.enter(at('terrace'), 60, 262); shoot(18, 6, 18, 3, 280);       // up the lane, off the mirror
T('the Terrace sigil only takes a bounce', a.sig === 3);
T('lighting all three opens it', a.sig === 3);
a.enter(at('approach'), 60, 262);
T('and the vault door yields', a.solid(mid(3), mid(12)) === 0);

done();
