# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/).

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

- `ScoreBands` (editor mode) commits every valid intermediate value while you type, e.g. typing `-5` first commits an empty (unbounded) bound before `-5` is rejected. This matches the legacy component; a hold-back-until-valid behavior is planned for 0.2 (#1).
