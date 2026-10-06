import { computed, defineComponent, getCurrentInstance, h, ref, toRaw, watch } from 'vue'
import type { ExtractPublicPropTypes, PropType, VNode } from 'vue'
import {
  addBand,
  applyDrafts,
  commitDraft,
  getBoundInputLimits,
  getColorInputValue,
  getDomainLabel,
  getDraftKey,
  setDraft,
  getLegendItems,
  getScoreBandsHeading,
  getScoreBandsLabel,
  hasInvalidBands,
  isValidBand,
  isValidDomain,
  removeBandWithDrafts,
  scoreBandsDefaults as d,
  scoreBandsText as text,
  updateBand,
} from '@msameim181/iran-map-core'
import type { IranMapColorBand, ScoreBandDrafts, ScoreBandField, ScoreBandScale } from '@msameim181/iran-map-core'
import { hasListener } from './listeners.js'

const FIELDS: ScoreBandField[] = ['min', 'max']

const scoreBandsProps = {
  bands: { type: Array as PropType<IranMapColorBand[]>, required: true as const },
  scale: { type: String as PropType<ScoreBandScale>, default: d.scale },
  /** Display domain. Defaults to 0–100; numeric scales may use any finite x–y domain. */
  min: { type: Number, default: d.min },
  max: { type: Number, default: d.max },
  metricLabel: { type: String, default: d.metricLabel },
  orientation: { type: String as PropType<'horizontal' | 'vertical'>, default: d.orientation },
  formatValue: { type: Function as PropType<(value: number) => string>, default: String },
  showNoData: { type: Boolean, default: d.showNoData },
  noDataColor: { type: String, default: d.noDataColor },
  noDataLabel: { type: String, default: d.noDataLabel },
  className: { type: String, default: '' },
  /**
   * Show the editor. Defaults to "a `change` or `update:bands` listener is attached" (checked on
   * every render); set it explicitly when listeners are added or removed dynamically.
   */
  editable: { type: Boolean, default: undefined },
}

export const ScoreBands = /* @__PURE__ */ defineComponent({
  name: 'ScoreBands',
  props: scoreBandsProps,
  // `change` (React onChange equivalent) and `update:bands` (v-model:bands) carry the same payload.
  emits: {
    change: (_bands: IranMapColorBand[]) => true,
    'update:bands': (_bands: IranMapColorBand[]) => true,
  },
  setup(props, { emit }) {
    const instance = getCurrentInstance()!
    const drafts = ref<ScoreBandDrafts>({})
    // Drafts belong to the committed bands we emitted; bands replaced from outside reset them.
    let lastEmitted: IranMapColorBand[] | undefined
    watch(
      () => props.bands,
      (bands) => {
        // toRaw: a parent holding the bands in a ref sees (and passes back) a reactive proxy.
        if (toRaw(bands) !== lastEmitted) drafts.value = {}
      },
    )

    const validDomain = computed(() => isValidDomain(props.min, props.max, props.scale))
    const commit = (next: IranMapColorBand[]) => {
      lastEmitted = toRaw(next)
      emit('change', next)
      emit('update:bands', next)
    }
    // Editor mode defaults to "the parent listens", like React's optional onChange.
    const editable = () => props.editable ?? hasListener(instance, 'onChange', 'onUpdate:bands')
    // Typing only records text; the band changes on blur/Enter (the native `change` event), when a
    // blank bound becomes "unbounded". A partial entry such as "-" (badInput) never commits.
    const onBoundInput = (index: number, field: ScoreBandField, event: Event) => {
      const input = event.target as HTMLInputElement
      // A number input reports '' for a partial entry ("-", "3-0"); recording that would later
      // commit as "unbounded". Only a field the person really cleared counts as blank.
      if (input.validity?.badInput) return
      drafts.value = setDraft(drafts.value, index, field, input.value)
    }
    const onBoundChange = (index: number, field: ScoreBandField, event: Event) => {
      const input = event.target as HTMLInputElement
      if (input.validity?.badInput) return
      const withText = setDraft(drafts.value, index, field, input.value)
      const edit = commitDraft(props.bands, withText, index, props.scale)
      drafts.value = edit.drafts
      if (edit.bands) commit(edit.bands)
    }
    const removeAt = (index: number) => {
      const result = removeBandWithDrafts(props.bands, drafts.value, index)
      drafts.value = result.drafts
      commit(result.bands)
    }
    const textInput = (handler: (value: string) => void) => (event: Event) =>
      handler((event.target as HTMLInputElement).value)
    const swatch = (color: string) =>
      h('span', { class: 'iran-score-bands-swatch', style: { backgroundColor: color }, 'aria-hidden': 'true' })

    const renderEditor = (): VNode => {
      const limits = getBoundInputLimits(props.scale)
      return h('div', { class: 'iran-score-bands-editor' }, [
        ...props.bands.map((band, index) =>
          h('fieldset', { key: index }, [
            h('legend', `Band ${index + 1}`),
            h('label', [
              h('span', 'Label'),
              h('input', {
                type: 'text',
                value: band.label || '',
                onInput: textInput((label) => commit(updateBand(props.bands, index, { label }))),
              }),
            ]),
            ...FIELDS.map((field) =>
              h('label', { key: field }, [
                h('span', field === 'min' ? text.minimumLabel : text.maximumLabel),
                h('input', {
                  type: 'number',
                  step: 'any',
                  min: limits.min,
                  max: limits.max,
                  placeholder: 'Unbounded',
                  value: drafts.value[getDraftKey(index, field)] ?? band[field] ?? '',
                  'aria-invalid': !isValidBand(applyDrafts(band, drafts.value, index), props.scale),
                  onInput: (event: Event) => onBoundInput(index, field, event),
                  onChange: (event: Event) => onBoundChange(index, field, event),
                }),
              ]),
            ),
            h('label', [
              h('span', 'Color'),
              h('input', {
                type: 'color',
                value: getColorInputValue(band.color),
                onInput: textInput((color) => commit(updateBand(props.bands, index, { color }))),
              }),
            ]),
            h(
              'button',
              {
                type: 'button',
                'aria-label': `Remove band ${index + 1}`,
                onClick: () => removeAt(index),
              },
              text.removeBand,
            ),
          ]),
        ),
        hasInvalidBands(props.bands, drafts.value, props.scale) ? h('p', { role: 'alert' }, text.invalidBands) : null,
        h(
          'button',
          {
            type: 'button',
            disabled: !validDomain.value,
            onClick: () => commit(addBand(props.bands, props.min)),
          },
          text.addBand,
        ),
        h('p', text.help),
      ])
    }

    return () => {
      const label = getScoreBandsLabel(props.metricLabel)
      const legend = getLegendItems(props.bands, {
        formatValue: props.formatValue,
        showNoData: props.showNoData,
        noDataColor: props.noDataColor,
        noDataLabel: props.noDataLabel,
      })
      return h('section', { class: ['iran-score-bands', props.className], 'aria-label': `${label} bands` }, [
        h('header', { class: 'iran-score-bands-heading' }, [
          h('h2', getScoreBandsHeading(props.metricLabel)),
          validDomain.value ? h('span', getDomainLabel(props.min, props.max, props.formatValue)) : null,
        ]),
        validDomain.value ? null : h('p', { role: 'alert' }, text.invalidDomain),
        h(
          'ul',
          { class: ['iran-score-bands-legend', `iran-score-bands-legend--${props.orientation}`] },
          legend.map((item, index) =>
            h('li', { key: index }, [
              swatch(item.color),
              h('strong', item.title),
              item.range ? h('small', item.range) : null,
            ]),
          ),
        ),
        props.bands.length === 0 ? h('p', text.noBands) : null,
        editable() ? renderEditor() : null,
      ])
    }
  },
})

/** Props accepted by `ScoreBands`. */
export type ScoreBandsProps = ExtractPublicPropTypes<typeof scoreBandsProps>
