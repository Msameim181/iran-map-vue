import { liteCatalogs } from '@msameim181/iran-map-core/lite'
import { createIranMap } from './createIranMap.js'

/**
 * Every layer at core's "lite" detail level (about a tenth of the full data, same ids and names).
 * For the "standard" or "mini" levels pass `catalogs` to the root `IranMap`.
 */
export const IranMap = /* @__PURE__ */ createIranMap(liteCatalogs)

export {
  countyBoundaries,
  countyCapitalMarkers,
  iranIslands,
  iranWaterBodies,
  liteCatalogs,
  liteProvinceCatalogs,
  provinceBoundaries,
  provinceCapitalMarkers,
} from '@msameim181/iran-map-core/lite'
export * from './shared.js'
