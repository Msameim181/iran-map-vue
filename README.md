# @msameim181/iran-map-vue

A lightweight, interactive SVG map of Iran for **Vue 3**. Province and county views, custom regions, choropleth color bands, capital markers, seas and islands, keyboard and screen-reader support, and a native tooltip with no runtime dependency besides Vue.

It is a thin wrapper over [`@msameim181/iran-map-core`](https://github.com/Msameim181/iran-map-core), which holds the data and all map logic. A React twin, `@msameim181/iran-map-react`, behaves identically.

[**Open the live demo →**](https://msameim181.github.io/iran-map-vue/)

## Features

- **Whole-country views:** 31 Ostans (provinces) or 478 Shahrestan (county) boundaries.
- **Mixed detail, province focus, custom regions** with sum / average / min / max aggregation.
- **Choropleth colors:** configurable bands, a legacy RGB gradient, and a gray no-data state.
- **`ScoreBands`:** standalone legend or editor for 0–100 scores and arbitrary numeric ranges.
- **Capital markers, seas and 17 islands** as optional layers.
- **Light by default:** the root entry bundles only the province catalog. Counties, geography and capitals are opt-in, and lighter data levels (`/lite`, standard, mini) are available.
- **Tree-shakeable:** importing `ScoreBands` alone adds about 2 kB gzipped over Vue.
- **SSR-safe:** no `window` or `document` access outside `onMounted` and event handlers; the package loads under Node (CJS and ESM) and Vite SSR.
- **Accessible:** every area is a focusable button with `aria-pressed` and a descriptive `aria-label`; Enter toggles selection, Space toggles on key release.

## Installation

Vue 3.5 or newer is a peer dependency. `@msameim181/iran-map-core` (data and logic) installs automatically.

```bash
npm install @msameim181/iran-map-vue vue
```

Releases are published to [npm](https://www.npmjs.com/package/@msameim181/iran-map-vue) from GitHub Actions with provenance (trusted publishing), so each version links back to the commit and workflow run that built it.

The package is also published to GitHub Packages. That registry requires authentication **even for public packages**: create a personal access token with the `read:packages` scope, then add to your project's `.npmrc`:

```ini
@msameim181:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Note that mapping the whole `@msameim181` scope this way also resolves `@msameim181/iran-map-core` from GitHub Packages (it is published there too). If you only want this package from GitHub Packages and the rest from npm, install it once with an explicit registry instead: `npm install @msameim181/iran-map-vue --registry=https://npm.pkg.github.com`.

Import the stylesheet once (the JavaScript never imports CSS, so it also loads under Node and SSR):

```ts
import '@msameim181/iran-map-vue/style.css'
```

It includes core's map and score-band styles and the tooltip, so this single import is all you need.

With TypeScript 5.6+ and `noUncheckedSideEffectImports`, tell the compiler about the CSS import once (for example in `env.d.ts`):

```ts
declare module '@msameim181/iran-map-vue/style.css'
```

## Quick start

Lean entry, provinces only:

```vue
<script setup lang="ts">
import { IranMap } from '@msameim181/iran-map-vue'
import type { IranMapArea } from '@msameim181/iran-map-vue'

const data = { tehran: 42, razaviKhorasan: 68, fars: 25 }
const onSelect = (area: IranMapArea) => console.log(area)
</script>

<template>
  <IranMap :data="data" :width="640" tooltip-title="Score:" @select="onSelect" />
</template>
```

## Entry points

| Import                                 | What it binds                                                                 | Data (gzip, approx.) |
| -------------------------------------- | ----------------------------------------------------------------------------- | -------------------- |
| `@msameim181/iran-map-vue`             | Lean: province polygons and province capitals                                 | 400 kB               |
| `@msameim181/iran-map-vue/lite`        | Every layer (counties, seas, islands, capitals) at core's "lite" detail level | 200 kB               |
| `@msameim181/iran-map-vue/full`        | Every layer at full detail, equivalent to the legacy single package           | 1.9 MB               |
| `@msameim181/iran-map-vue/score-bands` | `ScoreBands` only, no map data                                                | none                 |
| `@msameim181/iran-map-vue/create`      | `createIranMap(catalogs)`: bring your own catalogs                            | none                 |

All map entries also re-export `ScoreBands`, `createIranMap`, `normalizeMapValue`, the catalogs they bind (for example `provinceBoundaries`, `countyBoundaries`, `fullCatalogs`) and the types, so you do not need core as a direct dependency.

```ts
import { IranMap } from '@msameim181/iran-map-vue/full'
```

### Adding layers or choosing a detail level

`catalogs` is merged over the entry's defaults. Use it to add a layer to the lean entry, or to pick core's `standard` or `mini` level. Load the data lazily and hold it in a `shallowRef` (the catalogs are multi-megabyte and must not be made deeply reactive):

```vue
<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { IranMap } from '@msameim181/iran-map-vue'
import type { IranMapCatalogs } from '@msameim181/iran-map-vue'

const catalogs = shallowRef<IranMapCatalogs>()
onMounted(async () => {
  catalogs.value = (await import('@msameim181/iran-map-core/standard')).standardCatalogs
})
</script>

<template>
  <IranMap v-if="catalogs" mode="county" :catalogs="catalogs" :data="{ 'razaviKhorasan.mashhad': 78 }" />
</template>
```

Replace the object (or its fields) to change it; do not mutate loaded arrays in place. A feature whose catalog is missing (for example `mode="county"` without counties) logs a development-only warning and renders nothing for that layer.

## Events

The React callbacks became Vue events:

| React prop              | Vue event / usage            | Payload                                                                     |
| ----------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| `onSelect`              | `@select`                    | `IranMapArea`                                                               |
| `onDeselect`            | `@deselect`                  | none                                                                        |
| `onHover`               | `@hover`                     | `IranMapArea \| null`                                                       |
| `onCapitalSelect`       | `@capital-select`            | `IranMapCapital`                                                            |
| `onIslandSelect`        | `@island-select`             | `(island, area)`                                                            |
| `selectProvinceHandler` | `@select-province`           | `{ name, faName }`, or `{ name: undefined, faName: undefined }` on deselect |
| `defaultSelectedArea`   | `default-selected-area`      | initial selection (uncontrolled)                                            |
| (controlled selection)  | `v-model:selected-area`      | `string \| null`                                                            |
| `ScoreBands onChange`   | `@change` or `v-model:bands` | `IranMapColorBand[]`                                                        |

Clicking an area selects it; clicking it again, clicking the map background, or clicking outside the map deselects it. Pass `v-model:selected-area` with a `ref<string | null>` to control selection yourself (`null` means nothing selected; switching back to `undefined` falls back to the internal selection and warns in development).

`ScoreBands` renders as an editor when a `change` or `update:bands` listener is attached (checked on every render), or when `editable` is set explicitly; otherwise it is a read-only legend. In the editor, an empty bound is held back while you type and committed as unbounded on blur or Enter, so typing a negative number never flashes an empty bound.

Capital markers are keyboard-focusable buttons only when a `capital-select` listener is attached; otherwise they only show their tooltip. The map itself is a labelled `role="group"`. Auto-repeat Enter is ignored and Space activates on key release, like a native button; Escape hides the tooltip and clears the selection. `@capital-select.once` counts as a listener; if a listener is added or removed dynamically, set `capitals-interactive` explicitly (Vue does not re-render a child when an event listener changes). Inside `<KeepAlive>`, a deactivated map stops listening for outside clicks and hides its tooltip.

## Tooltip

A single native element per map, appended to the owning document's `<body>` (so scaled, rotated or clipped ancestors cannot offset or crop it), with no dependency:

- **Mouse:** appears next to the pointer on hover and follows it (one update per frame); flips and clamps to stay inside the viewport.
- **Keyboard:** appears above the focused area, island or capital and hides on blur or Escape.
- **Touch:** a tap shows the tooltip next to the tap point (via the browser's emulated hover) and selects the area; tapping anywhere else dismisses it. This path is covered by unit tests only; it has not been verified on a physical device.

The text is the element's `aria-label`, so screen readers get the same information. It stays in sync when data, mode or `tooltip-title` change under the pointer, and is hidden (with `hover(null)`) when the hovered shape disappears.

Style it with CSS variables: `--iran-map-tooltip-bg`, `--iran-map-tooltip-color`, `--iran-map-tooltip-radius`, `--iran-map-tooltip-shadow`, `--iran-map-tooltip-font-size`, `--iran-map-tooltip-max-width`, `--iran-map-tooltip-padding`.

## Performance

Rendering is cheap (a province map is about 500 DOM nodes; the county map about 3,200), pointer events use one delegated listener per map, and shapes are memoized so a selection change only patches the shapes that changed (a county-mode selection re-render dropped from a 3.9 ms median to 1.0 ms in the jsdom benchmark in `bench/`). The map rebuilds its model whenever a prop _identity_ changes, so keep object and array props stable: define `regions`, `colorBands`, `detailedCounties` and `data` once (a `ref`, `computed` or constant) instead of writing a fresh `[]` or `{}` in the template of a component that re-renders often.

## Props

Same names, types and defaults as the React component (use kebab-case in templates), except the React-only tooltip props (`tooltip`, `tooltipId`, `tooltipDisableStyleInjection`); the Vue package has `capitalsInteractive` and (on `ScoreBands`) `editable` instead of detecting listeners that change dynamically.

| Prop                                      | Type                                                   | Default             | Description                                         |
| ----------------------------------------- | ------------------------------------------------------ | ------------------- | --------------------------------------------------- |
| `data`                                    | `Record<string, IranMapValue>`                         | required            | Numbers or null/undefined; -1 means no data         |
| `catalogs`                                | `Partial<IranMapCatalogs>`                             | entry defaults      | Catalog overrides merged over the entry's defaults  |
| `mode`                                    | `'province' \| 'county' \| 'region'`                   | `'province'`        | Nationwide display mode                             |
| `regions`                                 | `IranMapRegion[]`                                      | `[]`                | Custom groups of provinces                          |
| `detailedCounties`                        | `string[]`                                             | `[]`                | Counties overlaid in province or region mode        |
| `focusProvince`, `focusPadding`           | `string`, `number`                                     | —, `28`             | Render and fit the map to one province              |
| `colorBands`                              | `IranMapColorBand[]`                                   | —                   | Half-open `[min, max)` thresholds, first match wins |
| `colorRange`                              | RGB triplet string                                     | `'30, 70, 181'`     | Automatic gradient when no bands                    |
| `regionAggregation`                       | `'sum' \| 'average' \| 'min' \| 'max'`                 | `'sum'`             | Region value fallback                               |
| `width`                                   | `number \| string`                                     | `500`               | Map width                                           |
| `tooltipTitle`                            | `string`                                               | `''`                | Tooltip label, e.g. `Population:`                   |
| `selectedAreaColor`                       | `string`                                               | —                   | Fill of the selected area                           |
| `deactiveProvinceColor`                   | `string`                                               | `'#e6e6e6'`         | Fill for missing values                             |
| `strokeColor`, `strokeWidth`              | `string`, `number`                                     | `'#ffffff'`, `0.35` | Boundary stroke                                     |
| `showLabels`                              | `boolean`                                              | province mode       | Province labels                                     |
| `capitalMarkers`                          | `'none' \| 'auto' \| 'province' \| 'county' \| 'both'` | `'none'`            | Capital marker layer                                |
| `capitalMarkerColor`, `capitalMarkerSize` | `string`, `number`                                     | `'#123f4b'`, `4`    | Marker style                                        |
| `showCapitalLabels`                       | `boolean`                                              | `false`             | Persian capital labels                              |
| `showWater`, `waterColor`                 | `boolean`, `string`                                    | `true`, `'#dcebed'` | Seas                                                |
| `showSeaLabels`, `seaLabelColor`          | `boolean`, `string`                                    | `true`, `'#477983'` | Sea labels                                          |
| `showIslands`, `showIslandLabels`         | `boolean`                                              | `true`              | Islands and their labels                            |

`ScoreBands` props: `bands` (required), `scale` (`'score' \| 'numeric'`), `min`, `max`, `metricLabel`, `orientation`, `formatValue`, `showNoData`, `noDataColor`, `noDataLabel`, `className`, `editable`.

See the [React twin's README](https://github.com/Msameim181/iran-map-react#readme) for the full behavior guide (no-data rules, regions, focus mode); the Vue component behaves the same way.

## Bundle size

Measured by `npm run size` against the packed tarball (gzip, minified, a tiny Vue app per scenario; budgets are enforced in CI):

| Scenario                               | Total incl. Vue | Over Vue  |
| -------------------------------------- | --------------- | --------- |
| Vue only (baseline)                    | 24.4 kB         | -         |
| `ScoreBands` only (bare root import)   | 26.7 kB         | 2.3 kB    |
| Lean map (provinces + capitals)        | 432.4 kB        | 408.0 kB  |
| `/lite` map (every layer, lite level)  | 228.2 kB        | 203.8 kB  |
| `/full` map (every layer, full detail) | 1925.5 kB       | 1901.1 kB |

The stylesheet is about 1.6 kB gzipped. The wrapper and its logic are about 7 kB; the map data dominates, which is why the root entry is lean and lighter levels exist.

## Development

```bash
npm ci
npm test               # Vitest + Vue Test Utils (jsdom; SSR tests run in node)
npm run lint
npm run typecheck
npm run build          # ESM, CJS and declarations in dist/
npm run check:package  # publint + are-the-types-wrong on the packed tarball
npm run smoke          # packed package under Node require/import, Vite SSR, renderToString
npm run size           # gzip report (add -- --check to enforce budgets)
npm run demo           # Vue demo with every layer and data level
```

Node.js 22 for development; the built package runs on Node 18 and newer. The [Pages workflow](.github/workflows/pages.yml) builds the demo with `--base /iran-map-vue/`.

## Known issues

- Real touch behavior (tap to show and dismiss the tooltip) has been verified in unit tests but not on a physical touch device.

## Data attribution

Administrative boundaries, physical coastlines and water bodies are derived from [OpenStreetMap](https://www.openstreetmap.org/copyright) data under the Open Data Commons Open Database License (ODbL) 1.0. Capital coordinates are primarily derived from [GeoNames](https://www.geonames.org/) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See [`NOTICE`](NOTICE). These boundaries suit thematic cartography; they are not cadastral, surveying or legally authoritative.

## License

MIT. See [`LICENSE`](LICENSE).
