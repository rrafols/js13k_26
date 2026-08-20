// Render-equivalence check for build.py.
//
// Runs index.html and dist/index.html side by side under the same seeded
// Math.random, the same synthetic key/mouse events and the same frame count,
// recording every canvas call and property set. If the packer changed
// behaviour anywhere, the two logs diverge and this fails. No browser needed.
const fs = require('fs'), vm = require('vm'), path = require('path');

const HERE = __dirname;
const SCENES = [
  ['title',  d => d.pump(5)],
  ['story',  d => { d.key('1', 1); d.pump(60); d.key('d'); d.pump(240); }],
  ['throw',  d => { d.key('1', 1); d.pump(30); d.key('d'); d.pump(90); d.key('d', 1);
                    d.down(700, 300); d.pump(60); d.up(); d.pump(60); }],
  ['gallop', d => { d.key('1', 1); d.pump(30); d.key('d'); d.key('shift'); d.pump(200); }],
  ['random', d => { d.key('3', 1); d.pump(150); d.key('s'); d.pump(150); }],
  ['rush',   d => { d.key('4', 1); d.pump(200); }],
];

function run(file, scene){
  const html = fs.readFileSync(file, 'utf8');
  const js = html.split('<script>')[1].split('</script>')[0];
  const log = [];
  const rec = tag => new Proxy({}, {
    get: (o, k) => {
      if(k === 'canvas') return {};
      if(typeof k !== 'string') return undefined;
      return (...a) => { log.push(tag + '.' + k + '(' + a.map(v =>
        typeof v === 'number' ? v.toFixed(2) : typeof v === 'object' ? '#' : String(v)).join(',') + ')'); };
    },
    set: (o, k, v) => {
      log.push(tag + '.' + k + '=' + (typeof v === 'number' ? v.toFixed(2) : String(v)));
      return true;
    },
  });
  let seed = 12345, frame = null;
  const store = {};
  const ctx = {
    console: {log(){}}, JSON, Date, setTimeout: () => {},
    Math: Object.assign(Object.create(Math), { random: () => (seed = seed*48271 % 2147483647)/2147483647 }),
    requestAnimationFrame: f => { frame = f; },
    localStorage: { get ru13(){ return store.v; }, set ru13(v){ store.v = v; } },
    document: {
      getElementById: () => (ctx.__cv = { getContext: () => rec('m'),
                                          getBoundingClientRect: () => ({left:0, top:0, width:960, height:564}) }),
      createElement: () => ({ getContext: () => rec('w') }),
    },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(js, ctx);
  const ev = k => ({ key: k, preventDefault(){} });
  const driver = {
    pump: n => { while(n-- > 0){ const f = frame; frame = null; if(!f) return; f(); } },
    key: (k, up) => (up ? ctx.onkeyup : ctx.onkeydown)(ev(k)),
    down: (x, y) => ctx.__cv.onmousedown({clientX:x, clientY:y, preventDefault(){}}),
    up: () => ctx.onmouseup(),
  };
  scene(driver);
  return log;
}

let bad = 0;
const a = path.join(HERE, 'index.html'), b = path.join(HERE, 'dist', 'index.html');
if(!fs.existsSync(b)){ console.log('run build.py first'); process.exit(1); }
for(const [name, scene] of SCENES){
  const la = run(a, scene), lb = run(b, scene);
  let diff = -1;
  for(let i = 0; i < Math.max(la.length, lb.length); i++) if(la[i] !== lb[i]){ diff = i; break; }
  if(diff < 0) console.log(`${name.padEnd(8)} identical  (${la.length} draw calls)`);
  else {
    bad++;
    console.log(`${name.padEnd(8)} DIVERGES at call ${diff}\n   src : ${la[diff]}\n   dist: ${lb[diff]}`);
  }
}
console.log(bad ? bad + ' scene(s) differ' : 'packed build matches the source exactly');
process.exit(bad ? 1 : 0);
