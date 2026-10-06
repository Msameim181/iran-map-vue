import type { PropType } from 'vue'
import { iranMapDefaults } from '@msameim181/iran-map-core'
import type {
  IranMapCapitalLayer,
  IranMapCatalogs,
  IranMapColorBand,
  IranMapMode,
  IranMapRegion,
  IranMapValue,
  RegionAggregation,
} from './types'

const d = iranMapDefaults

/**
 * Props mirror the React `IranMapWrapperProps` and take their defaults from core, so the
 * wrappers cannot drift. Callbacks are emits (see `iranMapEmits`).
 *
 * Vue casts an absent Boolean prop to `false`; `showLabels`, `showWater` and `showIslands` are
 * declared with an `undefined` default so core can apply its own rules (labels in province mode;
 * "explicitly true" semantics for missing-catalog warnings).
 */
export const iranMapProps = {
  data: { type: Object as PropType<Record<string, IranMapValue>>, required: true as const },
  /** Catalog overrides merged over the entry's defaults (lean root, full preset in `/full`). */
  catalogs: { type: Object as PropType<Partial<IranMapCatalogs>>, default: undefined },
  width: { type: [Number, String] as PropType<number | string>, default: d.width },
  /** Legacy RGB triplet for automatic gradient coloring, e.g. "30, 70, 181". */
  colorRange: { type: String, default: d.colorRange },
  colorBands: { type: Array as PropType<IranMapColorBand[]>, default: undefined },
  mode: { type: String as PropType<IranMapMode>, default: d.mode },
  regions: { type: Array as PropType<IranMapRegion[]>, default: () => [] },
  detailedCounties: { type: Array as PropType<string[]>, default: () => [] },
  focusProvince: { type: String, default: undefined },
  focusPadding: { type: Number, default: d.focusPadding },
  regionAggregation: { type: String as PropType<RegionAggregation>, default: d.regionAggregation },
  textColor: { type: String, default: d.textColor },
  defaultSelectedProvince: { type: String, default: undefined },
  defaultSelectedArea: { type: String, default: undefined },
  /** Controlled selection (v-model:selected-area). `undefined` = uncontrolled, `null` = nothing selected. */
  selectedArea: { type: String as PropType<string | null>, default: undefined },
  selectedProvinceColor: { type: String, default: undefined },
  selectedAreaColor: { type: String, default: undefined },
  tooltipTitle: { type: String, default: d.tooltipTitle },
  deactiveProvinceColor: { type: String, default: d.deactiveProvinceColor },
  strokeColor: { type: String, default: d.strokeColor },
  strokeWidth: { type: Number, default: d.strokeWidth },
  className: { type: String, default: d.className },
  ariaLabel: { type: String, default: d.ariaLabel },
  showLabels: { type: Boolean, default: undefined },
  capitalMarkers: { type: String as PropType<IranMapCapitalLayer>, default: d.capitalMarkers },
  capitalMarkerColor: { type: String, default: d.capitalMarkerColor },
  capitalMarkerSize: { type: Number, default: d.capitalMarkerSize },
  showCapitalLabels: { type: Boolean, default: d.showCapitalLabels },
  showWater: { type: Boolean, default: undefined },
  waterColor: { type: String, default: d.waterColor },
  seaLabelColor: { type: String, default: d.seaLabelColor },
  showSeaLabels: { type: Boolean, default: d.showSeaLabels },
  showIslands: { type: Boolean, default: undefined },
  showIslandLabels: { type: Boolean, default: d.showIslandLabels },
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
