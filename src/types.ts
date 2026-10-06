export type {
  IranMapArea,
  IranMapAreaType,
  IranMapCapital,
  IranMapCapitalLayer,
  IranMapCapitalType,
  IranMapColorBand,
  IranMapIsland,
  IranMapMode,
  IranMapRegion,
  IranMapValue,
  IranMapWaterBody,
  MapBoundary,
  RegionAggregation,
} from '@msameim181/iran-map-core'
export type { IranMapCatalogs } from './core'

/** Payload of the legacy-compatible `select-province` event. */
export interface SelectedProvince {
  name: string | undefined
  faName: string | undefined
}
