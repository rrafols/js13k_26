/**
 * Attributes bytes of the minified bundle back to the source that produced them.
 *
 * Terser emits a source map from its output to the bundle it was handed. The
 * bundle keeps a `/* path *\/` marker comment in front of each file, so a
 * bundle line resolves to a file, and within that file to the nearest symbol
 * declared above it. Walking the map's segments in output order gives each
 * span of output bytes an owner.
 *
 * The result is the real cost of a thing after dead code removal and inlining,
 * which is usually nothing like the size of the source that produced it.
 */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** Decodes one line of base64 VLQ source map segments. */
function decodeSegments (line) {
  const segments = []
  for (const part of line.split(',')) {
    if (!part) continue
    const values = []
    let shift = 0
    let value = 0
    for (const ch of part) {
      const digit = B64.indexOf(ch)
      if (digit < 0) break
      value += (digit & 31) << shift
      if (digit & 32) {
        shift += 5
      } else {
        values.push(value & 1 ? -(value >> 1) : value >> 1)
        shift = 0
        value = 0
      }
    }
    segments.push(values)
  }
  return segments
}

/**
 * Line ranges for each source file, found from the marker comments the bundler
 * leaves behind. Markers are located after preprocessing, so the ranges line up
 * with what terser actually saw.
 */
export function fileRanges (bundleCode, files) {
  const lines = bundleCode.split('\n')
  const marks = []
  for (const file of files) {
    const idx = lines.findIndex(l => l.trim() === `/* ${file} */`)
    if (idx >= 0) marks.push({ file, start: idx + 1 })
  }
  marks.sort((a, b) => a.start - b.start)
  return marks.map((m, i) => ({
    ...m,
    end: i + 1 < marks.length ? marks[i + 1].start - 1 : lines.length,
    lines
  }))
}

/**
 * Symbols within one file's slice of the bundle: top level declarations plus
 * the methods of the object literals the game is built from (`HUD.draw`,
 * `MAP.generate`). Indentation is the only signal available for the latter, so
 * this is a heuristic and deliberately shallow.
 */
function symbolsIn (lines, start, end) {
  const found = []
  for (let i = start; i < end; i++) {
    const line = lines[i] ?? ''
    let m
    if ((m = line.match(/^(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/))) {
      found.push({ line: i, name: m[1], top: true })
    } else if ((m = line.match(/^([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*=/))) {
      // Namespaced assignment at column zero: `MODELS.portal = function ...`,
      // `SH.WORLD_FS = \`...\``. Without this the whole namespace reads as one
      // symbol, which is useless for the biggest files in the game.
      found.push({ line: i, name: `${m[1]}.${m[2]}`, top: true })
    } else if ((m = line.match(/^ {2}(?:static\s+|get\s+|set\s+|async\s+)?([A-Za-z_$][\w$]*)\s*\(/))) {
      if (!/^(if|for|while|switch|catch|return|else)$/.test(m[1])) found.push({ line: i, name: m[1] })
    } else if ((m = line.match(/^ {2}([A-Za-z_$][\w$]*):\s*(?:function)?\s*\(/))) {
      found.push({ line: i, name: m[1] })
    }
  }
  return found
}

/**
 * @param map    terser's source map, parsed
 * @param code   the minified output the map describes
 * @param ranges output of fileRanges
 * @returns { files: [{file, bytes, symbols:[{name, bytes}]}], attributed, total }
 */
export function attribute (map, code, ranges) {
  const outLines = code.split('\n')
  const owners = new Map() // bundle line -> bytes of output

  let srcLine = 0
  for (const [genLineIdx, mappingLine] of map.mappings.split(';').entries()) {
    const segments = decodeSegments(mappingLine)
    let genCol = 0
    const lineText = outLines[genLineIdx] ?? ''

    segments.forEach((seg, i) => {
      genCol += seg[0]
      if (seg.length >= 4) srcLine += seg[2]

      // This segment owns output up to the next segment, or end of line.
      const nextCol = i + 1 < segments.length ? genCol + segments[i + 1][0] : lineText.length
      const span = Math.max(0, nextCol - genCol)
      owners.set(srcLine, (owners.get(srcLine) || 0) + span)
    })
  }

  const files = ranges.map(r => {
    const syms = symbolsIn(r.lines, r.start, r.end)
    const byName = new Map()
    let bytes = 0

    for (let line = r.start; line < r.end; line++) {
      const n = owners.get(line)
      if (!n) continue
      bytes += n

      // Nearest symbol declared at or above this line.
      let owner = null
      for (const s of syms) {
        if (s.line <= line) owner = s
        else break
      }
      const name = owner ? owner.name : '(file scope)'
      byName.set(name, (byName.get(name) || 0) + n)
    }

    return {
      file: r.file,
      bytes,
      symbols: [...byName].map(([name, n]) => ({ name, bytes: n })).sort((a, b) => b.bytes - a.bytes)
    }
  }).sort((a, b) => b.bytes - a.bytes)

  const attributed = files.reduce((n, f) => n + f.bytes, 0)
  return { files, attributed, total: code.length }
}
