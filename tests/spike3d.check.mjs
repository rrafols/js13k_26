// Verify the 3D port without a GPU: run the 2025 renderer against a stub GL and
// check the scene builder emits real geometry that follows the player.
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { bundleEntry } from '/Users/rrafols/dev/js13k_26/build/bundle.mjs'

const E = '/Users/rrafols/dev/js13k_2025/engine/'
const engine = ['math/matrix.js','core/Camera.js','rendering/Renderer.js',
                'rendering/MeshBuilder.js','rendering/Mesh.js']
  .map(f => readFileSync(E + f, 'utf8')).join('\n;\n')

// GL constants have to be numbers: the engine ORs them together.
const stub = () => new Proxy(function () {}, {
  get: (t, k) => {
    if (k === 'canvas' || k === 'style') return {}
    if (typeof k === 'string' && /^[A-Z0-9_]+$/.test(k)) return 1
    if (k === Symbol.toPrimitive) return () => 1
    return stub()
  },
  apply: () => stub(), set: () => true
})
const store = {}
const ctx = {
  console: { log () {}, warn () {}, error () {} }, JSON, Date, Math, Float32Array, Uint16Array,
  setTimeout: () => {}, requestAnimationFrame: () => {}, innerWidth: 1200, innerHeight: 700,
  addEventListener: () => {},
  localStorage: { get ru13 () { return store.v }, set ru13 (v) { store.v = v } },
  document: {
    body: { appendChild: () => {} },
    getElementById: id => ({
      id, width: 0, height: 0, style: {},
      getContext: kind => kind === 'webgl' ? stub() : stub(),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 564 })
    }),
    createElement: () => ({ getContext: () => stub(), style: {} })
  }
}
ctx.window = ctx
createContext(ctx)
runInContext(engine, ctx)
runInContext(bundleEntry('/Users/rrafols/dev/js13k_26/index.html', { wrap: false }).code, ctx)
runInContext(readFileSync('/Users/rrafols/dev/js13k_26/spike/3d/render3d.js', 'utf8'), ctx)
runInContext("start('story'); scene = 'play'; enter(3, 60, 262);", ctx)

const T = (n, ok) => console.log((ok ? 'PASS  ' : 'FAIL  ') + n)
const COLS_ = () => runInContext('COLS', ctx), ROWS_ = () => runInContext('ROWS', ctx)
runInContext('draw()', ctx)
const nv = runInContext('world3.builder.nv', ctx)
T('the room becomes geometry', nv > 500)
T('within the mesh budget', nv < 60000)
console.log('  err:', runInContext('window.__err || "none"', ctx));
console.log('  eye:', runInContext('JSON.stringify(cam.position)', ctx), 'pl:', runInContext('pl.x/TS+","+pl.y/TS', ctx));
const eye = runInContext('cam.position.slice()', ctx)
T('the camera sits above and behind the unicorn',
  Math.abs(eye[0] - runInContext('pl.x/TS', ctx)) < .01 && eye[1] > 5)
runInContext("pl.x = 12*40; pl.y = 6*40; draw()", ctx)
const eye2 = runInContext('cam.position.slice()', ctx)
T('and follows when the unicorn moves', Math.abs(eye2[0] - 12) < .6 && eye2[0] !== eye[0])
// Compare like with like: the same room state, drawn with and without the
// beam. Firing also smashes pots and kills things, so a before/after count
// across the throw measures the wrong thing entirely.
runInContext("aim.x = 700; aim.y = 262; charge = 280; fire(); draw()", ctx)
const withBeam = runInContext('world3.builder.nv', ctx)
runInContext("const keep = bows; bows = []; draw(); bows = keep", ctx)
const withoutBeam = runInContext('world3.builder.nv', ctx)
console.log('   with beam', withBeam, 'without', withoutBeam,
            'segs', runInContext('bows[0].parts[0].segs.length', ctx),
            'len', runInContext('bows[0].parts[0].segs[0].len.toFixed(0)', ctx))
T('a thrown rainbow adds geometry', withBeam > withoutBeam)
runInContext("enter(5, 60, 262); draw()", ctx)   // Drained Vault: dark and different
T('another room rebuilds the scene', runInContext('world3.builder.nv', ctx) > 500)

// aiming: a click has to unproject through the camera, not use the flat 2D map
runInContext("enter(3, 60, 262); pl.x = 8*40; pl.y = 6*40; draw()", ctx)
const shoot3 = (cx, cy) => {
  runInContext(`toWorld({clientX:${cx}, clientY:${cy}})`, ctx)
  return runInContext('[aim.x/TS, aim.y/TS]', ctx)
}
const centre = shoot3(600, 350), left = shoot3(200, 350), up2 = shoot3(600, 200)
T('a click near the middle aims near the unicorn', Math.abs(centre[0] - 8) < 4)
T('clicking left aims left', left[0] < centre[0] - 1)
T('clicking higher aims further away', up2[1] < centre[1] - 1)
T('and it lands inside the room, not off in space',
  centre[0] > 0 && centre[0] < COLS_() && centre[1] > 0 && centre[1] < ROWS_())

// darkness has to be computed, since nothing else calls it now
// story is the hybrid now, so pick whatever room this run drained -- or drain one
runInContext(`
  const di = rooms.findIndex(r => r.drain > 0);
  enter(di < 0 ? 3 : di, 60, 262);
  room.drain = 1;
  pl.x = 4*40; pl.y = 6*40; aim.x = 700; aim.y = 262; charge = 280; fire(); draw();
`, ctx)
const litTiles = runInContext('[...LMAP].filter(v => v > .4).length', ctx)
T('a thrown rainbow lights the dark room it crosses', litTiles > 5)
// the preview has to exist, or you are throwing blind
runInContext("enter(3, 60, 262); pl.x = 6*40; pl.y = 6*40; charging = 0; draw()", ctx)
const quiet = runInContext('world3.builder.nv', ctx)
runInContext("charging = 1; charge = 240; aim.x = 700; aim.y = 262; draw()", ctx)
T('charging shows where the throw would land', runInContext('world3.builder.nv', ctx) > quiet + 40)

// a split beam keeps its own colour instead of drawing a rainbow
runInContext(`
  charging = 0; enter(3, 60, 262);
  pl.prism = 1; pl.pch = 3; pl.x = 6*40; pl.y = 6*40;
  aim.x = 900; aim.y = 262; charge = 280; fire(); draw();
`, ctx)
T('the horn throws three coloured beams',
  runInContext('bows[bows.length-1].parts.map(p=>p.col).sort().join("")', ctx) === '124')

// the charge ring, and a lit crystal's halo, are extra geometry -- check they appear
runInContext("charging = 0; enter(3, 60, 262); pl.x = 6*40; pl.y = 6*40; draw()", ctx)
const plain = runInContext('world3.builder.nv', ctx)
runInContext("charging = 1; charge = MAXLEN; draw()", ctx)
T('a full charge draws its ring', runInContext('world3.builder.nv', ctx) > plain + 200)
runInContext("charging = 0", ctx)

// water with a current gets crests; still water does not
runInContext("enter(3, 60, 262); room.flow = 0; draw()", ctx)
const still = runInContext('world3.builder.nv', ctx)
runInContext("room.flow = 1; draw()", ctx)
T('a flowing room shows the current', runInContext('world3.builder.nv', ctx) > still)

T('the HUD keeps the real minimap', /minimap\(\)/.test(runInContext('String(draw)', ctx)))


// A NaN in the colour buffer renders black and reports nothing, which is what
// passing 1 for MeshBuilder's shade argument did.
const bad = runInContext(`(() => {
  const mb = world3.builder, n = mb.nv * 4;
  let bad = 0;
  for(let i = 0; i < n; i++) if(!isFinite(mb.c[i])) bad++;
  return bad;
})()`, ctx)
T('every vertex colour is a real number', bad === 0)
const spread = runInContext(`(() => {
  const mb = world3.builder; let lo = 9, hi = -9;
  for(let i = 0; i < mb.nv*4; i += 4){ lo = Math.min(lo, mb.c[i]); hi = Math.max(hi, mb.c[i]) }
  return [lo, hi];
})()`, ctx)
T('and the faces are actually shaded, not flat black', spread[1] > .3 && spread[0] < spread[1])

console.log(runInContext('"verts in Gallop Hall: " + world3.builder.nv', ctx))

T('no frame threw while drawing', !runInContext('window.__err', ctx))
if(runInContext('window.__err', ctx)) console.log('   ', runInContext('window.__err', ctx))
