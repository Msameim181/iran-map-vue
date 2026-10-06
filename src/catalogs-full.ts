// Full preset (provinces + counties + geography + capitals); only the `/full` entry imports this.
import { fullCatalogs } from '@msameim181/iran-map-core/full'
import type { IranMapCatalogs } from './core'

export const catalogs: Partial<IranMapCatalogs> = fullCatalogs
export { fullCatalogs }
