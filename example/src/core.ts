// Single seam between the demo and @msameim181/iran-map-core.
// Adjust here once core's public API is frozen.
export { provinceBoundaries, countyBoundaries, normalizeMapValue } from '@msameim181/iran-map-core'
export type {
  IranMapArea,
  IranMapCapital,
  IranMapCapitalLayer,
  IranMapColorBand,
  IranMapIsland,
  IranMapMode,
  IranMapRegion,
  IranMapValue,
  MapBoundary,
} from '@msameim181/iran-map-core'

// Full catalogs (provinces + counties + geography + capitals) for the demo; the
// component itself defaults to the lean provinces-only set. TODO(core API): replace
// this placeholder with the real subpath imports once core publishes its build.
export const catalogs = undefined as unknown as import('@msameim181/iran-map-core').IranMapCatalogs
