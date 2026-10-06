import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import dts from 'vite-plugin-dts'

// Lib mode extracts CSS to dist/style.css but never links it from the JS. Prepend a plain
// side-effect import/require so bundlers pull the tooltip styles in automatically; the explicit
// `@msameim181/iran-map-vue/style.css` export remains the SSR/manual fallback.
const linkStyles = (): Plugin => ({
  name: 'link-style-css',
  apply: 'build',
  generateBundle(_options, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type !== 'chunk' || !chunk.isEntry) continue
      chunk.code = chunk.fileName.endsWith('.cjs')
        ? `require('./style.css');\n${chunk.code}`
        : `import './style.css';\n${chunk.code}`
    }
  },
})

export default defineConfig({
  plugins: [dts({ include: ['src'], entryRoot: 'src', tsconfigPath: 'tsconfig.json' }), linkStyles()],
  build: {
    target: 'es2020',
    sourcemap: false,
    cssCodeSplit: false,
    lib: {
      entry: { index: 'src/index.ts', full: 'src/full.ts' },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
      cssFileName: 'style',
    },
    rollupOptions: {
      // Never inline peers or the data/logic core into the wrapper.
      external: ['vue', /^@msameim181\/iran-map-core(\/.*)?$/],
    },
  },
})
