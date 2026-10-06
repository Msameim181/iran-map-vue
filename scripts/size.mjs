// Bundles tiny consumer apps against the PACKED package (real exports, real tree-shaking) and
// reports gzip sizes; with --check, fails when a budget is exceeded.
// Usage: npm run build && npm run size [-- --check]
import { gzipSync } from 'node:zlib'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'vite'
import { PACKAGE, createConsumer } from './lib/pack.mjs'

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`
const gz = (buffer) => gzipSync(buffer, { level: 9 }).length
const consumer = createConsumer()

const bundle = async (name, source) => {
  const entry = join(consumer.dir, `${name}.js`)
  writeFileSync(entry, source)
  const result = await build({
    root: consumer.dir,
    logLevel: 'silent',
    configFile: false,
    build: { write: false, minify: 'esbuild', target: 'es2020', rollupOptions: { input: entry } },
  })
  const outputs = Array.isArray(result) ? result.flatMap((item) => item.output) : result.output
  return outputs
    .filter((item) => item.type === 'chunk')
    .reduce((total, chunk) => total + gz(Buffer.from(chunk.code)), 0)
}
const app = (imports, render) =>
  `import { createApp, h } from 'vue'\n${imports}\ncreateApp({ render: () => ${render} }).mount('#app')`
const call = (component, props = '{}') => `h(${component}, ${props})`

const scenarios = [
  ['Vue baseline', app('', `h('div')`), null],
  [
    'ScoreBands only (bare root import)',
    app(`import { ScoreBands } from '${PACKAGE}'`, call('ScoreBands', "{ bands: [{ color: '#fff' }] }")),
    32,
  ],
  [
    'ScoreBands only (/score-bands)',
    app(`import { ScoreBands } from '${PACKAGE}/score-bands'`, call('ScoreBands', "{ bands: [{ color: '#fff' }] }")),
    32,
  ],
  [
    'Lean map (provinces + capitals)',
    app(`import { IranMap } from '${PACKAGE}'`, call('IranMap', '{ data: {} }')),
    440,
  ],
  [
    'Lite map (all layers, lite level)',
    app(`import { IranMap } from '${PACKAGE}/lite'`, call('IranMap', '{ data: {} }')),
    240,
  ],
  [
    'Full map (all layers, full detail)',
    app(`import { IranMap } from '${PACKAGE}/full'`, call('IranMap', '{ data: {} }')),
    1960,
  ],
]

const rows = []
let baseline = 0
let failed = false
for (const [name, source, budget] of scenarios) {
  const size = await bundle(name.replace(/\W+/g, '-'), source)
  if (budget === null) baseline = size
  const over = budget !== null && size / 1024 > budget
  failed ||= over
  rows.push({
    scenario: name,
    'gzip JS (incl. Vue)': kb(size),
    'over Vue': budget === null ? '-' : kb(size - baseline),
    budget: budget === null ? '-' : `${budget} kB${over ? '  EXCEEDED' : ''}`,
  })
}
const css = gz(readFileSync(join(consumer.dir, 'node_modules', ...PACKAGE.split('/'), 'dist', 'style.css')))
consumer.cleanup()
console.table(rows)
console.log(`style.css: ${kb(css)} gzip`)
if (failed && process.argv.includes('--check')) {
  console.error('size budget exceeded')
  process.exit(1)
}
