// Single seam between the demo and @msameim181/iran-map-core.
// Ids and names are identical at every data level, so the smallest level supplies the lists
// (synthetic data, selectors); the map itself loads the chosen level lazily (see App.vue).
export { normalizeMapValue } from '@msameim181/iran-map-core'
export { countyBoundaries } from '@msameim181/iran-map-core/counties-mini'
export { provinceBoundaries } from '@msameim181/iran-map-core/provinces-mini'
export type {
  IranMapArea,
  IranMapCapital,
  IranMapCapitalLayer,
  IranMapCatalogs,
  IranMapColorBand,
  IranMapIsland,
  IranMapMode,
  IranMapRegion,
  IranMapValue,
  MapBoundary,
} from '@msameim181/iran-map-core'
