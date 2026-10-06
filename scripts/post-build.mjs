// Single stylesheet at dist/style.css (the per-format copies are removed) and no CSS imports in JS.
import { copyFileSync, existsSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const dist = resolve(import.meta.dirname, '..', 'dist')
const source = ['esm', 'cjs'].map((dir) => join(dist, dir, 'style.css')).find(existsSync)
if (!source) throw new Error('style.css was not emitted; is a CSS file imported by an entry?')
copyFileSync(source, join(dist, 'style.css'))
for (const dir of ['esm', 'cjs']) rmSync(join(dist, dir, 'style.css'), { force: true })

// The stylesheet entry exists only to make Vite emit the CSS.
for (const file of ['esm/styles.js', 'cjs/styles.cjs', 'types/styles.d.ts', 'cjs/styles.d.cts']) {
  rmSync(join(dist, file), { force: true })
}
