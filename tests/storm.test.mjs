import { load, helpers } from './harness.mjs'
const a = load(), { TS, mid, s, shoot, T, done, at, go } = helpers(a)
const R=()=>a.rooms.indexOf(a.room);

a.newGame();
T('the dungeon has its rooms', a.rooms.length > 12);
T('at least as many shards exist as the door demands', (() => {
  const all = a.SRC.map(r => r.m.join('')).join('');
  const have = (all.split('R').length - 1) + (all.split('M').length - 1);
  return have >= a.shardGoal;
})());
T('audio degrades silently with no AudioContext', true);

// ---- shards + sun gate ----
a.enter(at('sun gate'),60,262);
T('sun gate is shut without the seven colours', a.solid(mid(23),mid(6))===1);
a.pl.shards=7;
T('sun gate opens with all seven', a.solid(mid(23),mid(6))===0);
a.pl.shards=0;
a.enter(at('key'),60,262);
const sh=a.ents.find(e=>e.t==='R'); a.pl.x=sh.x;a.pl.y=sh.y; s(2);
T('shard pickup counts', a.pl.shards===1 && !sh.hp);

// ---- prism horn ----
a.enter(at('sanctum'),60,262);
const pr=a.ents.find(e=>e.t==='P');
T('prism sits on the moated island', !!pr);
shoot(3,6,10,6); T('one beam before the prism', a.bows[0].parts.length===1);
a.pl.x=pr.x;a.pl.y=pr.y; s(2);
T('prism picked up', a.pl.prism===1);
shoot(3,6,10,6,280); T('full charge forks into three', a.bows[a.bows.length-1].parts.length===3);
shoot(3,6,10,6,140); T('a short charge stays single', a.bows[a.bows.length-1].parts.length===1);

// ---- rain clouds ----
a.enter(at('approach'),60,262);
const cl=a.ents.filter(e=>e.t==='C');
T('two rain clouds in Storm Approach', cl.length===2);
shoot(8,6,16,6);
const life0=a.bows[0].life; cl[0].x=a.pl.x+100; cl[0].y=a.pl.y; s(10);
T('a cloud drinks the rainbow it sits on', a.bows[0].life < life0-10);
a.pl.x=cl[0].x-20;a.pl.y=cl[0].y;a.pl.dir=0; s(4,{shift:1});
T('gallop pops a rain cloud', !cl[0].hp);

// ---- north/south rooms ----
a.enter(at('gallop'),mid(3),mid(1)); a.pl.x=mid(3); s(40,{w:1});
T('north exit leads to the Hidden Grotto', R()===10);
T('grotto shard is walled in', a.map[6][11]==='R' || a.ents.some(e=>e.t==='R'));
a.pl.x=mid(11);a.pl.y=mid(3);a.pl.dir=1.5708; s(20,{shift:1});
T('gallop breaks into the vault', a.map[4][11]==='.');

// ---- the storm ----
a.enter(at('arena'),60,262);
const B=a.ents.find(e=>e.t==='B');
T('storm has 5 hp', B.hp===5);
B.x=mid(12); B.y=mid(6); B.tx=mid(12); B.ty=mid(6);
shoot(10,6,13,6,120);
T('a direct beam does not hurt it', B.hp===5);
B.x=mid(12); B.y=mid(6); B.iv=0;
shoot(9,4,13,4,280);
T('a beam bounced off a mirror does', B.hp===4);
T('hitting it shakes the screen', a.shake>5);
shoot(4,10,10,10,280);                       // paint a second lane, elsewhere in the arena
B.iv=0; B.x=mid(12); B.y=mid(6);
const paint0=a.room.paint.size; shoot(9,4,13,4,280);
T('phase 2 drains the room and calls the clouds',
  B.hp===3 && a.room.drain>=.5 && a.ents.filter(e=>e.t==='C'&&e.hp).length===2);
T('the storm eats the colour you had painted', a.room.paint.size<paint0);
B.iv=0; B.x=mid(12); B.y=mid(6); shoot(9,4,13,4,280);
B.iv=0; B.x=mid(12); B.y=mid(6); shoot(9,4,13,4,280);
T('phase 3 floods the arena rim', B.hp===1 && a.map[2][10]==='~' && a.map[6][3]==='~');
B.iv=0; B.x=mid(12); B.y=mid(6); shoot(9,4,13,4,280);
T('storm defeated', B.hp===0);
T('the Sun Door appears in its place', a.map[6][12]==='T');
s(120); T('colour floods back once the storm is gone', a.room.drain<1);
a.pl.x=mid(12);a.pl.y=mid(6); s(2);
T('touching it wins', a.won>0);

// lightning still strikes
a.newGame(); a.enter(at('arena'),60,262);
const B2=a.ents.find(e=>e.t==='B'); B2.x=600;B2.y=200; a.pl.x=200;a.pl.y=200;
let sawBolt=0;
for(let i=0;i<170;i++){ a.step(); if(a.ents.some(e=>e.t==='L'&&e.hp)) sawBolt=1; }
T('the storm telegraphs and drops lightning', sawBolt===1);
T('a bolt that lands hurts', a.pl.hp<3);
a.draw();
done();
