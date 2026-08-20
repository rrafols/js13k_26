/**
 * Render-equivalence check.
 *
 * Runs two builds of the game side by side under the same seeded Math.random,
 * the same synthetic key and mouse events and the same frame count, recording
 * every canvas call and property write. If they ever diverge, the byte that
 * changed behaviour is named.
 *
 *   node verify.mjs                     source bundle vs dist/bundle.js
 *   node verify.mjs a.html b.html       any two entries, html or js
 *
 * The shipped archive is roadroller-packed, which this does not run: the build
 * proves the packed payload decodes to the same program as dist/bundle.js, and
 * this proves dist/bundle.js behaves like the sources. Together that covers
 * the whole pipeline.
 */
import { readFileSync, existsSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { fileURLToPath } from 'node:url'
import { bundleEntry } from './build/bundle.mjs'

const here = p => fileURLToPath(new URL(p, import.meta.url))

/** html with <script src>, html with an inline script, or a plain .js file. */
function source (path) {
  if (path.endsWith('.js')) return readFileSync(path, 'utf8')
  const html = readFileSync(path, 'utf8')
  if (/<script\s+src=/.test(html)) return bundleEntry(path).code
  return html.split('<script>')[1].split('</script>')[0]
}

const SCENES = [
  ['title', d => d.pump(5)],
  ['story', d => { d.play('1'); d.pump(60); d.key('d'); d.pump(240) }],
  ['throw', d => {
    d.play('1'); d.pump(30); d.key('d'); d.pump(90); d.key('d', 1)
    d.down(700, 300); d.pump(60); d.up(); d.pump(60)
  }],
  ['gallop', d => { d.play('1'); d.pump(30); d.key('d'); d.key('shift'); d.pump(200) }],
  ['random', d => { d.play('3'); d.pump(150); d.key('s'); d.pump(150) }],
  ['rush', d => { d.play('4'); d.pump(200) }]
]

function run (js, scene) {
  const log = []
  const rec = tag => new Proxy({}, {
    get: (o, k) => {
      if (k === 'canvas') return {}
      if (typeof k !== 'string') return undefined
      return (...a) => log.push(`${tag}.${k}(${a.map(v =>
        typeof v === 'number' ? v.toFixed(2) : typeof v === 'object' ? '#' : String(v)).join(',')})`)
    },
    set: (o, k, v) => {
      log.push(`${tag}.${k}=${typeof v === 'number' ? v.toFixed(2) : String(v)}`)
      return true
    }
  })

  let seed = 12345
  let frame = null
  const store = {}
  const ctx = {
    console: { log () {} }, JSON, Date, setTimeout: () => {},
    Math: Object.assign(Object.create(Math), {
      random: () => (seed = seed * 48271 % 2147483647) / 2147483647
    }),
    requestAnimationFrame: f => { frame = f },
    localStorage: { get ru13 () { return store.v }, set ru13 (v) { store.v = v } },
    document: {
      getElementById: () => (ctx.__cv = {
        getContext: () => rec('m'),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 564 })
      }),
      createElement: () => ({ getContext: () => rec('w') })
    }
  }
  ctx.window = ctx
  createContext(ctx)
  runInContext(js, ctx)

  const d = {
    pump: n => { while (n-- > 0) { const f = frame; frame = null; if (!f) return; f() } },
    key: (k, up) => (up ? ctx.onkeyup : ctx.onkeydown)({ key: k, preventDefault () {} }),
    down: (x, y) => ctx.__cv.onmousedown({ clientX: x, clientY: y, preventDefault () {} }),
    up: () => ctx.onmouseup()
  }
  d.play = m => { d.key(m, 1); d.pump(2); d.key('enter', 1); d.pump(2) }   // past the intro card
  scene(d)
  return log
}

const [argA, argB] = process.argv.slice(2)
const A = argA || here('index.html')
const B = argB || here('dist/bundle.js')
if (!existsSync(B)) {
  console.log(`${B} is missing - run npm run build first`)
  process.exit(1)
}

console.log(`\n  a: ${A}\n  b: ${B}\n`)
const [ja, jb] = [source(A), source(B)]
let bad = 0
for (const [name, scene] of SCENES) {
  const la = run(ja, scene)
  const lb = run(jb, scene)
  let diff = -1
  for (let i = 0; i < Math.max(la.length, lb.length); i++) if (la[i] !== lb[i]) { diff = i; break }
  if (diff < 0) console.log(`  ${name.padEnd(8)} identical  (${la.length.toLocaleString('en-US')} draw calls)`)
  else {
    bad++
    console.log(`  ${name.padEnd(8)} \x1b[31mDIVERGES\x1b[0m at call ${diff}\n     a: ${la[diff]}\n     b: ${lb[diff]}`)
  }
}
console.log(bad ? `\n  \x1b[31m${bad} scene(s) differ\x1b[0m\n` : '\n  \x1b[32mbuilds behave identically\x1b[0m\n')
process.exit(bad ? 1 : 0)
