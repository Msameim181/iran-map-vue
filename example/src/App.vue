<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import { ScoreBands } from '../../src'
import { IranMap } from '../../src'
import { countyBoundaries, normalizeMapValue, provinceBoundaries } from './core'
import type {
  IranMapArea,
  IranMapCapital,
  IranMapCapitalLayer,
  IranMapCatalogs,
  IranMapColorBand,
  IranMapIsland,
  IranMapMode,
  IranMapRegion,
  IranMapValue,
} from './core'
import CountyEditor from './CountyEditor.vue'

type DemoMode = IranMapMode | 'mixed' | 'focus'

const modes: Array<{ id: DemoMode; label: string; caption: string }> = [
  { id: 'province', label: 'Provinces', caption: '31 administrative areas' },
  { id: 'county', label: 'Counties', caption: '478 detailed boundaries' },
  { id: 'mixed', label: 'Mixed detail', caption: 'Selected counties on provinces' },
  { id: 'focus', label: 'Province focus', caption: 'One province + selected counties' },
  { id: 'region', label: 'Custom regions', caption: 'Province groups + county detail' },
]

const regions: IranMapRegion[] = [
  {
    id: 'greater-khorasan',
    name: 'Greater Khorasan',
    faName: 'منطقه خراسان',
    provinces: ['razaviKhorasan', 'northKhorasan', 'southKhorasan'],
  },
  {
    id: 'northwest',
    name: 'Northwest',
    faName: 'منطقه شمال غرب',
    provinces: ['eastAzerbaijan', 'westAzerbaijan', 'ardabil', 'zanjan'],
  },
]

const detailCounties = ['razaviKhorasan.mashhad', 'tehran.tehran', 'fars.shiraz']
const focusCounties = ['razaviKhorasan.mashhad', 'razaviKhorasan.neyshabur', 'razaviKhorasan.torbatEHeydarieh']

const capitalLayers: Array<{ id: IranMapCapitalLayer; label: string }> = [
  { id: 'auto', label: 'Context' },
  { id: 'both', label: 'Both' },
  { id: 'none', label: 'Off' },
]

const defaultColorBands: IranMapColorBand[] = [
  { max: 25, color: '#bedfd5', label: 'Low' },
  { min: 25, max: 50, color: '#75b9ad', label: 'Watch' },
  { min: 50, max: 70, color: '#f2c15a', label: 'Elevated' },
  { min: 70, max: 85, color: '#e47b58', label: 'High' },
  { min: 85, color: '#a93f46', label: 'Critical' },
]

const provinceData = Object.fromEntries(
  provinceBoundaries.map((province, index) => [province.id, (index * 19 + 14) % 101]),
)
const countyData = Object.fromEntries(countyBoundaries.map((county, index) => [county.id, (index * 23 + 11) % 101]))

const demoData: Record<string, number> = {
  ...provinceData,
  ...countyData,
  'greater-khorasan': 76,
  northwest: 43,
  'razaviKhorasan.mashhad': 92,
  'tehran.tehran': 81,
  'fars.shiraz': 66,
}

type DataLevel = 'full' | 'standard' | 'lite' | 'mini'

// Presets load on demand, so the initial page does not pay for data it is not showing.
const dataLevels: Array<{ id: DataLevel; label: string; size: string; load: () => Promise<IranMapCatalogs> }> = [
  {
    id: 'full',
    label: 'Full',
    size: '~1.9 MB',
    load: () => import('@msameim181/iran-map-core/full').then((m) => m.fullCatalogs),
  },
  {
    id: 'standard',
    label: 'Standard',
    size: '~440 kB',
    load: () => import('@msameim181/iran-map-core/standard').then((m) => m.standardCatalogs),
  },
  {
    id: 'lite',
    label: 'Lite',
    size: '~200 kB',
    load: () => import('@msameim181/iran-map-core/lite').then((m) => m.liteCatalogs),
  },
  {
    id: 'mini',
    label: 'Mini',
    size: '~135 kB',
    load: () => import('@msameim181/iran-map-core/mini').then((m) => m.miniCatalogs),
  },
]
const dataLevel = ref<DataLevel>('full')
// shallowRef: the catalogs are multi-MB and must never be made deeply reactive.
const catalogs = shallowRef<IranMapCatalogs>()
const loadingLevel = ref(false)
let loadToken = 0
const loadLevel = async (level: DataLevel) => {
  const token = ++loadToken
  dataLevel.value = level
  loadingLevel.value = true
  const loaded = await dataLevels.find((item) => item.id === level)!.load()
  if (token !== loadToken) return // a newer choice superseded this one
  catalogs.value = loaded
  loadingLevel.value = false
  clearInspection()
}
onMounted(() => loadLevel(dataLevel.value))
const activeLevel = computed(() => dataLevels.find((item) => item.id === dataLevel.value))

const demoMode = ref<DemoMode>('mixed')
const selectedArea = ref<IranMapArea | null>(null)
const hoveredArea = ref<IranMapArea | null>(null)
const selectedCapital = ref<IranMapCapital | null>(null)
const capitalLayer = ref<IranMapCapitalLayer>('auto')
const showGeography = ref(true)
const selectedIsland = ref<IranMapIsland | null>(null)
const focusProvinceId = ref('razaviKhorasan')
const enabledCounties = reactive<Record<string, boolean>>(Object.fromEntries(focusCounties.map((id) => [id, true])))
const valueOverrides = reactive<Record<string, IranMapValue>>({})
const valueDrafts = reactive<Record<string, string>>({})
const disabledProvinceValues = reactive<Record<string, boolean>>({})
const colorBands = ref<IranMapColorBand[]>(defaultColorBands)
const bandScale = ref<'score' | 'numeric'>('score')
const domainMin = ref(0)
const domainMax = ref(100)
const metricLabel = ref('Score')
const metricName = computed(() => metricLabel.value.trim() || 'Score')

const data = computed<Record<string, IranMapValue>>(() => ({
  ...demoData,
  ...valueOverrides,
  ...(demoMode.value === 'focus' && disabledProvinceValues[focusProvinceId.value]
    ? { [focusProvinceId.value]: null }
    : {}),
}))
const provinceCounties = computed(() =>
  countyBoundaries.filter((county) => county.provinceId === focusProvinceId.value),
)
const selectedCountyIds = computed(() =>
  provinceCounties.value.filter((county) => enabledCounties[county.id]).map((county) => county.id),
)

const clearInspection = () => {
  selectedArea.value = null
  hoveredArea.value = null
  selectedCapital.value = null
  selectedIsland.value = null
}

const activeMode = computed<IranMapMode>(() =>
  demoMode.value === 'mixed' || demoMode.value === 'focus' ? 'province' : demoMode.value,
)
const activeModeCopy = computed(() => modes.find((mode) => mode.id === demoMode.value))
const inspectedArea = computed(() => hoveredArea.value || selectedArea.value)
const activeArea = computed(() => {
  const area = inspectedArea.value
  if (!area) return null
  return {
    ...area,
    value: Object.prototype.hasOwnProperty.call(data.value, area.id)
      ? normalizeMapValue(data.value[area.id])
      : area.value,
  }
})
const activeCapital = computed(() => (hoveredArea.value ? null : selectedCapital.value))
const inspectionLabel = computed(() =>
  hoveredArea.value
    ? 'Inspecting'
    : selectedIsland.value
      ? 'Iranian island'
      : activeCapital.value
        ? 'Capital point'
        : selectedArea.value
          ? 'Selected'
          : 'Try the map',
)
const inspectionName = computed(
  () => selectedIsland.value?.name ?? activeCapital.value?.name ?? activeArea.value?.name ?? 'Hover or select an area',
)
const inspectionFaName = computed(
  () =>
    selectedIsland.value?.faName ||
    activeCapital.value?.faName ||
    activeArea.value?.faName ||
    'استان‌ها و شهرستان‌ها تعاملی هستند',
)
const coordinateSource = computed(() => activeCapital.value || selectedIsland.value)
const scoreReadout = computed(() =>
  activeArea.value ? (activeArea.value.value === undefined ? 'No data' : String(activeArea.value.value)) : '—',
)

const mapKey = computed(
  () =>
    `${demoMode.value}-${
      demoMode.value === 'focus' ? `${focusProvinceId.value}-${!!disabledProvinceValues[focusProvinceId.value]}` : ''
    }`,
)
// Stable array identities: a fresh `[]` per render would make the map rebuild its model on every hover.
const noRegions: IranMapRegion[] = []
const noCounties: string[] = []
const activeRegions = computed(() => (demoMode.value === 'region' ? regions : noRegions))
const detailedCounties = computed(() =>
  demoMode.value === 'focus'
    ? selectedCountyIds.value
    : demoMode.value === 'mixed' || demoMode.value === 'region'
      ? detailCounties
      : noCounties,
)

const setMode = (mode: DemoMode) => {
  demoMode.value = mode
  clearInspection()
}
const onScaleChange = (event: Event) => {
  const scale = (event.target as HTMLSelectElement).value as 'score' | 'numeric'
  bandScale.value = scale
  if (scale === 'score') colorBands.value = defaultColorBands
}
const onFocusProvince = (event: Event) => {
  focusProvinceId.value = (event.target as HTMLSelectElement).value
  clearInspection()
}
const onUseProvinceValue = (event: Event) => {
  disabledProvinceValues[focusProvinceId.value] = !(event.target as HTMLInputElement).checked
  clearInspection()
}
const onCountyToggle = (id: string, enabled: boolean) => {
  enabledCounties[id] = enabled
  clearInspection()
}
const onCountyToggleAll = (enabled: boolean) => {
  for (const county of provinceCounties.value) enabledCounties[county.id] = enabled
  clearInspection()
}
const onCountyValue = (id: string, draft: string) => {
  valueDrafts[id] = draft
  const value = Number(draft)
  if (draft.trim() !== '' && Number.isFinite(value)) valueOverrides[id] = value
}
const onCountyNoData = (id: string, noData: boolean) => {
  const draft = valueDrafts[id]
  const previousValue = draft?.trim() ? normalizeMapValue(Number(draft)) : undefined
  const value = previousValue ?? demoData[id]
  valueOverrides[id] = noData ? null : value
  if (!noData) valueDrafts[id] = String(value)
}
const onSelect = (area: IranMapArea) => {
  selectedArea.value = area
  selectedCapital.value = null
  selectedIsland.value = null
}
const onCapitalSelect = (capital: IranMapCapital) => {
  selectedCapital.value = capital
  selectedArea.value = null
  selectedIsland.value = null
}
const onIslandSelect = (island: IranMapIsland) => {
  selectedIsland.value = island
  selectedCapital.value = null
}
</script>

<template>
  <main class="demo-shell">
    <header class="masthead">
      <div class="brand-lockup">
        <span class="brand-mark" aria-hidden="true">IR</span>
        <div>
          <p class="eyebrow">Vue Iran Map / live demo</p>
          <h1>Layer lab</h1>
        </div>
      </div>
      <div class="coverage-index" aria-label="Map coverage">
        <div>
          <strong>31</strong>
          <span>provinces</span>
        </div>
        <span class="coverage-arrow" aria-hidden="true">→</span>
        <div>
          <strong>478</strong>
          <span>counties</span>
        </div>
      </div>
    </header>

    <section class="workbench">
      <aside class="layer-panel" aria-label="Map controls">
        <div class="panel-heading">
          <p class="panel-kicker">Layer mode</p>
          <p>Switch the same Vue component between administrative views.</p>
        </div>

        <div class="mode-list" role="radiogroup" aria-label="Map display mode">
          <button
            v-for="(mode, index) in modes"
            :key="mode.id"
            type="button"
            role="radio"
            :aria-checked="demoMode === mode.id"
            :class="['mode-option', { 'is-active': demoMode === mode.id }]"
            @click="setMode(mode.id)"
          >
            <span class="mode-number">{{ String(index + 1).padStart(2, '0') }}</span>
            <span>
              <strong>{{ mode.label }}</strong>
              <small>{{ mode.caption }}</small>
            </span>
            <span class="mode-indicator" aria-hidden="true" />
          </button>
        </div>

        <div v-if="demoMode === 'focus'" class="focus-controls">
          <label class="focus-picker">
            <span class="panel-kicker">Focused Ostan</span>
            <select :value="focusProvinceId" @change="onFocusProvince">
              <option v-for="province in provinceBoundaries" :key="province.id" :value="province.id">
                {{ province.name }} — {{ province.faName }}
              </option>
            </select>
          </label>
          <label class="province-value-toggle">
            <input type="checkbox" :checked="!disabledProvinceValues[focusProvinceId]" @change="onUseProvinceValue" />
            <span>Use province value</span>
          </label>
          <p class="province-value-help">Turn off to leave the province gray and color only its selected counties.</p>
        </div>

        <div class="capital-control">
          <div class="capital-control-heading">
            <p class="panel-kicker">Capital points</p>
            <span>31 / 484</span>
          </div>
          <div class="capital-options" role="radiogroup" aria-label="Capital marker layer">
            <button
              v-for="layer in capitalLayers"
              :key="layer.id"
              type="button"
              role="radio"
              :aria-checked="capitalLayer === layer.id"
              :class="{ 'is-active': capitalLayer === layer.id }"
              @click="capitalLayer = layer.id"
            >
              {{ layer.label }}
            </button>
          </div>
          <small>Context follows the current province or county view.</small>
        </div>

        <div class="capital-control geography-control">
          <div class="capital-control-heading">
            <p class="panel-kicker">Geographic context</p>
            <span>3 seas + strait / 17 islands</span>
          </div>
          <div class="capital-options geography-options" role="radiogroup" aria-label="Geographic context layer">
            <button
              type="button"
              role="radio"
              :aria-checked="showGeography"
              :class="{ 'is-active': showGeography }"
              @click="showGeography = true"
            >
              Full
            </button>
            <button
              type="button"
              role="radio"
              :aria-checked="!showGeography"
              :class="{ 'is-active': !showGeography }"
              @click="showGeography = false"
            >
              Boundaries
            </button>
          </div>
          <small>Physical coastlines replace maritime administrative envelopes.</small>
        </div>

        <div class="capital-control data-control">
          <div class="capital-control-heading">
            <p class="panel-kicker">Data level</p>
            <span>{{ loadingLevel ? 'loading…' : `${activeLevel?.size} gz` }}</span>
          </div>
          <div class="capital-options data-options" role="radiogroup" aria-label="Map data level">
            <button
              v-for="level in dataLevels"
              :key="level.id"
              type="button"
              role="radio"
              :aria-checked="dataLevel === level.id"
              :class="{ 'is-active': dataLevel === level.id }"
              :title="`${level.label}: ${level.size} gzipped, all layers`"
              @click="loadLevel(level.id)"
            >
              {{ level.label }}
            </button>
          </div>
          <small>Same ids and names at every level; lighter levels simplify the borders.</small>
        </div>

        <div class="legend-block">
          <label class="metric-picker">
            <span class="panel-kicker">Metric name</span>
            <input v-model="metricLabel" type="text" maxlength="60" placeholder="Score" />
          </label>
          <label class="metric-picker">
            <span class="panel-kicker">Metric scale</span>
            <select :value="bandScale" @change="onScaleChange">
              <option value="score">Score: 0–100</option>
              <option value="numeric">Numeric: custom x–y</option>
            </select>
          </label>
          <div v-if="bandScale === 'numeric'" class="metric-domain">
            <label>
              Domain minimum
              <input v-model.number="domainMin" type="number" step="any" />
            </label>
            <label>
              Domain maximum
              <input v-model.number="domainMax" type="number" step="any" />
            </label>
          </div>
          <ScoreBands
            :bands="colorBands"
            :metric-label="metricName"
            :scale="bandScale"
            :min="bandScale === 'score' ? 0 : domainMin"
            :max="bandScale === 'score' ? 100 : domainMax"
            orientation="vertical"
          />
          <details class="demo-band-editor">
            <summary>Edit bands</summary>
            <ScoreBands
              v-model:bands="colorBands"
              :metric-label="metricName"
              :scale="bandScale"
              :min="bandScale === 'score' ? 0 : domainMin"
              :max="bandScale === 'score' ? 100 : domainMax"
              :show-no-data="false"
            />
          </details>
        </div>
      </aside>

      <div :class="['map-stage', { 'has-county-editor': demoMode === 'focus' }]">
        <div class="stage-meta">
          <div>
            <span class="live-dot" aria-hidden="true" />
            <span>Live layer</span>
            <strong>{{ activeModeCopy?.label }}</strong>
          </div>
          <p>
            {{
              demoMode === 'mixed'
                ? 'Mashhad, Tehran and Shiraz are independently selectable.'
                : activeModeCopy?.caption
            }}
          </p>
        </div>

        <CountyEditor
          v-if="demoMode === 'focus'"
          :key="focusProvinceId"
          :counties="provinceCounties"
          :enabled-counties="enabledCounties"
          :values="data"
          :value-drafts="valueDrafts"
          :metric-name="metricName"
          @toggle="onCountyToggle"
          @toggle-all="onCountyToggleAll"
          @value-change="onCountyValue"
          @no-data-change="onCountyNoData"
        />

        <div :key="mapKey" class="map-canvas">
          <p v-if="!catalogs" class="map-loading" role="status">Loading map data…</p>
          <IranMap
            v-else
            :catalogs="catalogs"
            :mode="activeMode"
            :focus-province="demoMode === 'focus' ? focusProvinceId : undefined"
            :regions="activeRegions"
            :detailed-counties="detailedCounties"
            :data="data"
            :color-bands="colorBands"
            width="100%"
            deactive-province-color="#e6e6e6"
            selected-area-color="#123f4b"
            stroke-color="#f8faf7"
            :stroke-width="0.35"
            :tooltip-title="`${metricName}:`"
            :capital-markers="capitalLayer"
            capital-marker-color="#123f4b"
            :capital-marker-size="demoMode === 'county' ? 3.2 : 4"
            :show-labels="demoMode === 'province' || demoMode === 'mixed' || demoMode === 'focus'"
            :show-water="showGeography"
            :show-sea-labels="showGeography"
            :show-islands="showGeography"
            :show-island-labels="showGeography"
            :aria-label="`Iran map in ${activeModeCopy?.label.toLowerCase()} mode`"
            @select="onSelect"
            @deselect="clearInspection"
            @hover="hoveredArea = $event"
            @capital-select="onCapitalSelect"
            @island-select="onIslandSelect"
          />
        </div>

        <footer class="inspection-strip" aria-live="polite">
          <div>
            <span class="inspection-label">{{ inspectionLabel }}</span>
            <strong>{{ inspectionName }}</strong>
            <small lang="fa" dir="rtl">{{ inspectionFaName }}</small>
          </div>
          <div class="score-readout">
            <span>{{ coordinateSource ? 'Coordinates' : metricName }}</span>
            <small v-if="coordinateSource">
              {{ coordinateSource.latitude.toFixed(4) }}° N<br />
              {{ coordinateSource.longitude.toFixed(4) }}° E
            </small>
            <strong v-else>{{ scoreReadout }}</strong>
          </div>
        </footer>
      </div>
    </section>
  </main>
</template>
