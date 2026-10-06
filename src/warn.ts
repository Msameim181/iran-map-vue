import type { IranMapCatalogs } from './core'
import type { IranMapCapitalLayer, IranMapMode } from './types'

const seen = new Set<string>()

interface Needs {
  mode: IranMapMode
  detailedCounties: string[]
  showWater: boolean
  showIslands: boolean
  capitalMarkers: IranMapCapitalLayer
}

/**
 * Dev-only hint when a feature needs a catalog that was not supplied. The guard is a literal
 * `process.env.NODE_ENV` so consumer bundlers strip the whole call in production builds.
 */
export const warnMissingCatalogs = (needs: Needs, catalogs: Partial<IranMapCatalogs>) => {
  if (process.env.NODE_ENV === 'production') return
  const missing: Array<[string, boolean]> = [
    ['counties', !catalogs.counties && (needs.mode === 'county' || needs.detailedCounties.length > 0)],
    ['waterBodies', !catalogs.waterBodies && needs.showWater],
    ['islands', !catalogs.islands && needs.showIslands],
    [
      'provinceCapitals',
      !catalogs.provinceCapitals &&
        ['province', 'both'].includes(
          needs.capitalMarkers === 'auto' ? (needs.mode === 'county' ? 'county' : 'province') : needs.capitalMarkers,
        ),
    ],
    [
      'countyCapitals',
      !catalogs.countyCapitals &&
        ['county', 'both'].includes(
          needs.capitalMarkers === 'auto' ? (needs.mode === 'county' ? 'county' : 'province') : needs.capitalMarkers,
        ),
    ],
  ]
  for (const [name, isMissing] of missing) {
    if (!isMissing || seen.has(name)) continue
    seen.add(name)
    console.warn(
      `[iran-map-vue] "${name}" catalog is missing, so that layer renders nothing. ` +
        `Import from '@msameim181/iran-map-vue/full' or pass it via the \`catalogs\` prop.`,
    )
  }
}
