// Reports gzip sizes of the built package and of a minimal province-only consumer bundle.
// Usage: npm run build && npm run size
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, resolve } from 'node:path'
import { build } from 'vite'

const root = resolve(import.meta.dirname, '..')
const dist = join(root, 'dist')
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`
const gz = (buffer) => gzipSync(buffer, { level: 9 }).length
const rows = []

for (const file of readdirSync(dist).filter((name) => /\.(js|cjs|css)$/.test(name))) {
  const buffer = readFileSync(join(dist, file))
  rows.push([`dist/${file}`, kb(buffer.length), kb(gz(buffer))])
}

const tmp = join(root, '.size-tmp')
rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp, { recursive: true })

const bundle = async (name, source) => {
  const entry = join(tmp, `${name}.ts`)
  writeFileSync(entry, source)
  const result = await build({
    root: tmp,
    logLevel: 'silent',
    configFile: false,
    resolve: { alias: { '@iran-map-vue': dist } },
    build: {
      write: false,
      minify: 'esbuild',
      target: 'es2020',
      rollupOptions: { input: entry, output: { inlineDynamicImports: true } },
    },
  })
  const outputs = Array.isArray(result) ? result.flatMap((item) => item.output) : result.output
  return outputs.filter((item) => item.type === 'chunk').reduce((total, chunk) => total + gz(Buffer.from(chunk.code)), 0)
}

const vueOnly = await bundle('baseline', `import { createApp, h } from 'vue'\ncreateApp({ render: () => h('div') }).mount('#app')`)
const leanData = await bundle(
  'lean-data',
  `import { provinceBoundaries } from '@msameim181/iran-map-core/provinces'\nimport { provinceCapitalMarkers } from '@msameim181/iran-map-core/capitals/provinces'\nconsole.log(provinceBoundaries, provinceCapitalMarkers)`,
)
const province = await bundle(
  'province',
  `import { createApp, h } from 'vue'\nimport { IranMap } from '@iran-map-vue/index.js'\nimport '@iran-map-vue/style.css'\ncreateApp({ render: () => h(IranMap, { data: { tehran: 42 } }) }).mount('#app')`,
)
const full = await bundle(
  'full',
  `import { createApp, h } from 'vue'\nimport { IranMap } from '@iran-map-vue/full.js'\nimport '@iran-map-vue/style.css'\ncreateApp({ render: () => h(IranMap, { data: { tehran: 42 } }) }).mount('#app')`,
)
rmSync(tmp, { recursive: true, force: true })

console.table(rows.map(([file, raw, gzip]) => ({ file, raw, gzip })))
console.log(`Vue-only baseline (gzip JS): ${kb(vueOnly)}`)
console.log(`Lean catalogs alone (province polygons + capitals data, gzip): ${kb(leanData)}`)
console.log(`Province-only consumer (gzip JS, incl. Vue): ${kb(province)}  ->  ours: ${kb(province - vueOnly)}  (wrapper + core logic: ${kb(province - vueOnly - leanData)})`)
console.log(`Full-preset consumer   (gzip JS, incl. Vue): ${kb(full)}  ->  ours: ${kb(full - vueOnly)}`)
