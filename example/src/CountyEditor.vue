<script setup lang="ts">
import { computed, ref } from 'vue'
import { normalizeMapValue } from './core'
import type { IranMapValue, MapBoundary } from './core'

const props = defineProps<{
  counties: MapBoundary[]
  enabledCounties: Record<string, boolean>
  values: Record<string, IranMapValue>
  valueDrafts: Record<string, string>
  metricName: string
}>()

const emit = defineEmits<{
  toggle: [id: string, enabled: boolean]
  'toggle-all': [enabled: boolean]
  'value-change': [id: string, draft: string]
  'no-data-change': [id: string, noData: boolean]
}>()

const search = ref('')
const visibleCounties = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return props.counties.filter((county) => `${county.name} ${county.faName}`.toLocaleLowerCase().includes(query))
})
const enabledCount = computed(() => props.counties.filter((county) => props.enabledCounties[county.id]).length)

const draftOf = (id: string) => props.valueDrafts[id] ?? String(props.values[id] ?? '')
const isNoData = (id: string) => normalizeMapValue(props.values[id]) === undefined
const isInvalid = (id: string) => {
  const draft = draftOf(id)
  return !isNoData(id) && (draft.trim() === '' || !Number.isFinite(Number(draft)))
}
const hasDraftError = computed(() =>
  props.counties.some((county) => {
    const draft = props.valueDrafts[county.id]
    return (
      props.enabledCounties[county.id] &&
      !isNoData(county.id) &&
      draft !== undefined &&
      (draft.trim() === '' || !Number.isFinite(Number(draft)))
    )
  }),
)
</script>

<template>
  <section class="county-editor" aria-label="Province county editor">
    <div class="county-editor-heading">
      <div>
        <h2 class="panel-kicker">County detail</h2>
        <p aria-live="polite">{{ enabledCount }} of {{ counties.length }} counties enabled</p>
      </div>
      <div class="county-actions">
        <button type="button" :disabled="enabledCount === counties.length" @click="emit('toggle-all', true)">
          Enable all counties
        </button>
        <button type="button" :disabled="enabledCount === 0" @click="emit('toggle-all', false)">Clear selection</button>
      </div>
    </div>
    <label class="county-search">
      <span>Find a county</span>
      <input v-model="search" type="search" placeholder="English or فارسی" />
    </label>
    <p id="county-value-help" class="county-editor-help">
      Enable a county to show its boundary, then edit its {{ metricName.toLocaleLowerCase() }}. Colors update instantly.
    </p>
    <div class="county-list">
      <template v-if="visibleCounties.length">
        <div
          v-for="county in visibleCounties"
          :key="county.id"
          :class="['county-row', { 'is-enabled': enabledCounties[county.id] }]"
        >
          <label class="county-toggle">
            <input
              type="checkbox"
              :checked="!!enabledCounties[county.id]"
              :aria-label="`Show ${county.name}`"
              @change="emit('toggle', county.id, ($event.target as HTMLInputElement).checked)"
            />
            <span>
              <strong>{{ county.name }}</strong>
              <small lang="fa" dir="rtl">{{ county.faName }}</small>
            </span>
          </label>
          <input
            class="county-value"
            type="number"
            step="any"
            :value="draftOf(county.id)"
            :disabled="!enabledCounties[county.id] || isNoData(county.id)"
            :aria-label="`${county.name} ${metricName}`"
            :aria-invalid="!!enabledCounties[county.id] && isInvalid(county.id)"
            :aria-describedby="
              enabledCounties[county.id] && isInvalid(county.id) ? 'county-value-error' : 'county-value-help'
            "
            @input="emit('value-change', county.id, ($event.target as HTMLInputElement).value)"
          />
          <label class="county-no-data">
            <input
              type="checkbox"
              :checked="isNoData(county.id)"
              :disabled="!enabledCounties[county.id]"
              :aria-label="`${county.name} has no data`"
              @change="emit('no-data-change', county.id, ($event.target as HTMLInputElement).checked)"
            />
            No data
          </label>
        </div>
      </template>
      <p v-else class="county-empty">No counties match. Try another English or Persian name.</p>
    </div>
    <p v-if="hasDraftError" id="county-value-error" class="county-value-error" role="status">
      Enter a number. The map keeps the last valid value while a field is empty or invalid.
    </p>
  </section>
</template>
