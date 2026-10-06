# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - Unreleased

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
