/**
 * Renders the byte-budget heatmap from a finished build.
 *
 * Takes the attribution written by `--map` and injects it into
 * heatmap.template.html. Every number the page shows - including the ones in
 * its prose - is read from that data at render time, so the page cannot drift
 * from the build it describes.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

export function renderHeatmap (analysis, outPath) {
  const template = readFileSync(join(HERE, 'heatmap.template.html'), 'utf8')
  if (!template.includes('{{DATA}}')) throw new Error('heatmap.template.html has no {{DATA}} placeholder')

  // JSON.stringify output is inlined into a <script>, so the one sequence that
  // could close the block early has to be escaped.
  const json = JSON.stringify(analysis).replace(/<\//g, '<\\/')
  writeFileSync(outPath, template.replace('{{DATA}}', json))
  return outPath
}

// Standalone: node build/heatmap.mjs [analysis.json] [out.html]
if (process.argv[1] && process.argv[1].endsWith('heatmap.mjs')) {
  const input = process.argv[2] || 'dist/analysis.json'
  const out = process.argv[3] || 'dist/heatmap.html'
  const analysis = JSON.parse(readFileSync(input, 'utf8'))
  if (!analysis.stages) {
    throw new Error(`${input} has no stage data - regenerate it with: npm run build -- --map`)
  }
  console.log('wrote ' + renderHeatmap(analysis, out))
}
