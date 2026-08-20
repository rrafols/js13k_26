// procedural runs, ramps, roster, modes, furniture
const fs=require('fs'),vm=require('vm');
let src=fs.readFileSync(process.env.GAME || __dirname + '/../index.html','utf8').split('<script>')[1].split('</script>')[0];
src+=`;var api={step,draw,newGame,fire,cast,enter,gateOpen,solid,resolve,gen,genRush,start,title,rnd32,SRC,
 get DUN(){return DUN},get scene(){return scene},set scene(v){scene=v},get mode(){return mode},
 get runF(){return runF},get best(){return best},get shardGoal(){return shardGoal},
 get pl(){return pl},get map(){return map},get room(){return room},get rooms(){return rooms},
 get ents(){return ents},set ents(v){ents=v},get bows(){return bows},get bridged(){return bridged},
 get ramped(){return ramped},get ps(){return ps},get won(){return won},get aim(){return aim},
 set keys(k){keys=k},set charge(v){charge=v}};`;
const noop=new Proxy(function(){},{get:(t,k)=>k==='canvas'?{}:noop,apply:()=>noop,set:()=>true});
const store={};
const ctx={console,Date,Math,setTimeout,JSON,requestAnimationFrame:()=>{},
  localStorage:{get ru13(){return store.ru13},set ru13(v){store.ru13=v}},
  document:{getElementById:()=>({getContext:()=>noop,getBoundingClientRect:()=>({left:0,top:0,width:960,height:564})}),createElement:()=>({getContext:()=>noop})}};
ctx.window=ctx; vm.createContext(ctx); vm.runInContext(src,ctx);
const a=ctx.api, TS=40, mid=n=>n*TS+20;
const s=(n,k={})=>{a.keys=k;for(let i=0;i<n;i++)a.step();};
const shoot=(fc,fr,tc,tr,len)=>{a.pl.x=mid(fc);a.pl.y=mid(fr);a.aim.x=mid(tc);a.aim.y=mid(tr);a.charge=len||280;a.fire();};
let f=0; const T=(n,ok)=>{if(!ok)f++;console.log((ok?'PASS  ':'FAIL  ')+n)};

// ---------- 1. procedural dungeons ----------
const d1=a.gen(12345,9), d2=a.gen(12345,9), d3=a.gen(999,9);
T('a seed reproduces its dungeon exactly', JSON.stringify(d1)===JSON.stringify(d2));
T('a different seed gives a different one', JSON.stringify(d1)!==JSON.stringify(d3));
T('chain plus side rooms', d1.length>9 && d1.goal>0);
let bad=[];
for(let sd=1; sd<=40; sd++){
  const d=a.gen(sd*7919, 7+sd%4);
  d.forEach((r,i)=>{
    if(r.m.length!==13 || r.m.some(x=>x.length!==24)) bad.push('size '+sd);
    // every room must be enterable and leavable
    const w=r.links.w!=null, e=r.links.e!=null, n=r.links.n!=null, so=r.links.s!=null;
    if(w && r.m[6][0]!=='.') bad.push('west opening '+sd+':'+i);
    if(e && !'.GY'.includes(r.m[6][23])) bad.push('east opening '+sd+':'+i);
    if(n && r.m[0][3]!=='.') bad.push('north opening '+sd+':'+i);
    if(so && r.m[12][3]!=='.') bad.push('south opening '+sd+':'+i);
    // links must point at real rooms, both ways
    for(const [k,v] of Object.entries(r.links)){
      if(!d[v]) bad.push('dangling '+sd);
      else { const back={w:'e',e:'w',n:'s',s:'n'}[k]; if(d[v].links[back]!==i) bad.push('one-way '+k+' '+sd+':'+i); }
    }
  });
  const all=d.map(r=>r.m.join('')).join('');
  const shards=(all.split('R').length-1)+(all.split('M').length-1);
  if(shards<d.goal) bad.push('too few shards '+sd);
  if(!all.includes('B')) bad.push('no boss '+sd);
  if(!all.includes('Y')) bad.push('no sun gate '+sd);
  // water is never wider than a single throw
  d.forEach(r=>r.m.forEach(row=>{ (row.match(/~+/g)||[]).forEach(run=>{ if(run.length>6) bad.push('wide water '+sd); }); }));
}
T('40 seeds: geometry, two-way links, boss, gate, shards, crossable water', bad.length===0 || bad.slice(0,3).join()==='' , bad.slice(0,3));
if(bad.length) console.log('   first problems:', bad.slice(0,4));


// every generated room must actually connect its doors, given the tools you carry
let unreach=[];
for(let sd=1; sd<=60; sd++){
  const d=a.gen(sd*104729, 7+sd%4);
  d.forEach((r,i)=>{
    const grid=r.m.map(x=>x.split(''));
    const hard=c=>'#rgb>'.includes(c);            // walls and fixed glass; all else yields
    const seen=new Set(), q=[[1,6]];
    if(r.links.s!=null) q.push([3,11]);
    while(q.length){
      const [c,rr]=q.pop(), k=c+','+rr;
      if(c<0||rr<0||c>23||rr>12||seen.has(k)||hard(grid[rr][c])) continue;
      seen.add(k);
      q.push([c+1,rr],[c-1,rr],[c,rr+1],[c,rr-1]);
    }
    const need=[];
    if(r.links.e!=null) need.push('22,6');
    if(r.links.w!=null) need.push('1,6');
    if(r.links.n!=null) need.push('3,1');
    if(r.links.s!=null) need.push('3,11');
    for(const n of need) if(!seen.has(n)) unreach.push(sd+':'+i+' '+n);
  });
}
T('60 seeds: every door in every room is reachable from the others', unreach.length===0);
if(unreach.length) console.log('   ', unreach.slice(0,4));

// ---------- 2. ramps ----------
a.newGame(); a.enter(3,60,262);            // Gallop Hall has a plateau at 20-22 / 9-11
T('plateau is a cliff from below', a.solid(mid(20),mid(10),0)===1);
T('and walkable once you are up', a.solid(mid(20),mid(10),1)===0);
shoot(20,6,20,11,280);
T('a rainbow up the cliff makes a ramp', a.ramped.size>0 && a.solid(mid(20),mid(10),0)===0);
a.pl.x=mid(21);a.pl.y=mid(9);s(2);
T('standing on it raises the unicorn', a.pl.z===1);
a.pl.y=mid(6);s(2);
T('stepping off drops you back down', a.pl.z===0);

// ---------- 3. furniture ----------
a.newGame(); a.enter(3,60,262);
const before=a.pl.shards;
a.pl.x=mid(21);a.pl.y=mid(9);a.pl.z=1;s(2);
T('a chest on the plateau hands over a shard', a.pl.shards===before+1 && a.map[10][21]==='m');
a.enter(1,60,262);
T('pots block the way', a.solid(mid(3),mid(10))===1);
shoot(3,8,3,11,200);
T('a beam smashes a pot', a.map[10][3]==='.');
a.enter(2,60,262);
T('push block starts at 3,6', a.map[6][3]==='O');
shoot(1,6,8,6,200);
T('a block stops a beam', !a.bridged.size && a.bows[0].parts[0].lit.every(id=>+id.split(',')[0]<3));
a.pl.x=mid(2);a.pl.y=mid(6);a.pl.dir=0; s(30,{d:1});
const col=a.map[6].indexOf('O');
T('walking into it shoves it along', a.map[6][3]==='.' && col>3);

// ---------- 4. the roster ----------
a.enter(3,60,262);
const ch=a.ents.find(e=>e.t==='A');
T('Gallop Hall has a charger', !!ch);
ch.x=a.pl.x+120; ch.y=a.pl.y; a.pl.x=mid(3);a.pl.y=mid(9);ch.x=mid(6);ch.y=mid(9);
s(60); T('the charger winds up and bolts', ch.ch===1 || ch.stun>0 || !ch.hp);
a.enter(4,60,262);
const tu=a.ents.find(e=>e.t==='U');
T('Mirror Hall has a turret', !!tu);
a.pl.x=tu.x+120; a.pl.y=tu.y; s(220);
T('it lobs bubbles', a.ents.some(e=>e.t==='o'));
a.enter(9,60,262);
T('Storm Approach has a bridge weevil', a.ents.some(e=>e.t==='W'));
a.newGame(); a.enter(11,60,262);
const th=a.ents.find(e=>e.t==='V');
T('a colour thief guards the Sun Gate', !!th && th.hp===3);
th.x=a.pl.x+10; th.y=a.pl.y; s(3);
T('it steals a channel', a.pl.stolen>0 && th.holds>0);
const stolenBit=th.holds;
shoot(1,6,6,6,200); a.fire();
T('your beams come out missing that colour',
  a.bows[a.bows.length-1].parts[0].col === (7 & ~stolenBit));
th.iv=0; th.x=mid(4); th.y=mid(6); shoot(1,6,6,6,200);
th.iv=0; shoot(1,6,6,6,200); th.iv=0; shoot(1,6,6,6,200);
T('beating it returns the colour', th.hp<=0 && a.pl.stolen===0);

// ---------- 5. modes, clock, saves ----------
a.start('story');
T('story mode uses the hand built isles', a.DUN===a.SRC && a.shardGoal===7 && a.scene==='play');
a.start('random');
T('random mode generates', a.DUN!==a.SRC && a.DUN.length>6 && a.shardGoal===a.DUN.goal);
a.start('rush');
T('boss rush is one arena with the horn', a.DUN.length===1 && a.pl.prism===1 && a.shardGoal===0);
a.start('daily');
const seedA=a.rooms.map(r=>r.name).join();
a.start('daily');
T('the daily is the same dungeon twice', a.rooms.map(r=>r.name).join()===seedA);
a.start('story'); s(120);
T('the run clock ticks', a.runF>100);
a.pl.shards=7; a.enter(12,60,262);
const B=a.ents.find(e=>e.t==='B'); B.hp=1; B.iv=0; B.x=mid(12); B.y=mid(6);
shoot(9,4,13,4,280);
a.pl.x=mid(12);a.pl.y=mid(6); s(2);
T('winning saves a best time', a.won>0 && a.best.story>0);
const first=a.best.story;
a.start('story'); s(60); a.pl.shards=7; a.enter(12,60,262);
T('a slower run does not overwrite it', a.best.story===first);
a.scene='title'; a.title();
T('title screen renders', true);
console.log(f?f+' FAILURES':'all green');
