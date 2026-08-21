#!/usr/bin/env node
/**
 * JS13K build pipeline.
 *
 *   index.html  ->  bundle (one IIFE)  ->  terser (DCE + mangle)
 *               ->  roadroller (optional)  ->  inlined html  ->  zip
 *
 * Both the plain-terser html and the roadroller-packed html are taken all the
 * way to an archive and the smaller one ships, because roadroller output is
 * already near entropy and deflate barely helps on top of it -- which of the
 * two wins depends on the project and changes as it grows.
 *
 * Usage: node build/build.mjs [options]
 *   --entry <path>     entry html            (default index.html)
 *   --out <dir>        output directory      (default dist)
 *   --no-props         keep property names (disables property mangling)
 *   --fast             skip the roadroller parameter search
 *   --optimize <0|1|2> roadroller search effort  (default 1)
 *   --memory <mb>      roadroller decoder memory (default 150)
 *   --no-roadroller    terser output only
 *   --no-smoke         skip the headless boot test
 *   --no-mangle        keep identifier names   (debugging the build)
 *   --no-compress      skip dead code removal  (debugging the build)
 *   --keep-comments    keep comments         (debugging the build)
 *   --keep-console     keep console.* calls
 *   --no-map           skip the byte attribution and heatmap
 *   --stats            per file source sizes
 *   --help             this text
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createContext, runInContext } from 'node:vm'
import { minify } from 'terser'
import { readEntry, bundle } from './bundle.mjs'
import { packMaps } from './rle.mjs'
import { attribute, fileRanges } from './attribute.mjs'
import { renderHeatmap } from './heatmap.mjs'
import { smoke } from './smoke.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LIMIT = 13312 // js13k budget, 13 * 1024

/* ------------------------------------------------------------------ args */

const argv = process.argv.slice(2)
const flag = name => argv.includes(`--${name}`)
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

if (flag('help')) {
  const header = readFileSync(fileURLToPath(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1]
  console.log(header.replace(/^ *\* ?/gm, ''))
  process.exit(0)
}

const OPTS = {
  entry: opt('entry', 'index.html'),
  outDir: opt('out', 'dist'),
  props: !flag('no-props'),
  fast: flag('fast'),
  memory: Number(opt('memory', 150)),
  optimize: Number(opt('optimize', 1)),
  roadroller: !flag('no-roadroller'),
  mangle: !flag('no-mangle'),
  compress: !flag('no-compress'),
  smoke: !flag('no-smoke'),
  comments: flag('keep-comments'),
  console: flag('keep-console'),
  map: !flag('no-map'),
  rle: !flag('no-rle'),
  stats: flag('stats')
}

/* ------------------------------------------------------------------ util */

const bytes = n => `${n.toLocaleString('en-US')} B`
const pct = (a, b) => `${(100 * (1 - a / b)).toFixed(1)}%`
const size = s => Buffer.byteLength(s, 'utf8')
const has = cmd => {
  try { execFileSync('which', [cmd], { stdio: 'ignore' }); return true } catch { return false }
}
const stageLog = []
const step = (name, n, note = '') => {
  stageLog.push([name, n])
  console.log(`  ${name.padEnd(22)} ${bytes(n).padStart(11)}  ${note}`)
}

/* --------------------------------------------------------- 1. minifying */

/**
 * Property names that must survive --props.
 *
 * Anything identifier-shaped that appears as a string literal is treated as a
 * key something may reach for dynamically, which is what protects lookup
 * tables keyed by name. The canvas and DOM members terser already reserves.
 */
function reservedProps (code) {
  const reserved = new Set(['webkitAudioContext', 'ru13'])
  for (const [, , body] of code.matchAll(/(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
    if (/^[A-Za-z_$][\w$]*$/.test(body)) reserved.add(body)
  }
  return [...reserved]
}

async function shrink (code) {
  const result = await minify(code, {
    sourceMap: OPTS.map && { includeSources: false },
    ecma: 2020,
    module: false,
    toplevel: true,
    compress: OPTS.compress && {
      passes: 5,
      arguments: true,
      booleans_as_integers: true,
      drop_console: !OPTS.console,
      drop_debugger: true,
      hoist_funs: true,
      keep_fargs: false,
      pure_getters: true,
      unsafe: true,
      unsafe_arrows: true,
      unsafe_comps: true,
      unsafe_math: true,
      unsafe_methods: true,
      unsafe_proto: true,
      unsafe_regexp: true,
      unsafe_undefined: true
    },
    mangle: OPTS.mangle && {
      toplevel: true,
      properties: OPTS.props && { keep_quoted: true, reserved: reservedProps(code) }
    },
    format: {
      comments: OPTS.comments ? 'all' : false,
      inline_script: true, // escapes any </script in a string literal
      wrap_func_args: false
    }
  })
  if (result.error) throw result.error
  return { code: result.code, map: result.map && JSON.parse(result.map) }
}

/* -------------------------------------------------------- 2. roadroller */

async function roadroll (js) {
  const { Packer } = await import('roadroller')
  const packer = new Packer([{ data: js, type: 'js', action: 'eval' }], { maxMemoryMB: OPTS.memory })
  if (!OPTS.fast) await packer.optimize(OPTS.optimize)

  const { firstLine, secondLine } = packer.makeDecoder()
  const out = firstLine + secondLine
  if (/<\/script/i.test(out)) throw new Error('packed payload contains </script, cannot inline')

  await verifyPacked(out, js)
  return out
}

/**
 * The packed payload is unreadable, so a corrupt one would only show up as a
 * blank canvas after shipping. The decoder hands its result to eval, so run it
 * with eval stubbed and check what comes back.
 *
 * Not a byte comparison: roadroller respaces tokens on the way in because more
 * predictable text compresses better, so the payload round trips to the same
 * program rather than the same string. Both sides go through terser's printer
 * to normalise that away.
 */
async function verifyPacked (packed, expected) {
  let decoded = null
  const ctx = createContext({
    eval: src => { decoded = src },
    TextDecoder, TextEncoder, Uint8Array,
    document: { currentScript: {}, getElementById: () => null },
    window: {}
  })
  try {
    runInContext(packed, ctx, { timeout: 30000 })
  } catch (err) {
    throw new Error(`packed payload threw while unpacking: ${err.message}`)
  }
  if (decoded === null) throw new Error('packed payload never reached eval, cannot verify')

  const reprint = async src =>
    (await minify(src, { compress: false, mangle: false, format: { comments: false } })).code
  const [a, b] = await Promise.all([reprint(decoded), reprint(expected)])
  if (a !== b) throw new Error('packed payload does not round trip')
}

/* ---------------------------------------------------------- 3. the html */

function minifyHtml (shell, js) {
  const html = shell
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style>([\s\S]*?)<\/style>/g, (_, css) => `<style>${css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}:;,])\s*/g, '$1')
      .replace(/;}/g, '}')
      .trim()}</style>`)
    .replace(/<\/?(?:html|head|body)>/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
  return html.replace('{{JS}}', `<script>${js}</script>`)
}

/* ----------------------------------------------------------- 4. the zip */

/** js13k wants a file literally named index.html at the archive root. */
function zip (html, name, outDir) {
  const stage = join(outDir, '.stage', name)
  mkdirSync(stage, { recursive: true })
  const htmlPath = join(stage, 'index.html')
  writeFileSync(htmlPath, html)

  const zipPath = join(outDir, `${name}.zip`)
  rmSync(zipPath, { force: true })
  execFileSync('zip', ['-9', '-X', '-q', '-j', zipPath, htmlPath])

  // Optional recompressors: both rewrite the archive in place with a better
  // deflate stream. Neither is required, they just buy a few dozen bytes.
  if (has('advzip')) execFileSync('advzip', ['-z', '-4', '-q', zipPath])
  else if (has('ect')) execFileSync('ect', ['-9', '-zip', zipPath])

  return { path: zipPath, n: statSync(zipPath).size, html }
}

/* ------------------------------------------------------------ pipeline */

async function main () {
  const entry = resolve(ROOT, OPTS.entry)
  const outDir = resolve(ROOT, OPTS.outDir)
  mkdirSync(outDir, { recursive: true })

  console.log(`\n\x1b[1mjs13k build\x1b[0m  ${relative(ROOT, entry)}\n`)

  const { shell, files } = readEntry(entry)
  const { code: bundled, sources } = bundle(files)

  if (OPTS.stats) {
    console.log('  sources')
    for (const s of [...sources].sort((a, b) => size(b.code) - size(a.code))) {
      console.log(`    ${relative(ROOT, s.file).padEnd(24)} ${bytes(size(s.code)).padStart(10)}`)
    }
    console.log()
  }

  const raw = size(bundled)
  step(`bundle (${files.length} files)`, raw)

  // Maps are authored as readable ASCII and packed here, not in the source.
  const { code: packed, rooms: packedRooms, saved } = OPTS.rle ? packMaps(bundled) : {code:bundled, rooms:0, saved:0}
  if (packedRooms) step('rle maps', size(packed), `${packedRooms} rooms, ${bytes(saved)} of literals`)

  const { code: min, map } = await shrink(packed)
  step('terser', size(min), `${pct(size(min), raw)} smaller${OPTS.compress ? ', dead code removed' : ' (no compress)'}`)
  writeFileSync(join(outDir, 'bundle.js'), min)

  if (OPTS.smoke) {
    const result = smoke(min)
    if (!result.ok) {
      console.error(`\n\x1b[31msmoke test failed\x1b[0m during ${result.stage}: ${result.error.message}`)
      console.error(result.error.stack.split('\n').slice(1, 4).join('\n'))
      console.error('\n  the minified bundle is at dist/bundle.js')
      console.error('  rerun with --no-props, then --no-mangle, to find what the compressor broke\n')
      process.exit(1)
    }
    step('smoke', size(min), `booted and ran ${result.frames} frames`)
  }

  // Attribution needs the map and the code it describes; the page is written
  // at the end so it can carry the final archive size too.
  let analysis = null
  if (map) {
    analysis = attribute(map, min, fileRanges(packed, files))
    const covered = (100*analysis.attributed/analysis.total).toFixed(1)
    step('attribution', analysis.attributed, `${covered}% of output mapped to source`)
  }

  const candidates = [zip(minifyHtml(shell, min), 'terser', outDir)]
  candidates[0].name = 'terser'
  step('html + zip', candidates[0].n)

  if (OPTS.roadroller) {
    if (process.stdout.isTTY && !OPTS.fast) process.stdout.write('  roadroller             searching parameters...\r')
    const packed = await roadroll(min)
    step('roadroller', size(packed), `${pct(size(packed), size(min))} smaller than terser out, verified`)
    const rr = zip(minifyHtml(shell, packed), 'roadroller', outDir)
    rr.name = 'roadroller'
    step('html + zip', rr.n)
    candidates.push(rr)
  }

  const winner = candidates.reduce((a, b) => (b.n < a.n ? b : a))
  const release = join(outDir, 'release.zip')
  rmSync(release, { force: true })
  writeFileSync(release, readFileSync(winner.path))
  writeFileSync(join(outDir, 'index.html'), winner.html)
  rmSync(join(outDir, '.stage'), { recursive: true, force: true })

  if (analysis) {
    const payload = {
      stages: stageLog.filter(([n]) => !/^(smoke|attribution|html \+ zip)$/.test(n))
        .concat([['release.zip', winner.n]]),
      limit: LIMIT, zip: winner.n, minified: size(min), attributed: analysis.attributed,
      files: analysis.files.map(f => ({
        f: relative(ROOT, f.file), b: f.bytes,
        s: f.symbols.filter(s => s.bytes > 0).map(s => [s.name, s.bytes])
      }))
    }
    writeFileSync(join(outDir, 'analysis.json'), JSON.stringify(payload))
    renderHeatmap(payload, join(outDir, 'heatmap.html'))
    console.log(`  \x1b[2mheatmap\x1b[0m  ${relative(ROOT, join(outDir, 'heatmap.html'))}`)
  }

  const left = LIMIT - winner.n
  const bar = Math.round(28 * Math.min(1, winner.n / LIMIT))
  const colour = left < 0 ? 31 : left < 1024 ? 33 : 32

  console.log(`\n  \x1b[1mrelease.zip\x1b[0m via ${winner.name}`)
  console.log(`  \x1b[${colour}m${'#'.repeat(bar)}\x1b[0m${'.'.repeat(28 - bar)}  ${bytes(winner.n)} / ${bytes(LIMIT)}`)
  console.log(left < 0
    ? `  \x1b[31mover budget by ${bytes(-left)}\x1b[0m\n`
    : `  \x1b[32m${bytes(left)} to spare\x1b[0m (${(100 * winner.n / LIMIT).toFixed(1)}% used)\n`)

  if (!has('advzip') && !has('ect')) {
    console.log('  tip: brew install advancecomp  (advzip recompresses the archive, usually 1-2% off)\n')
  }
  if (left < 0) process.exit(1)
}

main().catch(err => {
  console.error(`\n\x1b[31mbuild failed\x1b[0m ${err.message}\n`)
  process.exit(1)
})
