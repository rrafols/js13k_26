// Can a competent player actually clear Storm Approach with the clouds eating bridges?
import { load, helpers } from './harness.mjs'
const a = load(), { TS, mid, s, shoot, T, done, at, go } = helpers(a)
a.newGame(); a.enter(at('approach'),60,262);
const startHp=a.pl.hp;
let drowned=0, thrown=0;
a.pl.y=262;
for(let f=0; f<900; f++){
  const east = a.pl.x > 700;                       // east shore reached?
  if(east) break;
  // throw a fresh bridge whenever the tile ahead is not walkable
  const c=(a.pl.x+30)/40|0, r=a.pl.y/40|0;
  const needs = a.ents && (c>=9&&c<=16) && !a.bridged.has(c+','+r);
  if(needs && (!a.bows.length || a.bows[a.bows.length-1].life < 260)){
    a.aim.x=a.pl.x+300; a.aim.y=a.pl.y; a.charge=280; a.fire(); thrown++;
  }
  const hp0=a.pl.hp;
  a.keys={d:1, shift:f%50<3?1:0};                  // run east, gallop now and then
  a.step();
  if(a.pl.hp<hp0 && a.pl.x<200) drowned++;
}
console.log('reached x=',a.pl.x.toFixed(0),'hp',a.pl.hp,'of',startHp,'| bridges thrown',thrown,'| dunks',drowned);
console.log(a.pl.x>700 ? 'PASS  Storm Approach is clearable while clouds drink the bridges'
                       : 'FAIL  could not cross');
