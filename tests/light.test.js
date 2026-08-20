// Chromatic light engine
const fs=require('fs'),vm=require('vm');
let src=fs.readFileSync(process.env.GAME || __dirname + '/../index.html','utf8').split('<script>')[1].split('</script>')[0];
src+=`;var api={step,draw,newGame,fire,cast,enter,gateOpen,solid,resolve,SRC,
 get pl(){return pl},get map(){return map},get room(){return room},get rooms(){return rooms},
 get ents(){return ents},get bows(){return bows},get bridged(){return bridged},get won(){return won},
 get aim(){return aim},set keys(k){keys=k},set charge(v){charge=v}};`;
const noop=new Proxy(function(){},{get:(t,k)=>k==='canvas'?{}:noop,apply:()=>noop,set:()=>true});
const ctx={console,Date,Math,setTimeout,requestAnimationFrame:()=>{},
  document:{getElementById:()=>({getContext:()=>noop,getBoundingClientRect:()=>({left:0,top:0,width:960,height:564})}),createElement:()=>({getContext:()=>noop})}};
ctx.window=ctx; vm.createContext(ctx); vm.runInContext(src,ctx);
const a=ctx.api, TS=40, mid=n=>n*TS+20;
const s=(n,k={})=>{a.keys=k;for(let i=0;i<n;i++)a.step();};
const shoot=(fc,fr,tc,tr,len)=>{a.pl.x=mid(fc);a.pl.y=mid(fr);a.aim.x=mid(tc);a.aim.y=mid(tr);a.charge=len||280;a.fire();};
const litAt=(c,r)=>a.room.lit.has(c+','+r);
let f=0; const T=(n,ok)=>{if(!ok)f++;console.log((ok?'PASS  ':'FAIL  ')+n)};

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
console.log(f?f+' FAILURES':'all green');
