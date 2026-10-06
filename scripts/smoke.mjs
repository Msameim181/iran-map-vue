// Loads the packed package the way real consumers do and fails on any error:
// Node CJS require, Node ESM import, Vite SSR (ssrLoadModule), and renderToString of the real build.
// Usage: npm run build && npm run smoke [-- --no-vite]   (--no-vite: Node versions Vite does not support)
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PACKAGE, createConsumer } from './lib/pack.mjs'

const ENTRIES = ['', '/full', '/lite', '/score-bands', '/create']
const consumer = createConsumer()
const { dir } = consumer
let failed = false
const check = async (name, run) => {
  try {
    await run()
    console.log(`ok   ${name}`)
  } catch (error) {
    failed = true
    console.error(
      `FAIL ${name}\n${String(error.stderr || error.message || error)
        .split('\n')
        .slice(0, 6)
        .join('\n')}`,
    )
  }
}
const node = (...args) => execFileSync(process.execPath, args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] })

for (const entry of ENTRIES) {
  const specifier = `${PACKAGE}${entry}`
  await check(`require("${specifier}")`, () =>
    node('-e', `const m = require('${specifier}'); if (!m.ScoreBands && !m.createIranMap) process.exit(2)`),
  )
  await check(`import("${specifier}")`, () =>
    node(
      '--input-type=module',
      '-e',
      `const m = await import('${specifier}'); if (!m.ScoreBands && !m.createIranMap) process.exit(2)`,
    ),
  )
}

if (!process.argv.includes('--no-vite')) {
  await check('vite ssrLoadModule', async () => {
    const { createServer } = await import('vite')
    const server = await createServer({
      root: dir,
      appType: 'custom',
      logLevel: 'silent',
      server: { middlewareMode: true },
    })
    try {
      for (const entry of ENTRIES) await server.ssrLoadModule(`${PACKAGE}${entry}`)
    } finally {
      await server.close()
    }
  })
}

await check('renderToString of the real package', () => {
  writeFileSync(
    join(dir, 'render.mjs'),
    `import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { IranMap, ScoreBands } from '${PACKAGE}'
const map = await renderToString(createSSRApp({ render: () => h(IranMap, { data: { tehran: 42 }, capitalMarkers: 'province' }) }))
if ((map.match(/data-area-type="province"/g) || []).length !== 31) throw new Error('expected 31 provinces')
const bands = await renderToString(createSSRApp({ render: () => h(ScoreBands, { bands: [{ color: '#fff' }] }) }))
if (!bands.includes('Score bands')) throw new Error('ScoreBands did not render')
`,
  )
  node('render.mjs')
})

consumer.cleanup()
if (failed) process.exit(1)
console.log('smoke: all checks passed')
