// Lean default: province polygons and province capitals only. Heavy data (counties, islands,
// water, county capitals) stays out of the bundle unless a consumer imports it.
import { provinceCapitalMarkers } from '@msameim181/iran-map-core/capitals/provinces'
import { provinceBoundaries } from '@msameim181/iran-map-core/provinces'
import type { IranMapCatalogs } from '@msameim181/iran-map-core'

export const leanCatalogs: IranMapCatalogs = {
  provinces: provinceBoundaries,
  provinceCapitals: provinceCapitalMarkers,
}
