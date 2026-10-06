import { computed, defineComponent, getCurrentInstance, h, ref, watch } from 'vue'
import type { PropType, VNode } from 'vue'
import {
  addBand,
  applyDrafts,
  editBound,
  getBoundInputLimits,
  getColorInputValue,
  getDomainLabel,
  getDraftKey,
  getLegendItems,
  getScoreBandsHeading,
  getScoreBandsLabel,
  hasInvalidBands,
  isValidBand,
  isValidDomain,
  removeBand,
  scoreBandsDefaults as d,
  scoreBandsText as text,
  updateBand,
} from '@msameim181/iran-map-core'
import type { IranMapColorBand, ScoreBandDrafts, ScoreBandField, ScoreBandScale } from '@msameim181/iran-map-core'

const FIELDS: ScoreBandField[] = ['min', 'max']

export const ScoreBands = defineComponent({
  name: 'ScoreBands',
  props: {
    bands: { type: Array as PropType<IranMapColorBand[]>, required: true },
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
  },
  // `change` (React onChange equivalent) and `update:bands` (v-model:bands) carry the same payload.
  emits: ['change', 'update:bands'],
  setup(props, { emit }) {
    const instance = getCurrentInstance()!
    const drafts = ref<ScoreBandDrafts>({})
    watch(
      () => props.bands,
      () => (drafts.value = {}),
    )

    const validDomain = computed(() => isValidDomain(props.min, props.max, props.scale))
    const commit = (next: IranMapColorBand[]) => {
      emit('change', next)
      emit('update:bands', next)
    }
    // Editor mode is on iff the parent listens, like React's optional onChange.
    const editable = () => {
      const vnodeProps = instance.vnode.props || {}
      return !!(vnodeProps.onChange || vnodeProps['onUpdate:bands'])
    }
    const onBound = (index: number, field: ScoreBandField, value: string) => {
      const edit = editBound(props.bands, drafts.value, index, field, value, props.scale)
      drafts.value = edit.drafts
      if (edit.bands) commit(edit.bands)
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
                  onInput: textInput((value) => onBound(index, field, value)),
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
                onClick: () => commit(removeBand(props.bands, index)),
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
            onClick: () => commit(addBand(props.bands, props.min, props.max)),
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
