/**
 * Headless boot test for a built bundle.
 *
 * The build runs terser's unsafe compress options and mangles property names,
 * both of which break code at runtime rather than at parse time. This boots
 * the bundle against a stubbed canvas, walks the menu into a real run, throws
 * a rainbow, gallops, and pumps frames -- so a broken build fails here instead
 * of as a blank canvas in the browser.
 *
 * It proves the code runs, not that it draws the right thing. verify.js is
 * the one that compares output.
 */
import { createContext, runInContext } from 'node:vm'

/** A canvas context that accepts every call and every property write. */
function context2d () {
  return new Proxy({}, {
    get: (o, k) => (k === 'canvas' ? {} : typeof k === 'symbol' ? undefined : () => {}),
    set: () => true
  })
}

export function smoke (js, { frames = 400 } = {}) {
  let frame = null
  const store = {}
  const stage = { at: 'boot' }
  const ctx = {
    console: { log () {}, warn () {}, error () {} },
    JSON,
    Date,
    Math,
    setTimeout: () => {},
    requestAnimationFrame: f => { frame = f },
    localStorage: { get ru13 () { return store.v }, set ru13 (v) { store.v = v } },
    document: {
      getElementById: () => (ctx.__cv = {
        getContext: () => context2d(),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 564 })
      }),
      createElement: () => ({ getContext: () => context2d() })
    }
  }
  ctx.window = ctx
  createContext(ctx)

  const pump = n => { while (n-- > 0) { const f = frame; frame = null; if (!f) return 0; f() } return 1 }
  const key = (k, up) => (up ? ctx.onkeyup : ctx.onkeydown)({ key: k, preventDefault () {} })
  const play = m => { key(m, 1); pump(2); key('enter', 1); pump(2) }   // mode, then past the intro

  try {
    stage.at = 'parse'
    runInContext(js, ctx, { timeout: 20000 })

    stage.at = 'title'
    if (!ctx.onkeyup || !ctx.__cv) throw new Error('game never installed its input handlers')
    pump(5)

    // menu -> story, walk, charge and throw, gallop, then the generator
    stage.at = 'story'
    play('1'); pump(30)
    stage.at = 'walk'
    key('d'); pump(60); key('d', 1)
    stage.at = 'throw'
    ctx.__cv.onmousedown({ clientX: 700, clientY: 300, preventDefault () {} })
    pump(40); ctx.onmouseup(); pump(40)
    stage.at = 'gallop'
    key('d'); key('shift'); pump(60); key('shift', 1); key('d', 1)
    stage.at = 'generated run'
    key('escape', 1); pump(2); play('3'); pump(frames)
    stage.at = 'boss rush'
    key('escape', 1); pump(2); play('4'); pump(120)
  } catch (error) {
    return { ok: false, stage: stage.at, error }
  }
  return { ok: true, frames }
}
