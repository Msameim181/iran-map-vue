import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import App from '../example/src/App.vue'
import { byTestId, count, countyBoundaries, fill, mountAttached } from './helpers'

const q = <T extends Element = HTMLElement>(selector: string) => document.querySelector(selector) as T
const text = (selector: string) => q(selector)?.textContent
const aria = <T extends HTMLElement = HTMLInputElement>(label: string) => q<T>(`[aria-label="${label}"]`)
const flush = () => nextTick()

const click = async (el: Element) => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flush()
}
const type = async (input: HTMLInputElement | HTMLSelectElement, value: string) => {
  input.value = value
  input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
  await flush()
}
const labelledInput = (label: string) =>
  Array.from(document.querySelectorAll('label'))
    .find((el) => el.querySelector('span')?.textContent === label)!
    .querySelector('input, select') as HTMLInputElement
const showChecks = () => document.querySelectorAll('input[aria-label^="Show "]')

const renderFocus = async () => {
  mountAttached(App)
  const radio = Array.from(document.querySelectorAll('[role="radio"]')).find((el) =>
    /Province focus/.test(el.textContent!),
  )!
  await click(radio)
}

describe('Demo county controls', () => {
  it('clears the inspector after same-area and outside clicks without resetting county settings', async () => {
    await renderFocus()
    const area = byTestId('iran-map-county-razaviKhorasan.mashhad')
    await click(area)
    expect(text('.inspection-strip > div > strong')).toBe('Mashhad')
    await click(area)
    expect(text('.inspection-strip > div > strong')).toBe('Hover or select an area')
    await click(area)
    await click(labelledInput('Metric name'))
    expect(area.getAttribute('aria-pressed')).toBe('false')
    expect(text('.score-readout strong')).toBe('—')
    expect(count('[data-area-type="county"]')).toBe(3)
    expect(aria('Show Mashhad').checked).toBe(true)
  })

  it('lists only the focused province counties and enables editable values for checked rows', async () => {
    await renderFocus()
    const counties = countyBoundaries.filter((county) => county.provinceId === 'razaviKhorasan')

    expect(showChecks()).toHaveLength(counties.length)
    expect(count('[data-area-type="county"]')).toBe(3)
    expect(aria('Show Mashhad').checked).toBe(true)
    for (const county of counties) {
      const enabled = aria(`Show ${county.name}`).checked
      expect(aria(`${county.name} Score`).disabled).toBe(!enabled)
    }
  })

  it('updates county colors, tooltip values, and already-selected inspection values immediately', async () => {
    await renderFocus()
    const input = aria('Mashhad Score')
    const path = () => byTestId('iran-map-county-razaviKhorasan.mashhad')

    await type(input, '88.5')
    expect(fill(path())).toBe('#a93f46')
    expect(path().getAttribute('aria-label')).toContain('Score: 88.5')
    await click(path())
    expect(text('.score-readout strong')).toBe('88.5')
    await type(input, '0')
    expect(text('.score-readout strong')).toBe('0')
    expect(path().getAttribute('aria-label')).toContain('Score: 0')
    await type(input, '-12.25')
    expect(text('.score-readout strong')).toBe('-12.25')
  })

  it('retains the last valid value while an input is empty', async () => {
    await renderFocus()
    const input = aria('Mashhad Score')
    await type(input, '60')
    await type(input, '')

    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(byTestId('iran-map-county-razaviKhorasan.mashhad').getAttribute('aria-label')).toContain('Score: 60')
    expect(text('[role="status"]')).toContain('last valid value')
    await type(input, '70')
    expect(input.getAttribute('aria-invalid')).toBe('false')
    expect(fill(byTestId('iran-map-county-razaviKhorasan.mashhad'))).toBe('#e47b58')
  })

  it('preserves each province selections and values and scopes bulk actions to the current province', async () => {
    await renderFocus()
    const county = countyBoundaries.find((item) => item.provinceId === 'tehran')!
    const tehranCount = countyBoundaries.filter((item) => item.provinceId === 'tehran').length
    const picker = labelledInput('Focused Ostan') as unknown as HTMLSelectElement
    const button = (name: string) =>
      Array.from(document.querySelectorAll('button')).find((el) => el.textContent!.trim() === name)!

    await type(picker, 'tehran')
    expect(count('[data-area-type="county"]')).toBe(0)
    await click(aria(`Show ${county.name}`))
    await type(aria(`${county.name} Score`), '73')
    expect(byTestId(`iran-map-county-${county.id}`).getAttribute('aria-label')).toContain('Score: 73')

    await type(picker, 'razaviKhorasan')
    expect(count('[data-area-type="county"]')).toBe(3)
    await type(picker, 'tehran')
    expect(count('[data-area-type="county"]')).toBe(1)
    expect(aria(`${county.name} Score`).value).toBe('73')

    await type(q<HTMLInputElement>('input[type="search"]'), county.name)
    await click(button('Enable all counties'))
    expect(count('[data-area-type="county"]')).toBe(tehranCount)
    expect(document.body.textContent).toContain(`${tehranCount} of ${tehranCount} counties enabled`)
    await click(button('Clear selection'))
    expect(count('[data-area-type="county"]')).toBe(0)
    expect(count('[data-area-type="province"]')).toBe(1)
    await type(picker, 'razaviKhorasan')
    expect(count('[data-area-type="county"]')).toBe(3)
  })

  it('searches English and Persian county names without disabling hidden selections', async () => {
    await renderFocus()
    const search = q<HTMLInputElement>('input[type="search"]')
    await type(search, 'مشهد')
    expect(showChecks()).toHaveLength(1)
    expect(aria('Show Mashhad')).toBeTruthy()
    await type(search, 'mAsHhAd')
    expect(showChecks()).toHaveLength(1)
    await type(search, 'no such county')
    expect(document.body.textContent).toMatch(/No counties match/)
    expect(count('[data-area-type="county"]')).toBe(3)
  })

  it('renames the metric consistently and falls back to Score for a blank name', async () => {
    await renderFocus()
    const label = labelledInput('Metric name')
    await type(label, 'Population')

    expect(aria('Mashhad Population')).toBeTruthy()
    expect(text('.legend-block > .iran-score-bands h2')).toBe('Population bands')
    expect(byTestId('iran-map-county-razaviKhorasan.mashhad').getAttribute('aria-label')).toContain('Population: 92')
    expect(text('.score-readout > span')).toBe('Population')
    const counties = Array.from(document.querySelectorAll('[role="radio"]')).find((el) =>
      /Counties.*478/.test(el.textContent!),
    )!
    await click(counties)
    expect(byTestId('iran-map-county-razaviKhorasan.mashhad').getAttribute('aria-label')).toContain('Population: 92')
    await type(label, '   ')
    expect(byTestId('iran-map-county-razaviKhorasan.mashhad').getAttribute('aria-label')).toContain('Score: 92')
  })

  it('turns the focused province gray without removing county detail and restores its value', async () => {
    await renderFocus()
    const toggle = aria('Show Mashhad') && (document.querySelector('.province-value-toggle input') as HTMLInputElement)
    const province = () => byTestId('iran-map-province-razaviKhorasan')
    const originalFill = fill(province())
    await click(toggle)
    expect(fill(province())).toBe('#e6e6e6')
    expect(count('[data-area-type="county"]')).toBe(3)
    await click(province())
    expect(fill(province())).toBe('#e6e6e6')
    expect(text('.score-readout strong')).toBe('No data')
    await click(toggle)
    expect(fill(province())).toBe(originalFill)
  })

  it('keeps no-data counties visible and gray and restores the last custom value', async () => {
    await renderFocus()
    const value = aria('Mashhad Score')
    const noData = aria('Mashhad has no data')
    const path = () => byTestId('iran-map-county-razaviKhorasan.mashhad')
    await type(value, '55.5')
    await click(noData)
    expect(value.disabled).toBe(true)
    expect(fill(path())).toBe('#e6e6e6')
    expect(path().getAttribute('aria-label')).toContain('No data')
    expect(aria('Show Mashhad').checked).toBe(true)
    await click(noData)
    expect(value.disabled).toBe(false)
    expect(path().getAttribute('aria-label')).toContain('55.5')
    await type(value, '-1')
    expect(fill(path())).toBe('#e6e6e6')
    expect(noData.checked).toBe(true)
  })
})
