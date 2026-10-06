// Exports common to every entry point, so the root, `/full` and `/lite` stay at parity with the
// React package and users do not need @msameim181/iran-map-core as a direct dependency.
export { ScoreBands } from './ScoreBands.js'
export type { ScoreBandsProps } from './ScoreBands.js'
export { createIranMap } from './createIranMap.js'
export type { IranMapProps } from './props.js'
export { normalizeMapValue } from '@msameim181/iran-map-core'
export type * from './types.js'
