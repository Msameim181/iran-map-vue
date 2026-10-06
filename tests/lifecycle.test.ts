import { describe, expect, it, vi } from 'vitest'
import { KeepAlive, defineComponent, h, nextTick, ref } from 'vue'
import { IranMap } from '../src/full'
import { byTestId, mountAttached } from './helpers'

const data = { tehran: 60, fars: 80 }
const click = async (el: Element) => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await nextTick()
}

describe('lifecycle', () => {
  it('stops dismissing selection while deactivated inside <KeepAlive>, and resumes when activated', async () => {
    const onDeselect = vi.fn()
    const active = ref(true)
    mountAttached(
      defineComponent({
        render: () => h(KeepAlive, null, [active.value ? h(IranMap, { data, onDeselect }) : h('div')]),
      }),
    )
    await click(byTestId('iran-map-province-tehran'))
    active.value = false
    await nextTick()
    await click(document.body)
    expect(onDeselect).not.toHaveBeenCalled()

    active.value = true
    await nextTick()
    expect(byTestId('iran-map-province-tehran').getAttribute('aria-pressed')).toBe('true')
    await click(document.body)
    expect(onDeselect).toHaveBeenCalledTimes(1)
  })

  it('hides the tooltip when the map is deactivated', async () => {
    const active = ref(true)
    mountAttached(
      defineComponent({ render: () => h(KeepAlive, null, [active.value ? h(IranMap, { data }) : h('div')]) }),
    )
    byTestId('iran-map-province-tehran').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    const tooltip = document.querySelector('.iran-map-tooltip') as HTMLElement
    expect(tooltip.hidden).toBe(false)
    active.value = false
    await nextTick()
    expect(tooltip.hidden).toBe(true)
  })

  it('clears the hover and hides the tooltip when the hovered element disappears', async () => {
    const onHover = vi.fn()
    const wrapper = mountAttached(IranMap, { props: { data, onHover } })
    byTestId('iran-map-province-tehran').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    expect(onHover).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'tehran' }))
    const tooltip = document.querySelector('.iran-map-tooltip') as HTMLElement
    expect(tooltip.hidden).toBe(false)

    await wrapper.setProps({ mode: 'county' }) // provinces are replaced by counties
    await nextTick()
    expect(byTestId('iran-map-province-tehran')).toBeNull()
    expect(tooltip.hidden).toBe(true)
    expect(onHover).toHaveBeenLastCalledWith(null)
  })

  it('refreshes the tooltip text when the tooltip title changes under the pointer', async () => {
    const wrapper = mountAttached(IranMap, { props: { data, tooltipTitle: 'Score:' } })
    byTestId('iran-map-province-tehran').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    const tooltip = document.querySelector('.iran-map-tooltip') as HTMLElement
    expect(tooltip.textContent).toContain('Score: 60')
    await wrapper.setProps({ tooltipTitle: 'Population:' })
    await nextTick()
    expect(tooltip.textContent).toContain('Population: 60')
  })

  it('warns once when controlled selection becomes uncontrolled', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const wrapper = mountAttached(IranMap, { props: { data, selectedArea: 'fars' } })
    await wrapper.setProps({ selectedArea: undefined })
    expect(warn.mock.calls.some(([message]) => String(message).includes('controlled to uncontrolled'))).toBe(true)
  })

  it('removes the tooltip element from the document on unmount', async () => {
    const wrapper = mountAttached(IranMap, { props: { data } })
    byTestId('iran-map-province-tehran').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    expect(document.querySelector('.iran-map-tooltip')).not.toBeNull()
    wrapper.unmount()
    expect(document.querySelector('.iran-map-tooltip')).toBeNull()
  })
})

describe('keyboard and focus', () => {
  const key = (el: Element, type: 'keydown' | 'keyup', init: KeyboardEventInit) =>
    el.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init }))

  it('reports hover on focusin and clears it on focusout', async () => {
    const onHover = vi.fn()
    mountAttached(IranMap, { props: { data, onHover } })
    const area = byTestId('iran-map-province-tehran')
    area.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(onHover).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'tehran' }))
    area.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    expect(onHover).toHaveBeenLastCalledWith(null)
  })

  it('ignores auto-repeat Enter and activates Space only on keyup', async () => {
    const onSelect = vi.fn()
    mountAttached(IranMap, { props: { data, onSelect } })
    const area = byTestId('iran-map-province-tehran')
    key(area, 'keydown', { key: 'Enter', repeat: true })
    expect(onSelect).not.toHaveBeenCalled()
    key(area, 'keydown', { key: ' ' })
    expect(onSelect).not.toHaveBeenCalled()
    key(area, 'keyup', { key: ' ' })
    await nextTick()
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('exposes the svg as a group and only makes capitals focusable when selectable', async () => {
    const wrapper = mountAttached(IranMap, { props: { data, capitalMarkers: 'province' } })
    expect(wrapper.get('svg').attributes('role')).toBe('group')
    let capital = byTestId('iran-map-capital-province-fars')
    expect(capital.getAttribute('tabindex')).toBeNull()
    expect(capital.getAttribute('role')).toBe('img')

    await wrapper.setProps({ onCapitalSelect: () => undefined })
    capital = byTestId('iran-map-capital-province-fars')
    expect(capital.getAttribute('tabindex')).toBe('0')
    expect(capital.getAttribute('role')).toBe('button')
  })
})
