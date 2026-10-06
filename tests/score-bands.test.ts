import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { IranMap } from '../src/full'
import { ScoreBands } from '../src'
import type { IranMapColorBand } from '../src'
import { byTestId, fill, mountAttached } from './helpers'

const initialBands: IranMapColorBand[] = [
  { max: 50, color: '#facc15', label: 'Low' },
  { min: 50, color: '#ef4444', label: 'High' },
]

const hasText = (root: ParentNode, text: string) =>
  Array.from(root.querySelectorAll('*')).some((el) => el.children.length === 0 && el.textContent === text)

/** Input inside a <label> whose span text is `label` (accessible-name equivalent). */
const field = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('label'))
    .find((el) => el.querySelector('span')?.textContent === label)!
    .querySelector('input') as HTMLInputElement

const type = async (input: HTMLInputElement, value: string) => {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}

const band = (n: number) => document.querySelectorAll('fieldset')[n - 1] as HTMLFieldSetElement

describe('Standalone ScoreBands', () => {
  it('renders a read-only legend with range labels and no-data key anywhere', () => {
    const wrapper = mountAttached(ScoreBands, { props: { bands: initialBands } })
    const root = wrapper.element as HTMLElement
    expect(hasText(root, 'Score bands')).toBe(true)
    expect(hasText(root, '0 – 100')).toBe(true)
    expect(hasText(root, 'Below 50')).toBe(true)
    expect(hasText(root, '50 and above')).toBe(true)
    expect(hasText(root, 'No data')).toBe(true)
    expect(root.querySelector('input[type="number"]')).toBeNull()
    expect(root.querySelector('svg')).toBeNull()
  })

  it('supports arbitrary negative and decimal numeric domains and formatted values', async () => {
    const onChange = vi.fn()
    const wrapper = mountAttached(ScoreBands, {
      props: {
        bands: [{ min: -200.5, max: 1200.25, color: '#123456' }],
        onChange,
        scale: 'numeric',
        min: -500,
        max: 1500,
        metricLabel: 'Revenue',
        formatValue: (value: number) => `${value} USD`,
      },
    })
    expect(hasText(wrapper.element, '-500 USD – 1500 USD')).toBe(true)
    const minimum = field(wrapper.element, 'Minimum (inclusive)')
    expect(minimum.min).toBe('')
    await type(minimum, '-350.75')
    expect(onChange).toHaveBeenLastCalledWith([{ min: -350.75, max: 1200.25, color: '#123456' }])
  })

  it('does not commit reversed bounds or out-of-range score thresholds', async () => {
    const onChange = vi.fn()
    const wrapper = mountAttached(ScoreBands, { props: { bands: [{ min: 0, max: 50, color: '#123456' }], onChange } })
    const minimum = field(wrapper.element, 'Minimum (inclusive)')
    await type(minimum, '60')
    expect(onChange).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    await type(minimum, '-10')
    expect(onChange).not.toHaveBeenCalled()
    await type(minimum, '20')
    expect(onChange).toHaveBeenLastCalledWith([{ min: 20, max: 50, color: '#123456' }])
  })

  it('supports unbounded intervals, labels, colors, and adding/removing bands', async () => {
    const Harness = defineComponent({
      setup() {
        const bands = ref(initialBands)
        return () => h(ScoreBands, { bands: bands.value, onChange: (next: IranMapColorBand[]) => (bands.value = next) })
      },
    })
    const wrapper = mountAttached(Harness)
    const root = wrapper.element as HTMLElement
    const max = field(band(1), 'Maximum (exclusive)')
    await type(max, '')
    expect(hasText(root, 'All values')).toBe(false) // held back while typing
    max.dispatchEvent(new Event('change', { bubbles: true })) // blur/Enter commits the empty bound
    await nextTick()
    expect(hasText(root, 'All values')).toBe(true)
    await type(field(band(1), 'Label'), 'Custom category')
    expect(hasText(root, 'Custom category')).toBe(true)
    await type(field(band(1), 'Color'), '#abcdef')
    const button = (name: string) =>
      Array.from(root.querySelectorAll('button')).find((el) => el.textContent === name || el.ariaLabel === name)!
    button('Add band').click()
    await nextTick()
    expect(document.querySelectorAll('fieldset')).toHaveLength(3)
    button('Remove band 3').click()
    await nextTick()
    expect(document.querySelectorAll('fieldset')).toHaveLength(2)
  })

  it('supports v-model:bands as an editor trigger', async () => {
    const onUpdate = vi.fn()
    mountAttached(ScoreBands, { props: { bands: initialBands, 'onUpdate:bands': onUpdate } })
    await type(field(band(1), 'Label'), 'Renamed')
    expect(onUpdate).toHaveBeenLastCalledWith([{ ...initialBands[0], label: 'Renamed' }, initialBands[1]])
  })

  it('shares controlled bands with the map and respects half-open endpoints including 0 and 100', async () => {
    const Harness = defineComponent({
      setup() {
        const bands = ref(initialBands)
        return () => [
          h(ScoreBands, { bands: bands.value, onChange: (next: IranMapColorBand[]) => (bands.value = next) }),
          h(IranMap, { data: { tehran: 0, fars: 50, kerman: 100 }, colorBands: bands.value }),
        ]
      },
    })
    mountAttached(Harness)
    expect(fill(byTestId('iran-map-province-tehran'))).toBe('#facc15')
    expect(fill(byTestId('iran-map-province-fars'))).toBe('#ef4444')
    expect(fill(byTestId('iran-map-province-kerman'))).toBe('#ef4444')
    await type(field(band(1), 'Color'), '#abcdef')
    expect(fill(byTestId('iran-map-province-tehran'))).toBe('#abcdef')
  })

  it('supports vertical layout, custom no-data color, and an invalid display-domain message', () => {
    const wrapper = mountAttached(ScoreBands, {
      props: {
        bands: [],
        orientation: 'vertical',
        min: 100,
        max: 0,
        noDataColor: '#aaaaaa',
        noDataLabel: 'Unavailable',
      },
    })
    expect(wrapper.find('.iran-score-bands-legend--vertical').exists()).toBe(true)
    expect(hasText(wrapper.element, 'Unavailable')).toBe(true)
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(hasText(wrapper.element, 'No bands configured.')).toBe(true)
  })

  it('does not commit an empty bound while typing a negative number, only on blur', async () => {
    const onChange = vi.fn()
    const wrapper = mountAttached(ScoreBands, {
      props: { bands: [{ min: 10, max: 50, color: '#123456' }], scale: 'numeric', min: -100, max: 100, onChange },
    })
    const minimum = field(wrapper.element, 'Minimum (inclusive)')
    await type(minimum, '') // a number input reports '' for the partial entry "-"
    expect(onChange).not.toHaveBeenCalled()
    await type(minimum, '-5')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith([{ min: -5, max: 50, color: '#123456' }])
  })

  it('shows the editor when a listener is added after mount, or when editable is set', async () => {
    const wrapper = mountAttached(ScoreBands, { props: { bands: initialBands } })
    expect(wrapper.find('.iran-score-bands-editor').exists()).toBe(false)
    await wrapper.setProps({ onChange: () => undefined })
    expect(wrapper.find('.iran-score-bands-editor').exists()).toBe(true)
    await wrapper.setProps({ onChange: undefined, editable: true })
    expect(wrapper.find('.iran-score-bands-editor').exists()).toBe(true)
    await wrapper.setProps({ editable: false })
    expect(wrapper.find('.iran-score-bands-editor').exists()).toBe(false)
  })
})
