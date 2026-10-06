// Lean default: provinces only (no counties, geography or capitals in the bundle).
// Subpath name is the draft from core; adjust when its API is frozen.
import { provinceBoundaries } from '@msameim181/iran-map-core/provinces'
import type { IranMapCatalogs } from './core'

export const leanCatalogs: Partial<IranMapCatalogs> = { provinces: provinceBoundaries }
