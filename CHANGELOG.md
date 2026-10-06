# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-10-06

Hardening release from two independent reviews of 0.1.0. Contains breaking packaging changes (see Changed).

### Added

- `/lite` entry bound to core's lite catalogs, plus catalog-free `/score-bands` and `/create` entries; all map entries re-export the catalogs they bind, `normalizeMapValue`, `createIranMap`, `ScoreBands` and the types (`IranMapProps`, `IranMapModel`, ...), for parity with the React package.
- Demo: a "Data level" selector (Full / Standard / Lite / Mini) that loads core's presets lazily and shows their approximate sizes.
- `ScoreBands` `editable` and `IranMap` `capitalsInteractive` props (listener detection, including `.once`, stays the default); typed `ScoreBandsProps`.
- Tooltip CSS variables (`--iran-map-tooltip-*`).
- Typed `emits` (payloads visible in the declarations); dev warning when a controlled `selectedArea` becomes uncontrolled.
- Tests: SSR (node environment), KeepAlive, removed hovered element, catalog identity and reactive replacement, tooltip placement, focus/hover, key repeat; CI smoke test of the packed package (Node 18/20/22, Vite SSR, `renderToString`), publint, are-the-types-wrong and bundle-size budgets.

### Changed

- **The JavaScript no longer imports CSS.** Import `@msameim181/iran-map-vue/style.css` (also `./styles.css`) once; the automatic import broke Node ESM/CJS and Vite SSR. The stylesheet now includes core's map styles.
- **Peer dependency is `vue ^3.5`** (the emitted declarations use the 3.5 component types). `engines.node` is `>=18` (was `>=22`).
- Build is module-by-module with matching `.d.ts`/`.d.cts` declarations, `types` inside every export condition and `typesVersions` for Node 10 resolution; `IranMap` and `ScoreBands` creation is annotated pure, so importing `ScoreBands` alone costs about 2 kB gzipped over Vue instead of the whole map data.
- The tooltip is appended to the owning document's `<body>` (immune to scaled, rotated or clipped ancestors), positioned once per frame, and kept in sync with the model (`hover(null)` when the hovered shape disappears).
- `catalogs` is read through the reactive container (replacing a field is tracked), arrays are un-proxied, an explicit `undefined` keeps the default, and an unchanged field set no longer rebuilds the model.
- Accessibility: the SVG is a `role="group"`; capitals are focusable buttons only when a `capital-select` listener is attached; Space activates on key release and auto-repeat Enter is ignored.
- Performance: shapes are memoized, so a selection change only patches what changed (county-mode median 3.9 ms to 1.0 ms in the jsdom benchmark).
- Inside `<KeepAlive>`, a deactivated map stops listening for outside clicks and hides its tooltip.
- The development warning no longer reads `process` unguarded (unbundled browser ESM).
- `ScoreBands` editor: an empty bound is held back while typing and committed as unbounded on blur or Enter (fixes the intermediate-commit issue, #1).

### Fixed

- `IranMap` tooltip mispositioned inside transformed ancestors (0.1.0 follow-up).
- A selected area that leaves the model (for example province to county mode) is now deselected once (`deselect`, `update:selectedArea` with `null`) instead of leaving a stale id that re-highlighted when switching back; a default selection that was never in the model is dropped silently.
- Escape now clears the selection as well as hiding the tooltip (as in the React package).
- The tooltip re-runs its placement when its text changes while the pointer or focus is stationary.
- `ScoreBands`: a partial entry typed after clearing a bound no longer commits as unbounded when the sibling bound is committed.
- Memo caches shrink with the model; a Space press no longer activates after focus has left the shape.

## [0.1.0] - 2026-10-06

First release: a Vue 3 port of the legacy React map, built as a thin wrapper over `@msameim181/iran-map-core`.

### Added

- `IranMap` component (root entry, lean: provinces and province capitals) and a `/full` entry preloaded with counties, islands, seas and county capitals; optional `catalogs` prop to add layers to the lean entry.
- `ScoreBands` legend and controlled editor (`@change` or `v-model:bands`).
- Events instead of callbacks: `select`, `deselect`, `hover`, `capital-select`, `island-select`, legacy-compatible `select-province`, and `v-model:selected-area` for controlled selection.
- Native tooltip (mouse, keyboard focus, touch) replacing `react-tooltip`; no runtime dependency besides the `vue` peer.
- SSR-safe rendering, keyboard activation (Enter and Space), outside-click dismissal.
- Development-only warning when a requested catalog is missing.
- ESM and CJS builds with type declarations; `style.css` export.
- Vue demo app (provinces, counties, mixed, province focus, regions) and Vitest test suite.

### Known issues

- `ScoreBands` (editor mode) commits every valid intermediate value while you type, e.g. typing `-5` first commits an empty (unbounded) bound before `-5` is rejected. This matches the legacy component; fixed in 0.2.0 (#1).
