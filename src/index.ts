import './styles.css'
import { leanCatalogs } from './catalogs'
import { createIranMap } from './createIranMap'

/** Lean map: bundles only the province catalog. Pass `catalogs` (or import `/full`) for more layers. */
export const IranMap = createIranMap(leanCatalogs)
export { createIranMap } from './createIranMap'
export { ScoreBands } from './ScoreBands'
export type * from './types'
