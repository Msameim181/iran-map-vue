import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { IranMap } from '../src/full'
import { allByTestId, byTestId, count, fill, mountAttached } from './helpers'

const data = { tehran: 60, fars: 80, 'tehran.tehran': 75 }
const bands = [{ color: '#abcdef' }]

const click = async (el: Element) => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await nextTick()
}
const key = async (el: Element, pressed: string, init: KeyboardEventInit = {}) => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: pressed, bubbles: true, cancelable: true, ...init }))
  // Space activates on keyup, like a native button.
  if (pressed === ' ') el.dispatchEvent(new KeyboardEvent('keyup', { key: pressed, bubbles: true, cancelable: true }))
  await nextTick()
}
const base = { data, colorBands: bands, selectedAreaColor: '#123f4b' }

describe('Dismissible map selection', () => {
  it.each(['province', 'county'] as const)(
    'toggles the same %s off and notifies without changing select arguments',
    async (mode) => {
      const onSelect = vi.fn()
      const onDeselect = vi.fn()
      const onHover = vi.fn()
      mountAttached(IranMap, { props: { ...base, mode, onSelect, onDeselect, onHover } })
      const id = mode === 'province' ? 'tehran' : 'tehran.tehran'
      const area = byTestId(`iran-map-${mode}-${id}`)
      await click(area)
      expect(fill(area)).toBe('#123f4b')
      expect(area.getAttribute('aria-pressed')).toBe('true')
      await click(area)
      expect(fill(area)).toBe('#abcdef')
      expect(area.getAttribute('aria-pressed')).toBe('false')
      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id, type: mode }))
      expect(onDeselect).toHaveBeenCalledTimes(1)
      expect(onHover).toHaveBeenLastCalledWith(null)
    },
  )

  it('moves selection directly to another area without deselecting it through the document listener', async () => {
    const onDeselect = vi.fn()
    mountAttached(IranMap, { props: { ...base, onDeselect } })
    const first = byTestId('iran-map-province-tehran')
    const second = byTestId('iran-map-province-fars')
    await click(first)
    await click(second)
    expect(fill(first)).toBe('#abcdef')
    expect(fill(second)).toBe('#123f4b')
    expect(onDeselect).not.toHaveBeenCalled()
  })

  it.each(['outside', 'background', 'water', 'label'] as const)('clears selection on a %s click', async (target) => {
    const onDeselect = vi.fn()
    const wrapper = mountAttached(IranMap, { props: { ...base, onDeselect } })
    const area = byTestId('iran-map-province-tehran')
    await click(area)
    const node =
      target === 'outside'
        ? document.body
        : target === 'background'
          ? wrapper.get('svg').element
          : target === 'water'
            ? document.querySelector('[data-water-id]')!
            : document.querySelector('.iran-map-label')!
    await click(node)
    expect(fill(area)).toBe('#abcdef')
    expect(onDeselect).toHaveBeenCalledTimes(1)
    await click(document.body)
    expect(onDeselect).toHaveBeenCalledTimes(1)
  })

  it('supports keyboard toggling and dismissing a default selection', async () => {
    mountAttached(IranMap, { props: { ...base, defaultSelectedProvince: 'tehran' } })
    const area = byTestId('iran-map-province-tehran')
    expect(area.getAttribute('aria-pressed')).toBe('true')
    await key(area, 'Enter')
    expect(area.getAttribute('aria-pressed')).toBe('false')
    await key(area, ' ')
    expect(area.getAttribute('aria-pressed')).toBe('true')
    await click(document.body)
    expect(area.getAttribute('aria-pressed')).toBe('false')
  })

  it('treats grouped province paths as one selected region', async () => {
    mountAttached(IranMap, {
      props: {
        ...base,
        mode: 'region',
        regions: [{ id: 'group', name: 'Group', provinces: ['tehran', 'fars'] }],
        data: { group: 70 },
      },
    })
    const fragments = allByTestId('iran-map-region-group')
    await click(fragments[0])
    expect(fragments.every((path) => path.getAttribute('aria-pressed') === 'true')).toBe(true)
    await click(fragments[1])
    expect(fragments.every((path) => path.getAttribute('aria-pressed') === 'false')).toBe(true)
  })

  it('emits select-province (legacy selectProvinceHandler) and reports unselecting', async () => {
    const onSelectProvince = vi.fn()
    mountAttached(IranMap, { props: { data, onSelectProvince } })
    const area = byTestId('iran-map-province-tehran')
    await click(area)
    expect(onSelectProvince).toHaveBeenLastCalledWith({ name: 'tehran', faName: expect.any(String) })
    await click(area)
    expect(onSelectProvince).toHaveBeenLastCalledWith({ name: undefined, faName: undefined })
  })

  it('clears only the other map when interacting with multiple map instances', async () => {
    const onDeselect = vi.fn()
    mountAttached(
      defineComponent({
        render: () => [h(IranMap, { data, onDeselect }), h(IranMap, { data })],
      }),
    )
    const [first, second] = allByTestId('iran-map-province-tehran')
    await click(first)
    await click(second)
    expect(first.getAttribute('aria-pressed')).toBe('false')
    expect(second.getAttribute('aria-pressed')).toBe('true')
    expect(onDeselect).toHaveBeenCalledTimes(1)
  })

  it('removes its document handler when unmounted', async () => {
    const onDeselect = vi.fn()
    const wrapper = mountAttached(IranMap, { props: { data, onDeselect } })
    await click(byTestId('iran-map-province-tehran'))
    wrapper.unmount()
    await click(document.body)
    expect(onDeselect).not.toHaveBeenCalled()
    expect(count('.iran-map-wrapper')).toBe(0)
  })

  it('supports a controlled selectedArea with update:selectedArea (v-model)', async () => {
    const onUpdate = vi.fn()
    const wrapper = mountAttached(IranMap, {
      props: { ...base, selectedArea: 'fars', 'onUpdate:selectedArea': onUpdate },
    })
    expect(byTestId('iran-map-province-fars').getAttribute('aria-pressed')).toBe('true')
    await click(byTestId('iran-map-province-tehran'))
    expect(onUpdate).toHaveBeenLastCalledWith('tehran')
    // Controlled: stays on fars until the parent updates the prop.
    expect(byTestId('iran-map-province-fars').getAttribute('aria-pressed')).toBe('true')
    await wrapper.setProps({ selectedArea: 'tehran' })
    expect(byTestId('iran-map-province-tehran').getAttribute('aria-pressed')).toBe('true')
    await click(document.body)
    expect(onUpdate).toHaveBeenLastCalledWith(null)
  })

  it('shows the native tooltip on hover/focus and dismisses it on an outside tap', async () => {
    mountAttached(IranMap, { props: { data } })
    const area = byTestId('iran-map-province-tehran')
    // Created lazily, in <body>, on first use.
    expect(document.querySelector('.iran-map-tooltip')).toBeNull()

    // Browsers emulate hover on tap, so a touch tap arrives as mouseover + click.
    area.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: 10, clientY: 10 }))
    await nextTick()
    const tooltip = document.querySelector('.iran-map-tooltip') as HTMLElement
    expect(tooltip.hidden).toBe(false)
    expect(tooltip.textContent).toBe(area.getAttribute('aria-label'))

    await click(document.body)
    expect(tooltip.hidden).toBe(true)

    area.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(tooltip.hidden).toBe(false)
    await key(area, 'Escape')
    expect(tooltip.hidden).toBe(true)
  })
})
