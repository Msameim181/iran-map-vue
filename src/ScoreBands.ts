import { computed, defineComponent, getCurrentInstance, h, ref, watch } from 'vue'
import type { PropType, VNode } from 'vue'
import { isValidBand, isValidDomain, parseBound, rangeLabel } from './bands'
import type { BandScale, BoundField } from './bands'
import type { IranMapColorBand } from './types'

const FIELDS: BoundField[] = ['min', 'max']

export const ScoreBands = defineComponent({
  name: 'ScoreBands',
  props: {
    bands: { type: Array as PropType<IranMapColorBand[]>, required: true as const },
    scale: { type: String as PropType<BandScale>, default: 'score' },
    /** Display domain. Defaults to 0–100; numeric scales may use any finite x–y domain. */
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    metricLabel: { type: String, default: 'Score' },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, default: 'horizontal' },
    formatValue: { type: Function as PropType<(value: number) => string>, default: String },
    showNoData: { type: Boolean, default: true },
    noDataColor: { type: String, default: '#e6e6e6' },
    noDataLabel: { type: String, default: 'No data' },
    className: { type: String, default: '' },
  },
  // `change` (React onChange equivalent) and `update:bands` (v-model:bands) carry the same payload.
  emits: ['change', 'update:bands'],
  setup(props, { emit }) {
    const instance = getCurrentInstance()!
    const drafts = ref<Record<string, string>>({})
    watch(
      () => props.bands,
      () => (drafts.value = {}),
    )

    const label = computed(() => props.metricLabel.trim() || 'Score')
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

    const draftBand = (band: IranMapColorBand, index: number) => {
      const result = { ...band }
      for (const field of FIELDS) {
        const draft = drafts.value[`${index}:${field}`]
        if (draft !== undefined) result[field] = parseBound(draft)
      }
      return result
    }
    const patch = (index: number, change: Partial<IranMapColorBand>) =>
      commit(props.bands.map((item, position) => (position === index ? { ...item, ...change } : item)))
    const updateBound = (index: number, field: BoundField, draft: string) => {
      drafts.value = { ...drafts.value, [`${index}:${field}`]: draft }
      const band = { ...draftBand(props.bands[index], index), [field]: parseBound(draft) }
      if (isValidBand(band, props.scale)) {
        commit(props.bands.map((item, position) => (position === index ? band : item)))
      }
    }

    const swatch = (color: string) =>
      h('span', { class: 'iran-score-bands-swatch', style: { backgroundColor: color }, 'aria-hidden': 'true' })

    return () => {
      const format = props.formatValue
      const invalid = props.bands.some((band, index) => !isValidBand(draftBand(band, index), props.scale))
      const children: VNode[] = [
        h('header', { class: 'iran-score-bands-heading' }, [
          h('h2', `${label.value} bands`),
          validDomain.value ? h('span', `${format(props.min)} – ${format(props.max)}`) : null,
        ]),
        validDomain.value
          ? null
          : h(
              'p',
              { role: 'alert' },
              'Use finite display endpoints with minimum below maximum. Score domains must stay within 0–100.',
            ),
        h('ul', { class: ['iran-score-bands-legend', `iran-score-bands-legend--${props.orientation}`] }, [
          ...props.bands.map((band, index) =>
            h('li', { key: index }, [
              swatch(band.color),
              h('strong', band.label || rangeLabel(band, format)),
              band.label ? h('small', rangeLabel(band, format)) : null,
            ]),
          ),
          props.showNoData ? h('li', [swatch(props.noDataColor), h('strong', props.noDataLabel)]) : null,
        ]),
        props.bands.length === 0 ? h('p', 'No bands configured.') : null,
      ].filter(Boolean) as VNode[]

      if (editable()) {
        children.push(
          h('div', { class: 'iran-score-bands-editor' }, [
            ...props.bands.map((band, index) =>
              h('fieldset', { key: index }, [
                h('legend', `Band ${index + 1}`),
                h('label', [
                  h('span', 'Label'),
                  h('input', {
                    type: 'text',
                    value: band.label || '',
                    onInput: (event: Event) => patch(index, { label: (event.target as HTMLInputElement).value }),
                  }),
                ]),
                ...FIELDS.map((field) =>
                  h('label', { key: field }, [
                    h('span', field === 'min' ? 'Minimum (inclusive)' : 'Maximum (exclusive)'),
                    h('input', {
                      type: 'number',
                      step: 'any',
                      min: props.scale === 'score' ? 0 : undefined,
                      max: props.scale === 'score' ? 100 : undefined,
                      placeholder: 'Unbounded',
                      value: drafts.value[`${index}:${field}`] ?? band[field] ?? '',
                      'aria-invalid': !isValidBand(draftBand(band, index), props.scale),
                      onInput: (event: Event) => updateBound(index, field, (event.target as HTMLInputElement).value),
                    }),
                  ]),
                ),
                h('label', [
                  h('span', 'Color'),
                  h('input', {
                    type: 'color',
                    value: /^#[\da-f]{6}$/i.test(band.color) ? band.color : '#000000',
                    onInput: (event: Event) => patch(index, { color: (event.target as HTMLInputElement).value }),
                  }),
                ]),
                h(
                  'button',
                  {
                    type: 'button',
                    'aria-label': `Remove band ${index + 1}`,
                    onClick: () => commit(props.bands.filter((_, position) => position !== index)),
                  },
                  'Remove',
                ),
              ]),
            ),
            invalid
              ? h(
                  'p',
                  { role: 'alert' },
                  'Use finite bounds with minimum below maximum. Score bounds must be between 0 and 100. Invalid edits do not change the map.',
                )
              : null,
            h(
              'button',
              {
                type: 'button',
                disabled: !validDomain.value,
                onClick: () =>
                  commit([...props.bands, { min: props.min, max: props.max, color: '#75b9ad', label: 'New band' }]),
              },
              'Add band',
            ),
            h('p', 'Blank bounds are unbounded. Bands are matched in order; the first matching band wins.'),
          ]),
        )
      }

      return h(
        'section',
        { class: ['iran-score-bands', props.className], 'aria-label': `${label.value} bands` },
        children,
      )
    }
  },
})
