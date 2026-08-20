const fs=require('fs'),vm=require('vm');
let src=fs.readFileSync(process.env.GAME || __dirname + '/../index.html','utf8').split('<script>')[1].split('</script>')[0];
src+=`;var api={step,draw,newGame,fire,cast,enter,gateOpen,solid,
 get pl(){return pl},get map(){return map},get room(){return room},get rooms(){return rooms},
 get ents(){return ents},get bows(){return bows},get bridged(){return bridged},get ps(){return ps},
 get won(){return won},get aim(){return aim},set keys(k){keys=k},set charge(v){charge=v}};`;
const noop=new Proxy(function(){},{get:(t,k)=>k==='canvas'?{}:noop,apply:()=>noop,set:()=>true});
const ctx={console,Date,Math,setTimeout,requestAnimationFrame:()=>{},
  document:{getElementById:()=>({getContext:()=>noop,getBoundingClientRect:()=>({left:0,top:0,width:960,height:564})}),
            createElement:()=>({getContext:()=>noop})}};
ctx.window=ctx; vm.createContext(ctx); vm.runInContext(src,ctx);
const a=ctx.api, TS=40, mid=n=>n*TS+20;
const s=(n,k={})=>{a.keys=k;for(let i=0;i<n;i++)a.step();};
const shoot=(fromC,fromR,toC,toR,len)=>{a.pl.x=mid(fromC);a.pl.y=mid(fromR);a.aim.x=mid(toC);a.aim.y=mid(toR);a.charge=len||280;a.fire();};
const room=()=>a.rooms.indexOf(a.room);
let fails=0; const T=(n,ok)=>{if(!ok)fails++;console.log((ok?'PASS  ':'FAIL  ')+n)};

a.newGame();
T('starts in Rainbow Falls', a.rooms.length===13 && a.room.name==='Rainbow Falls');

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
console.log(fails? fails+' FAILURES':'all green');
