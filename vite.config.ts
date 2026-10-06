import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts({ include: ['src'], entryRoot: 'src', tsconfigPath: 'tsconfig.json' })],
  build: {
    target: 'es2020',
    sourcemap: false,
    cssCodeSplit: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
      cssFileName: 'style',
    },
    rollupOptions: {
      // Never inline peers or the data/logic core into the wrapper.
      external: ['vue', /^@msameim181\/iran-map-core(\/.*)?$/],
    },
  },
})
