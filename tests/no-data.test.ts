import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { IranMap } from '../src/full'
import type { IranMapValue } from '../src'
import { allByTestId, byTestId, fill, mountAttached } from './helpers'

describe('Map no-data values', () => {
  it.each<IranMapValue>([null, undefined, -1, NaN, Infinity, -Infinity])(
    'renders %s as gray in province and county views',
    async (value) => {
      for (const mode of ['province', 'county'] as const) {
        const id = mode === 'province' ? 'tehran' : 'tehran.tehran'
        const wrapper = mountAttached(IranMap, {
          props: {
            mode,
            data: { [id]: value },
            colorBands: [{ color: '#ff0000' }],
            selectedAreaColor: '#00ff00',
          },
        })
        const area = byTestId(`iran-map-${mode}-${id}`)
        expect(fill(area)).toBe('#e6e6e6')
        expect(area.getAttribute('aria-label')).toContain('No data')
        area.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await nextTick()
        expect(fill(area)).toBe('#e6e6e6')
        wrapper.unmount()
      }
    },
  )

  it('colors zero as valid data with explicit bands and the automatic gradient', async () => {
    const wrapper = mountAttached(IranMap, { props: { data: { tehran: 0 } } })
    expect(fill(byTestId('iran-map-province-tehran'))).not.toBe('#e6e6e6')
    await wrapper.setProps({ colorBands: [{ max: 50, color: '#00ff00' }] })
    expect(fill(byTestId('iran-map-province-tehran'))).toBe('#00ff00')
  })

  it('excludes missing values from automatic gradient limits', async () => {
    const wrapper = mountAttached(IranMap, {
      props: { data: { tehran: 50, fars: 100, bushehr: -1, kerman: null } },
    })
    const before = fill(byTestId('iran-map-province-tehran'))
    await wrapper.setProps({ data: { tehran: 50, fars: 100 } })
    expect(fill(byTestId('iran-map-province-tehran'))).toBe(before)
  })

  it('respects an explicit missing primary value over secondary aliases', () => {
    mountAttached(IranMap, { props: { data: { tehran: null, Tehran: 80, تهران: 60 } } })
    expect(fill(byTestId('iran-map-province-tehran'))).toBe('#e6e6e6')
  })

  it('excludes missing region members but includes zero in the average', () => {
    mountAttached(IranMap, {
      props: {
        mode: 'region',
        regionAggregation: 'average',
        regions: [{ id: 'sample', name: 'Sample', provinces: ['tehran', 'fars', 'bushehr', 'kerman'] }],
        data: { tehran: 10, fars: 0, bushehr: -1, kerman: null },
      },
    })
    for (const path of allByTestId('iran-map-region-sample')) {
      expect(path.getAttribute('aria-label')).toContain('5')
      expect(fill(path)).not.toBe('#e6e6e6')
    }
  })

  it.each([null, -1])('does not aggregate over an explicitly missing region value (%s)', (value) => {
    mountAttached(IranMap, {
      props: {
        mode: 'region',
        regions: [{ id: 'sample', name: 'Sample', provinces: ['tehran', 'fars'] }],
        data: { sample: value, tehran: 80, fars: 90 },
      },
    })
    for (const path of allByTestId('iran-map-region-sample')) expect(fill(path)).toBe('#e6e6e6')
  })

  it('keeps independent islands gray when their administrative owner has no data', async () => {
    mountAttached(IranMap, { props: { data: { hormozgan: null }, selectedAreaColor: '#00ff00' } })
    const island = byTestId('iran-map-island-qeshm')
    const shape = island.querySelector('.iran-map-island-shape')!
    expect(fill(shape)).toBe('#e6e6e6')
    ;(island as unknown as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(fill(shape)).toBe('#e6e6e6')
  })
})
