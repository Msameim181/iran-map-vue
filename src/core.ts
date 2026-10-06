// The ONLY module that talks to @msameim181/iran-map-core runtime APIs.
// Names below follow the draft API relayed by the core session; adjust here when it is frozen.
import { buildMapModel, getAreaTooltip, getCapitalTooltip, getIslandTooltip, toPublicArea, toPublicIsland } from '@msameim181/iran-map-core'
import type { IranMapCatalogs, IranMapModel, IranMapModelOptions } from '@msameim181/iran-map-core'

export type { IranMapCatalogs, IranMapModel, IranMapModelOptions }
export { getAreaTooltip, getCapitalTooltip, getIslandTooltip, toPublicArea, toPublicIsland }

export const buildModel = (options: IranMapModelOptions, catalogs: IranMapCatalogs): IranMapModel =>
  buildMapModel(options, catalogs)
