// Verify the firing-feel spike without a browser: run the real game against a
// recording 2D context and measure what the beam actually draws, what the
// charge actually sounds like, and - the point of a feel spike - that none of
// it changed the gameplay underneath.
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { bundleEntry } from '/Users/rrafols/dev/js13k_26/build/bundle.mjs'

// A canvas context that remembers its calls, so a drawn path can be measured.
const rec = { calls: [] }
const canvasCtx = new Proxy({}, {
  get (t, k) {
    if (k in t) return t[k]
    return (...a) => {
      rec.calls.push([k, ...a])
      if (k === 'measureText') return { width: 10 }
      if (/^create(Linear|Radial)Gradient$/.test(k)) return { addColorStop () {} }
      return undefined
    }
  },
  set (t, k, v) { t[k] = v; return true }
})
const canvas = {
  width: 960, height: 564, style: {},
  getContext: () => canvasCtx,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 564 })
}
const store = {}
const ctx = {
  console: { log () {}, warn () {}, error () {} }, JSON, Date, Math,
  setTimeout: () => {}, requestAnimationFrame: () => {},
  addEventListener: () => {}, removeEventListener: () => {},
  localStorage: { get ru13 () { return store.v }, set ru13 (v) { store.v = v } },
  document: { body: { appendChild: () => {} }, getElementById: () => canvas, createElement: () => canvas }
}
ctx.window = ctx
createContext(ctx)
runInContext(bundleEntry('/Users/rrafols/dev/js13k_26/index.html', { wrap: false }).code, ctx)
runInContext(readFileSync('/Users/rrafols/dev/js13k_26/spike/feel/feel.js', 'utf8'), ctx)

const run = src => runInContext(src, ctx)
const T = (n, ok) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + n); if (!ok) process.exitCode = 1 }

// Silence the real oscillator path and record what would have been played.
run('const sndLog = []; snd = (f, d, type, vol, to) => sndLog.push({f, d, type, vol, to})')
run("start('story'); scene = 'play'; enter(3, 60, 262)")

/** Total length of every stroked polyline drawn since the last reset. */
function drawnLength (js) {
  rec.calls.length = 0
  run(js)
  let px = 0, py = 0, sum = 0
  for (const [op, a, b] of rec.calls) {
    if (op === 'moveTo') { px = a; py = b }
    else if (op === 'lineTo') { sum += Math.hypot(a - px, b - py); px = a; py = b }
  }
  return sum
}

// ---------- 2: the arc travels ----------
run("ps = []; aim.x = 900; aim.y = 262; charge = MAXLEN; charging = 1; fire(); charging = 0")
T('firing tags the bow so it can grow', run('bows[bows.length-1].front') === 0)
T('and measures each part of the path', run('bows[bows.length-1].parts.every(p => p.tot > 0)'))

const full = run('bows[bows.length-1].parts.reduce((n,p) => n + p.tot, 0)')
run('step()')
const frame1 = drawnLength('g = gm; drawBow(bows[bows.length-1])')
for (let i = 0; i < 3; i++) run('step()')
const frame4 = drawnLength('g = gm; drawBow(bows[bows.length-1])')
for (let i = 0; i < 14; i++) run('step()')
const settled = drawnLength('g = gm; drawBow(bows[bows.length-1])')
console.log(`   path ${full.toFixed(0)}px  drawn: frame1 ${frame1.toFixed(0)} frame4 ${frame4.toFixed(0)} settled ${settled.toFixed(0)}`)
T('the first frame draws only the start of the arc', frame1 > 0 && frame1 < settled*.45)
T('it is further along a few frames later', frame4 > frame1*1.8)
T('and reaches full length', settled > frame4 && settled > full*7)   // 7 bands + a glow per segment

// ---------- the gameplay underneath must not move ----------
const bridgedWith = run("enter(1, 60, 262); FEEL.on = 1; aim.x = 900; aim.y = 262; charge = MAXLEN; fire(); [...bridged].sort().join('|')")
const bridgedWithout = run("enter(1, 60, 262); FEEL.on = 0; aim.x = 900; aim.y = 262; charge = MAXLEN; fire(); [...bridged].sort().join('|')")
T('bridging is identical with the feel on and off', bridgedWith === bridgedWithout)
T('and a throw really does bridge something here', bridgedWith.length > 0)

// ---------- 1: the horn points at the throw ----------
run("FEEL.on = 1; enter(3, 60, 262); ps = []; pl.dir = Math.PI; aim.x = pl.x + 300; aim.y = pl.y; fire()")
T('the unicorn turns to face the throw', Math.abs(run('pl.dir')) < .01)
const spray = run('ps.slice(0, 12).reduce((n,p) => n + p.x, 0)/12 - pl.x')
T('and the muzzle spray leaves on the side it is aiming at', spray > 8)

run("ps = []; pl.dir = 0; aim.x = pl.x - 300; aim.y = pl.y; fire()")
const back = run('ps.slice(0, 12).reduce((n,p) => n + p.x, 0)/12 - pl.x')
console.log(`   spray offset: aiming right ${spray.toFixed(1)}px, aiming left ${back.toFixed(1)}px`)
T('including a throw aimed behind it', back < -8)

// ---------- 3: the wind-up has a voice ----------
run("sndLog.length = 0; charging = 1; charge = MINLEN")
for (let i = 0; i < 50; i++) run('step()')
const hum = run('sndLog.filter(s => s.d === .07).map(s => s.f)')
console.log(`   ${hum.length} charge tones, ${hum[0]}Hz -> ${hum[hum.length-1]}Hz`)
T('charging is no longer silent', hum.length >= 8)
T('and its pitch climbs with the charge', hum[hum.length-1] > hum[0] + 300)
T('the tones rise monotonically', hum.every((f, i) => i === 0 || f >= hum[i-1]))
T('a chime marks the horn filling, exactly once', run('sndLog.filter(s => s.f === 1180).length') === 1)
run('charging = 0')

// ---------- 4: release scales with charge ----------
run("shake = 0; charge = MINLEN; fire()")
const flick = run('shake')
run("shake = 0; charge = MAXLEN; fire()")
const heave = run('shake')
console.log(`   shake: flick ${flick.toFixed(1)}, full throw ${heave.toFixed(1)}`)
T('a full throw kicks harder than a flick', heave > flick*1.6 && flick > 0)
T('and sounds heavier', run('sndLog.filter(s => s.type === "triangle" && s.f < 220).length') > 0)

const before = run('[pl.x, pl.y].join()')
run('draw()')
T('recoil never moves the unicorn for real', run('[pl.x, pl.y].join()') === before)
T('the recoil does decay away', run('pl.rec > 0 && (pl.rec = .4) < 1'))

// ---------- 5: the beam lands ----------
run("enter(3, 60, 262); ps = []; aim.x = 900; aim.y = 262; charge = MAXLEN; fire()")
const psAtFire = run('ps.length')
let burst = 0
for (let i = 0; i < 12; i++) { run('step()'); const n = run('ps.length'); if (n > burst) burst = n }
console.log(`   particles: ${psAtFire} at release, ${burst} peak after the arc landed`)
T('something happens where the beam stops', burst > psAtFire)
T('and it only happens once per part', run('bows[bows.length-1].parts.every(p => p.hit === 1)'))

// ---------- off means off ----------
run("FEEL.on = 0; enter(3, 60, 262); charge = MAXLEN; aim.x = 900; aim.y = 262; fire()")
T('with the feel off the bow is untouched', run('bows[bows.length-1].front') === undefined)
const offLen = drawnLength('g = gm; drawBow(bows[bows.length-1])')
T('and the arc is whole on the first frame', offLen > settled*.9)
run('FEEL.on = 1')

// ---------- nothing throws ----------
let err = ''
try {
  run("enter(3, 60, 262); charging = 1; charge = MINLEN")
  for (let i = 0; i < 40; i++) run('step(); draw()')
  run('charging = 0; fire()')
  for (let i = 0; i < 40; i++) run('step(); draw()')
} catch (e) { err = e.message }
T('no frame threw while charging, firing and fading', err === '')
if (err) console.log('   ' + err)
