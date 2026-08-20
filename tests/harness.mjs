/**
 * Test harness.
 *
 * Bundles the same sources the build ships (unwrapped, so the suites can reach
 * module scope), boots them in a vm against a stub canvas, and hands back one
 * object with a getter per piece of game state. Tests therefore exercise the
 * real `step()` loop on the real sources rather than a copy.
 *
 * GAME=path/to/index.html node tests/... points it at a different entry.
 */
import { createContext, runInContext } from 'node:vm'
import { fileURLToPath } from 'node:url'
import { bundleEntry } from '../build/bundle.mjs'

const API = `;var api={
  step, draw, newGame, fire, cast, enter, gateOpen, solid, resolve, bossHit, thiefHit,
  gen, genRush, start, title, rnd32, SRC,
  get DUN(){return DUN}, get scene(){return scene}, set scene(v){scene=v},
  get mode(){return mode}, get runF(){return runF}, get best(){return best},
  get shardGoal(){return shardGoal}, get pl(){return pl}, get map(){return map},
  get room(){return room}, get rooms(){return rooms},
  get ents(){return ents}, set ents(v){ents=v},
  get bows(){return bows}, get bridged(){return bridged}, get ramped(){return ramped},
  get ps(){return ps}, get won(){return won}, get aim(){return aim}, get shake(){return shake},
  set keys(k){keys=k}, set charge(v){charge=v}
};`

/** A canvas context that swallows every call and property write. */
const stub = () => new Proxy(function () {}, {
  get: (t, k) => (k === 'canvas' ? {} : stub()),
  apply: () => stub(),
  set: () => true
})

export function load () {
  const entry = process.env.GAME || fileURLToPath(new URL('../index.html', import.meta.url))
  const { code } = bundleEntry(entry, { wrap: false })
  const store = {}
  const ctx = {
    console, Date, Math, JSON, setTimeout,
    requestAnimationFrame: () => {},
    localStorage: { get ru13 () { return store.v }, set ru13 (v) { store.v = v } },
    document: {
      getElementById: () => ({
        getContext: () => stub(),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 564 })
      }),
      createElement: () => ({ getContext: () => stub() })
    }
  }
  ctx.window = ctx
  createContext(ctx)
  runInContext(code + API, ctx)
  return ctx.api
}

/** Shared helpers: tile centre, frame pump, aim-and-throw, pass/fail count. */
export function helpers (a) {
  const TS = 40
  const mid = n => n * TS + 20
  const s = (n, k = {}) => { a.keys = k; for (let i = 0; i < n; i++) a.step() }
  const shoot = (fc, fr, tc, tr, len) => {
    a.pl.x = mid(fc); a.pl.y = mid(fr)
    a.aim.x = mid(tc); a.aim.y = mid(tr)
    a.charge = len || 280
    a.fire()
  }
  const state = { fails: 0 }
  const T = (name, ok) => {
    if (!ok) state.fails++
    console.log((ok ? 'PASS  ' : 'FAIL  ') + name)
  }
  const done = () => {
    console.log(state.fails ? state.fails + ' FAILURES' : 'all green')
    process.exit(state.fails ? 1 : 0)
  }
  return { TS, mid, s, shoot, T, done, state }
}
