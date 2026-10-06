import type { PropType } from 'vue'
import type { IranMapCatalogs } from './core'
import type {
  IranMapCapitalLayer,
  IranMapColorBand,
  IranMapMode,
  IranMapRegion,
  IranMapValue,
  RegionAggregation,
} from './types'

/** Props mirror the React `IranMapWrapperProps`; callbacks are emits (see `iranMapEmits`). */
export const iranMapProps = {
  data: { type: Object as PropType<Record<string, IranMapValue>>, required: true as const },
  /** Catalog overrides merged over the entry's defaults (lean root, full preset in `/full`). */
  catalogs: { type: Object as PropType<Partial<IranMapCatalogs>>, default: undefined },
  width: { type: [Number, String] as PropType<number | string>, default: undefined },
  /** Legacy RGB triplet for automatic gradient coloring, e.g. "30, 70, 181". */
  colorRange: { type: String, default: '30, 70, 181' },
  colorBands: { type: Array as PropType<IranMapColorBand[]>, default: undefined },
  mode: { type: String as PropType<IranMapMode>, default: 'province' },
  regions: { type: Array as PropType<IranMapRegion[]>, default: () => [] },
  detailedCounties: { type: Array as PropType<string[]>, default: () => [] },
  focusProvince: { type: String, default: undefined },
  focusPadding: { type: Number, default: 28 },
  regionAggregation: { type: String as PropType<RegionAggregation>, default: 'sum' },
  textColor: { type: String, default: '#000' },
  defaultSelectedProvince: { type: String, default: undefined },
  defaultSelectedArea: { type: String, default: undefined },
  /** Controlled selection (v-model:selected-area). `undefined` = uncontrolled, `null` = nothing selected. */
  selectedArea: { type: String as PropType<string | null>, default: undefined },
  selectedProvinceColor: { type: String, default: undefined },
  selectedAreaColor: { type: String, default: undefined },
  tooltipTitle: { type: String, default: '' },
  deactiveProvinceColor: { type: String, default: '#e6e6e6' },
  strokeColor: { type: String, default: '#ffffff' },
  strokeWidth: { type: Number, default: 0.35 },
  className: { type: String, default: '' },
  ariaLabel: { type: String, default: 'Interactive map of Iran' },
  /** Defaults to true in province mode. Declared with an undefined default so Vue does not cast absent to false. */
  showLabels: { type: Boolean, default: undefined },
  capitalMarkers: { type: String as PropType<IranMapCapitalLayer>, default: 'none' },
  capitalMarkerColor: { type: String, default: '#123f4b' },
  capitalMarkerSize: { type: Number, default: 4 },
  showCapitalLabels: { type: Boolean, default: false },
  showWater: { type: Boolean, default: true },
  waterColor: { type: String, default: '#dcebed' },
  seaLabelColor: { type: String, default: '#477983' },
  showSeaLabels: { type: Boolean, default: true },
  showIslands: { type: Boolean, default: true },
  showIslandLabels: { type: Boolean, default: true },
}

export const iranMapEmits = [
  'select',
  'deselect',
  'hover',
  'capital-select',
  'island-select',
  'select-province',
  'update:selectedArea',
]
