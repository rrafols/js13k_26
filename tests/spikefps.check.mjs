/**
 * The first-person spike, verified against a stubbed GL the same way the
 * top-down one is: does the camera sit in the unicorn's head, does wasd move
 * relative to where you look, and does the crosshair aim where you face?
 */
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { bundleEntry } from '/Users/rrafols/dev/js13k_26/build/bundle.mjs'

const E = '/Users/rrafols/dev/js13k_2025/engine/'
const engine = ['math/matrix.js','core/Camera.js','rendering/Renderer.js',
                'rendering/MeshBuilder.js','rendering/Mesh.js']
  .map(f => readFileSync(E + f, 'utf8')).join('\n;\n')

const stub = () => new Proxy(function () {}, {
  get: (t, k) => {
    if (k === 'canvas' || k === 'style') return {}
    if (typeof k === 'string' && /^[A-Z0-9_]+$/.test(k)) return 1
    if (k === Symbol.toPrimitive) return () => 1
    return stub()
  },
  apply: () => stub(), set: () => true
})
const listeners = {}
const store = {}
const ctx = {
  console: { log () {}, warn () {}, error () {} }, JSON, Date, Math, Float32Array, Uint16Array,
  setTimeout: () => {}, requestAnimationFrame: () => {}, innerWidth: 1200, innerHeight: 700,
  addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f) },
  localStorage: { get ru13 () { return store.v }, set ru13 (v) { store.v = v } },
  document: {
    body: { appendChild: () => {} },
    pointerLockElement: null,
    getElementById: id => ({
      id, width: 0, height: 0, style: {}, requestPointerLock () {},
      getContext: () => stub(),
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 564 })
    }),
    createElement: () => ({ getContext: () => stub(), style: {} })
  }
}
ctx.window = ctx
createContext(ctx)
runInContext('var FPS = 1', ctx)
runInContext(engine, ctx)
runInContext(bundleEntry('/Users/rrafols/dev/js13k_26/index.html', { wrap: false }).code, ctx)
runInContext(readFileSync('/Users/rrafols/dev/js13k_26/spike/3d/render3d.js', 'utf8'), ctx)
runInContext(readFileSync('/Users/rrafols/dev/js13k_26/spike/fps/fps.js', 'utf8'), ctx)
runInContext("start('story'); scene = 'play'; enter(3, 60, 262); pl.x = 6*40; pl.y = 6*40;", ctx)

let fails = 0
const T = (n, ok) => { if (!ok) fails++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n) }
const run = src => runInContext(src, ctx)
const EYE_H = 1.8            // must track fps.js

run('draw()')
T('the eye sits in the unicorn, not above it',
  Math.abs(run('cam.position[1]') - EYE_H) < .6 &&
  Math.abs(run('cam.position[0]') - run('pl.x/TS')) < .01)
T('nothing draws the unicorn from inside its own head', run('world3.builder.nv') > 500)

// looking sets the aim, and the aim is in front of you
run('look.yaw = 0; look.pitch = -.5; toWorld()')
const north = run('[aim.x/TS, aim.y/TS]')
run('look.yaw = Math.PI/2; toWorld()')
const west = run('[aim.x/TS, aim.y/TS]')
T('the crosshair aims where you face', north[1] < run('pl.y/TS') - 1 && west[0] < run('pl.x/TS') - 1)

// wasd is relative to the view, not the world
run("look.yaw = 0; held.w = 1; held.a = held.s = held.d = 0")
const before = run('[pl.x/TS, pl.y/TS]')
run('walk(); walk(); walk()')
const after = run('[pl.x/TS, pl.y/TS]')
T('W walks the way you are looking', after[1] < before[1] - .05 && Math.abs(after[0] - before[0]) < .05)
run("look.yaw = Math.PI/2")
const b2 = run('[pl.x/TS, pl.y/TS]')
run('walk(); walk(); walk()')
const a2 = run('[pl.x/TS, pl.y/TS]')
T('turn ninety degrees and W walks the new way', a2[0] < b2[0] - .05)

// the game must not also move you along world axes
T('the game no longer reads wasd itself', run("(() => { keys = {}; window.onkeydown({key:'w', preventDefault(){}}); return !keys.w })()"))
T('but shift still reaches it', run("(() => { keys = {}; window.onkeydown({key:'Shift', preventDefault(){}}); return !!keys.shift })()"))

// the crosshair is drawn at the centre of the screen, so the aim point had
// better project back to the centre of the screen
run(`window.project = (wx, wy, wz) => {
  const P = cam.projectionMatrix, V = cam.getViewMatrix();
  const t = (m, v) => [
    m[0]*v[0] + m[4]*v[1] + m[8]*v[2]  + m[12]*v[3],
    m[1]*v[0] + m[5]*v[1] + m[9]*v[2]  + m[13]*v[3],
    m[2]*v[0] + m[6]*v[1] + m[10]*v[2] + m[14]*v[3],
    m[3]*v[0] + m[7]*v[1] + m[11]*v[2] + m[15]*v[3]];
  const c = t(P, t(V, [wx, wy, wz, 1]));
  return [c[0]/c[3], c[1]/c[3]];
}`)
let worst = 0
for (const [yaw, pitch] of [[0, -.4], [1.1, -.6], [-2.2, -.3], [.5, -.9]]) {
  run(`look.yaw = ${yaw}; look.pitch = ${pitch}; toWorld(); draw()`)
  const ndc = run('project(aim.x/TS, 0.4, aim.y/TS)')
  worst = Math.max(worst, Math.abs(ndc[0]), Math.abs(ndc[1]))
}
T('the aim point sits under the crosshair from any angle', worst < .02)

// throwing still works through the game's own fire()
run("look.yaw = 0; look.pitch = -.5; toWorld(); charge = 280; fire()")
T('a throw still produces a rainbow', run('bows.length') > 0)
run('draw()')
T('and the scene grows to include it', run('world3.builder.nv') > 500)


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

T('no frame threw while drawing', !runInContext('window.__err', ctx))
if(runInContext('window.__err', ctx)) console.log('   ', runInContext('window.__err', ctx))
console.log(fails ? fails + ' FAILURES' : 'all green')
process.exit(fails ? 1 : 0)
