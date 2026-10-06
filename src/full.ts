import './styles.css'
import { fullCatalogs } from './catalogs-full'
import { createIranMap } from './createIranMap'

/** Drop-in equivalent of the legacy map: provinces, counties, geography and capitals preloaded. */
export const IranMap = createIranMap(fullCatalogs)
export { createIranMap } from './createIranMap'
export { ScoreBands } from './ScoreBands'
export type * from './types'
