/**
 * Run-length packs the room maps at build time.
 *
 * The maps live in src/rooms.js as thirteen 24-character strings per room --
 * ASCII art you can read and edit, which is how geometry bugs get spotted. That
 * shape is wasteful in the archive, so this rewrites every `m:[ ... ]` literal
 * in the bundle into `m:X('...')` and injects the expander.
 *
 * Encoding: pairs of (tile, count) where count is chr(48 + n), n at most 40.
 * That range is 49..88, which contains neither a quote nor a backslash, so the
 * payload only ever needs backslash escaping for a mirror tile.
 *
 * Worth about 115 bytes on the current dungeon -- small, but free, and it grows
 * with every room added. Measured against roadroller specifically: under plain
 * deflate the same transform made the archive *bigger*, because deflate already
 * models the long runs and RLE only raised the entropy of what was left.
 */
const DECODER = "const X=s=>s.replace(/(.)(.)/g,(a,c,n)=>c.repeat(n.charCodeAt()-48)).match(/.{24}/g);"

const unescape = s => s.replace(/\\\\/g, '\\').replace(/\\'/g, "'")
const escape = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

function encode (flat) {
  let out = '', i = 0
  while (i < flat.length) {
    let j = i
    while (j < flat.length && flat[j] === flat[i] && j - i < 40) j++
    out += flat[i] + String.fromCharCode(48 + j - i)
    i = j
  }
  return out
}

const decode = s =>
  s.replace(/(.)(.)/g, (a, c, n) => c.repeat(n.charCodeAt(0) - 48)).match(/.{24}/g)

/** Returns the rewritten code, or throws if any room fails to round trip. */
export function packMaps (code) {
  let rooms = 0, before = 0, after = 0
  const out = code.replace(/m:\[((?:\s*'(?:\\.|[^'\\])*',?)+)\]/g, (whole, body) => {
    const rows = [...body.matchAll(/'((?:\\.|[^'\\])*)'/g)].map(m => unescape(m[1]))
    if (rows.length !== 13 || rows.some(r => r.length !== 24)) return whole
    const packed = encode(rows.join(''))
    const round = decode(packed)
    if (!round || round.length !== 13 || round.some((r, i) => r !== rows[i])) {
      throw new Error('a room did not survive the round trip: ' + rows[0])
    }
    rooms++
    before += whole.length
    const lit = `m:X('${escape(packed)}')`
    after += lit.length
    return lit
  })
  if (!rooms) return { code, rooms: 0, saved: 0 }
  return { code: out.replace('(()=>{', '(()=>{' + DECODER), rooms, saved: before - after }
}
