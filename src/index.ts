import { provinceCapitalMarkers } from '@msameim181/iran-map-core/capitals/provinces'
import { provinceBoundaries } from '@msameim181/iran-map-core/provinces'
import { createIranMap } from './createIranMap.js'

/** Lean map: province polygons and province capitals only. Pass `catalogs` (or import `/full`, `/lite`) for more. */
export const IranMap = /* @__PURE__ */ createIranMap({
  provinces: provinceBoundaries,
  provinceCapitals: provinceCapitalMarkers,
})

export { provinceBoundaries, provinceCapitalMarkers }
export * from './shared.js'
