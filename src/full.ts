import { fullCatalogs } from '@msameim181/iran-map-core/full'
import { createIranMap } from './createIranMap.js'

/** Drop-in equivalent of the legacy map: provinces, counties, geography and capitals preloaded (~1.9 MB gzipped of data). */
export const IranMap = /* @__PURE__ */ createIranMap(fullCatalogs)

export {
  countyBoundaries,
  countyCapitalMarkers,
  fullCatalogs,
  iranIslands,
  iranWaterBodies,
  provinceBoundaries,
  provinceCapitalMarkers,
  provinceCatalogs,
} from '@msameim181/iran-map-core/full'
export * from './shared.js'
