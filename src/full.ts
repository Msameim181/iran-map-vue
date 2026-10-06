import './styles.css'
import { catalogs } from './catalogs-full'
import { createIranMap } from './createIranMap'

/** Drop-in equivalent of the legacy map: provinces, counties, geography and capitals preloaded. */
export const IranMap = createIranMap(catalogs)
export { createIranMap } from './createIranMap'
export { ScoreBands } from './ScoreBands'
export type * from './types'
