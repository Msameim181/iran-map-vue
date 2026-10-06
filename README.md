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
- **Light by default:** the root entry bundles only the province catalog. Counties, geography and capitals are opt-in.
- **SSR-safe:** no `window` or `document` access outside `onMounted` and event handlers.
- **Accessible:** every area is a focusable button with `aria-pressed` and a descriptive `aria-label`; Enter and Space toggle selection.

## Installation

The package is published to GitHub Packages. Add the scope registry to your project's `.npmrc`:

```ini
@msameim181:registry=https://npm.pkg.github.com
```

GitHub Packages requires authentication **even for public packages**. Create a personal access token with the `read:packages` scope and add it:

```ini
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install (Vue 3.3 or newer is a peer dependency):

```bash
npm install @msameim181/iran-map-vue vue
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

Everything (counties, seas, islands, capitals), equivalent to the legacy single package:

```ts
import { IranMap } from '@msameim181/iran-map-vue/full'
```

Or keep the lean entry and add only what you need:

```vue
<script setup lang="ts">
import { IranMap } from '@msameim181/iran-map-vue'
import { countyBoundaries } from '@msameim181/iran-map-core/counties'
</script>

<template>
  <IranMap mode="county" :catalogs="{ counties: countyBoundaries }" :data="{ 'razaviKhorasan.mashhad': 78 }" />
</template>
```

`catalogs` is merged over the entry's defaults. Marking a catalog as missing (for example `mode="county"` without counties) logs a development-only warning and renders nothing for that layer.

### Styles

The package CSS (tooltip) is linked automatically from the JS entry. Map and score-band styles come from core:

```ts
import '@msameim181/iran-map-core/styles.css'
import '@msameim181/iran-map-vue/style.css' // explicit import, needed for SSR frameworks that skip side-effect CSS
```

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

Clicking an area selects it; clicking it again, clicking the map background, or clicking outside the map deselects it. Pass `v-model:selected-area` with a `ref<string | null>` to control selection yourself. `ScoreBands` renders as an editor only when a `change` or `update:bands` listener is attached; otherwise it is a read-only legend.

## Tooltip

A single native element per map, with no dependency:

- **Mouse:** appears next to the pointer on hover and follows it; flips and clamps to stay inside the viewport.
- **Keyboard:** appears above the focused area, island or capital and hides on blur or Escape.
- **Touch:** a tap shows the tooltip next to the tap point (via the browser's emulated hover) and selects the area; tapping anywhere else dismisses it.

The text is the element's `aria-label`, so screen readers get the same information.

## Props

Same names, types and defaults as the React component (use kebab-case in templates).

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

`ScoreBands` props: `bands` (required), `scale` (`'score' \| 'numeric'`), `min`, `max`, `metricLabel`, `orientation`, `formatValue`, `showNoData`, `noDataColor`, `noDataLabel`, `className`.

See the [React twin's README](https://github.com/Msameim181/iran-map-react#readme) for the full behavior guide (no-data rules, regions, focus mode); the Vue component behaves the same way.

## Bundle size

Measured with `npm run size` (gzip, minified):

| What                                                            | gzip      |
| --------------------------------------------------------------- | --------- |
| This package (`IranMap` + `ScoreBands` + tooltip, ESM)          | 5.6 kB    |
| Wrapper plus core logic in a province-only app (excluding data) | 6.3 kB    |
| Province polygons and capitals data (the lean catalogs)         | 399.7 kB  |
| Province-only app, whole delta over Vue                         | 406.0 kB  |
| `/full` app (counties, islands, seas, county capitals), delta   | 1898.6 kB |

The wrapper and its logic are tiny; the map data dominates. The lean entry ships only provinces and province capitals; use `/full` or pass `catalogs` only when you need counties or geography.

## Development

```bash
npm ci
npm test            # Vitest + Vue Test Utils
npm run lint
npm run typecheck
npm run build       # ESM + CJS + .d.ts in dist/
npm run size        # gzip report
npm run demo        # Vue demo with every layer
```

Node.js 22 or newer. Until core is published, the repository expects it checked out next to this one (`../iran-map-core`, built); CI does that automatically. The [Pages workflow](.github/workflows/pages.yml) builds the demo with `--base /iran-map-vue/`.

## Data attribution

Administrative boundaries, physical coastlines and water bodies are derived from [OpenStreetMap](https://www.openstreetmap.org/copyright) data under the Open Data Commons Open Database License (ODbL) 1.0. Capital coordinates are primarily derived from [GeoNames](https://www.geonames.org/) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See [`NOTICE`](NOTICE). These boundaries suit thematic cartography; they are not cadastral, surveying or legally authoritative.

## License

MIT. See [`LICENSE`](LICENSE).
