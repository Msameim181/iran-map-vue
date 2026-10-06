import { defineConfig } from 'vite'

const entries = {
  index: 'src/index.ts',
  full: 'src/full.ts',
  lite: 'src/lite.ts',
  'score-bands': 'src/score-bands.ts',
  create: 'src/create.ts',
  styles: 'src/styles.ts', // build-only: emits the stylesheet
}

// ESM and CJS are emitted module-by-module (like core) so bundlers can tree-shake per file; the
// stylesheet is copied to dist/style.css by scripts/post-build.mjs. The JS never imports CSS:
// consumers import '@msameim181/iran-map-vue/style.css' themselves (Node/SSR cannot load CSS).
export default defineConfig({
  build: {
    target: 'es2020',
    minify: false,
    sourcemap: false,
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: { entry: entries, formats: ['es', 'cjs'], cssFileName: 'style' },
    rollupOptions: {
      // Never inline peers or the data/logic core into the wrapper.
      external: ['vue', /^@msameim181\/iran-map-core(\/.*)?$/],
      output: [
        {
          format: 'es',
          dir: 'dist/esm',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].js',
        },
        {
          format: 'cjs',
          dir: 'dist/cjs',
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].cjs',
          exports: 'named',
        },
      ],
    },
  },
})
