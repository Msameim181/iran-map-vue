import { provinceBoundaries, provinceCapitalMarkers, provinceCatalogs } from '@msameim181/iran-map-core/lean'
import { createIranMap } from './createIranMap.js'

/** Lean map: province polygons and province capitals only. Pass `catalogs` (or import `/full`, `/lite`) for more. */
export const IranMap = /* @__PURE__ */ createIranMap(provinceCatalogs)

export { provinceBoundaries, provinceCapitalMarkers, provinceCatalogs }
export * from './shared.js'
