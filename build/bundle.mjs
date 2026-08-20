/**
 * Reads the entry html and concatenates the sources it lists.
 *
 * Every source is a classic <script> sharing one global scope, so bundling is
 * concatenation in the order index.html lists the files -- the same order the
 * browser runs them in. Wrapping the result in one IIFE is what lets terser
 * see across file boundaries and drop anything nobody calls.
 *
 * Shared by the build, the smoke test, verify.js and the test suites so they
 * all measure the same bytes.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'

/** Pulls the script list out of the entry, leaving a {{JS}} hole in the shell. */
export function readEntry (entry) {
  const html = readFileSync(entry, 'utf8')
  const base = dirname(entry)
  const tags = [...html.matchAll(/[ \t]*<script\s+src="([^"]+)"[^>]*><\/script>\n?/g)]
  if (!tags.length) throw new Error(`no <script src> tags in ${entry}`)

  const files = tags.map(m => normalize(join(base, m[1])))
  for (const f of files) if (!existsSync(f)) throw new Error(`missing source: ${f}`)

  let shell = html.replace(tags[0][0], '{{JS}}\n')
  for (const m of tags.slice(1)) shell = shell.replace(m[0], '')
  return { shell, files }
}

/** Concatenates sources into a single IIFE. Returns the code and the parts. */
export function bundle (files, { wrap = true } = {}) {
  const sources = files.map(file => ({ file, code: readFileSync(file, 'utf8') }))

  // Two files declaring the same top level name is legal across separate
  // <script> tags but a redeclaration error once concatenated, so it is
  // caught here rather than in the browser.
  const declRe = /^(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm
  const seen = new Map()
  for (const s of sources) {
    for (const [, name] of s.code.matchAll(declRe)) {
      const owner = seen.get(name)
      if (owner && owner !== s.file) {
        throw new Error(`"${name}" is declared at top level in both ${owner} and ${s.file}`)
      }
      seen.set(name, s.file)
    }
  }

  const body = sources.map(s => `/* ${s.file} */\n${s.code}`).join('\n;\n')
  return { code: wrap ? `(()=>{\n${body}\n})()\n` : body, sources }
}

/** Entry + bundle in one call, for the consumers that only want the code. */
export function bundleEntry (entry, opts) {
  const { shell, files } = readEntry(entry)
  const { code, sources } = bundle(files, opts)
  return { shell, files, code, sources }
}
