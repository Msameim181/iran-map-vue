# Agents working in iran-map-vue

`@msameim181/iran-map-vue` is a TypeScript Vue 3 wrapper over `@msameim181/iran-map-core`, which supplies framework-free data and map logic. It renders Iran's provinces, counties, capitals, islands, and seas as SVG with Persian names, selection, choropleth colors, and a native tooltip. Vue `^3.5.0` is a peer dependency. Use Node.js 22 for development; the built package supports Node.js 18 and newer.

## Repository layout

- `src/index.ts`, `src/full.ts`, `src/lite.ts`: Lean, full, and lite map entries.
- `src/createIranMap.ts`: Shared component factory, rendering, selection, lifecycle, and delegated events.
- `src/props.ts`, `src/types.ts`, `src/shared.ts`: Props, typed emits, and public exports.
- `src/ScoreBands.ts`, `src/score-bands.ts`, `src/create.ts`: Legend/editor and catalog-free entries.
- `src/tooltip.ts`, `src/listeners.ts`, `src/devWarn.ts`: Tooltip, listener detection, and development warnings.
- `src/styles.css`, `src/styles.ts`: Wrapper CSS and build-only stylesheet entry.
- `tests/`: Vitest and Vue Test Utils tests; jsdom by default, SSR tests in Node.
- `bench/`: Selection benchmarks.
- `example/`: Vite Vue demo; `example/vite.config.ts` uses root `example` and emits `demo-dist/`.
- `example/public/llms.txt`: Demo's public copy of root `llms.txt`; keep both identical.
- `scripts/`: Declaration postprocessing, packed-package smoke checks, and size checks.
- `vite.config.ts`, `tsconfig*.json`: Library build and TypeScript configuration; generated output is `dist/`.
- `.github/workflows/`: CI, Pages deployment, and releases.
- `README.md`, `CHANGELOG.md`, `NOTICE`, `LICENSE`: Usage, release history, data attribution, and code license.

## Commands

Run from the repository root. These use the scripts in `package.json`; package checks, smoke checks, and size checks require a library build first.

```bash
npm ci --ignore-scripts
npm test
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run check:package
npm run smoke
npm run size -- --check
npm run demo:build
npm run demo
```

`npm run build` cleans `dist/`, builds ESM/CJS with Vite, generates declarations with `build:types`, and runs `scripts/post-build.mjs`. `check:package` runs `publint --strict` and `attw --pack .`, excluding stylesheet entry points. `smoke` checks the packed package through Node require/import, Vite SSR, and `renderToString`. `npm run size` reports sizes without enforcing budgets. CI also tests the packed package on Node.js 18, 20, and 22.

`npm run prettier` writes formatting to source, tests, and demo source; use it only when such edits are intended. `npm run prepublishOnly` runs tests, lint, and the build. Pages builds the demo with `npm run demo:build -- --base /iran-map-vue/` and uploads `demo-dist/`.

## Conventions

- Use Conventional Commits, such as `docs: clarify catalog imports` or `fix: preserve selection state`.
- Submit changes through pull requests; do not push directly to `main`.
- No code changes without tests. Add or update regression tests for changed behavior, and run the relevant tests plus CI checks before proposing a code change.
- Follow `.prettierrc.json`: two-space indentation, single quotes, no semicolons, trailing commas, and a 120-column print width. Internal TypeScript imports use `.js` extensions.
- Keep core data and logic in core. Update wrapper exports and declarations together when changing the public API.
- Keep browser DOM work in mounted lifecycle hooks or event handlers; preserve Node imports and SSR rendering. JavaScript entries must not import CSS.
- Preserve `LICENSE` and `NOTICE`; document public changes in `CHANGELOG.md`. Verify documentation against source, tests, scripts, and the exports map.
- Never commit tokens or credentials.

## Release process

After a release pull request is merged to `main`, a maintainer tags the matching package version `vX.Y.Z`. Pushing a `v*` tag triggers `.github/workflows/release.yml`. Verification requires the tagged commit to be an ancestor of `main`, the tag to match `package.json`, and no `file:` dependencies.

The workflow runs lint, type checks, tests, build, package checks, packed-package smoke checks, and size budgets, then publishes the verified tarball to GitHub Packages using the workflow's `GITHUB_TOKEN`. npmjs publishing uses OIDC trusted publishing with `--access public --provenance`, no npm token, and runs only when the repository variable `NPM_PUBLISH` is `true`. Node.js 18 and 20 smoke jobs must also pass before publishing. Existing registry versions are skipped; prereleases use the `next` dist-tag, other releases use `latest`. GitHub release notes come from the version's `CHANGELOG.md` section.

## For agents that USE this package

Install from npmjs without a token:

```bash
npm install @msameim181/iran-map-vue vue --registry=https://registry.npmjs.org
```

```vue
<script setup lang="ts">
import { IranMap } from '@msameim181/iran-map-vue'
import type { IranMapArea } from '@msameim181/iran-map-vue'
import '@msameim181/iran-map-vue/style.css'
const data = { tehran: 42, razaviKhorasan: 68, fars: 25 }
const onSelect = (area: IranMapArea) => console.log(area)
</script>

<template>
  <IranMap :data="data" :width="640" tooltip-title="Score:" @select="onSelect" />
</template>
```

Common pitfalls, documented in README.md:

- Import `@msameim181/iran-map-vue/style.css` explicitly once. `styles.css` is also exported. JavaScript never imports the stylesheet. With TypeScript `noUncheckedSideEffectImports`, declare the exact CSS module you import in an ambient `.d.ts` file.
- The lean root includes province polygons and province capitals. County mode, islands, seas, and county capitals require `/full`, `/lite`, or the appropriate `catalogs` fields. Missing catalogs skip their layer and warn in development. Standard and mini presets come from core through `catalogs`.
- Keep `data`, `regions`, `colorBands`, and `detailedCounties` referentially stable. Use constants, refs, or computed values rather than fresh objects or arrays on each render. Use `shallowRef` for loaded catalogs; replace objects or fields instead of mutating catalog arrays in place.
- SSR imports and rendering are supported without `window` or `document`. Import CSS through the application's stylesheet-capable build; the native tooltip appears only in the browser.
- Vue uses events such as `@select`, `@deselect`, and `@capital-select`. Controlled selection uses `v-model:selected-area`; `null` clears selection, while `undefined` means uncontrolled.
