// Score-band validation and labels. Mirrors the legacy React logic; swap for core's exported
// score-band helpers once its API is frozen (this file is the only place to change).
import type { IranMapColorBand } from './types'

export type BandScale = 'score' | 'numeric'
export type BoundField = 'min' | 'max'

export const isValidDomain = (min: number, max: number, scale: BandScale) =>
  Number.isFinite(min) && Number.isFinite(max) && min < max && (scale === 'numeric' || (min >= 0 && max <= 100))

export const rangeLabel = (band: IranMapColorBand, format: (value: number) => string) => {
  if (band.min === undefined && band.max === undefined) return 'All values'
  if (band.min === undefined) return `Below ${format(band.max!)}`
  if (band.max === undefined) return `${format(band.min)} and above`
  return `${format(band.min)} ≤ value < ${format(band.max)}`
}

export const isValidBand = (band: IranMapColorBand, scale: BandScale) => {
  const bounds = [band.min, band.max].filter((value): value is number => value !== undefined)
  return (
    bounds.every((value) => Number.isFinite(value) && (scale === 'numeric' || (value >= 0 && value <= 100))) &&
    (band.min === undefined || band.max === undefined || band.min < band.max)
  )
}

export const parseBound = (draft: string) => (draft.trim() === '' ? undefined : Number(draft))
