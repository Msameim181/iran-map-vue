import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { IranMap } from '../src/full'
import { allByTestId, byTestId, count, fill, mountAttached } from './helpers'

const provinceData = {
  ardabil: 0,
  isfahan: 20,
  alborz: 11,
  ilam: 18,
  eastAzerbaijan: 10,
  westAzerbaijan: 20,
  bushehr: 15,
  tehran: 55,
  chaharmahalandBakhtiari: 25,
  southKhorasan: 29,
  razaviKhorasan: 11,
  northKhorasan: 19,
  khuzestan: 12,
  zanjan: 18,
  semnan: 9,
  sistanAndBaluchestan: 3,
  fars: 7,
  qazvin: 35,
  qom: 30,
  kurdistan: 24,
  kerman: 23,
  kohgiluyehAndBoyerAhmad: 2,
  kermanshah: 7,
  golestan: 18,
  gilan: 14,
  lorestan: 7,
  mazandaran: 28,
  markazi: 25,
  hormozgan: 14,
  hamadan: 19,
  yazd: 32,
}

const click = async (el: Element) => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await nextTick()
}

describe('IranMap', () => {
  it('renders the backward-compatible province map', () => {
    mountAttached(IranMap, { props: { data: provinceData, colorRange: '30, 70, 181' } })

    expect(count('[data-area-type="province"]')).toBe(31)
  })

  it('renders the complete county map', () => {
    mountAttached(IranMap, { props: { mode: 'county', data: { 'razaviKhorasan.mashhad': 80 } } })

    expect(count('[data-area-type="county"]')).toBe(478)
    expect(byTestId('iran-map-county-razaviKhorasan.mashhad')).toBeTruthy()
  })

  it('overlays selected counties on a province map', () => {
    mountAttached(IranMap, {
      props: { data: { ...provinceData, 'razaviKhorasan.mashhad': 90 }, detailedCounties: ['mashhad'] },
    })

    expect(count('[data-area-type="province"]')).toBe(31)
    expect(count('[data-area-type="county"]')).toBe(1)
    expect(byTestId('iran-map-county-razaviKhorasan.mashhad')).toBeTruthy()
  })

  it('uses explicit threshold colors', () => {
    mountAttached(IranMap, {
      props: {
        data: provinceData,
        colorBands: [
          { max: 50, color: '#facc15' },
          { min: 50, max: 70, color: '#ef4444' },
          { min: 70, max: 80, color: '#22c55e' },
          { min: 80, color: '#166534' },
        ],
      },
    })

    expect(fill(byTestId('iran-map-province-tehran'))).toBe('#ef4444')
  })

  it('groups provinces into an interactive region and supports county detail', async () => {
    const onSelect = vi.fn()
    mountAttached(IranMap, {
      props: {
        mode: 'region',
        regions: [
          {
            id: 'khorasan-region',
            name: 'Khorasan Region',
            faName: 'منطقه خراسان',
            provinces: ['razaviKhorasan', 'northKhorasan', 'southKhorasan'],
          },
        ],
        data: { 'khorasan-region': 72, 'razaviKhorasan.mashhad': 91 },
        detailedCounties: ['razaviKhorasan.mashhad'],
        onSelect,
      },
    })

    expect(allByTestId('iran-map-region-khorasan-region')).toHaveLength(3)
    expect(byTestId('iran-map-county-razaviKhorasan.mashhad')).toBeTruthy()
    await click(allByTestId('iran-map-region-khorasan-region')[0])
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'khorasan-region', type: 'region' }))
  })

  it('renders context-aware province and county capital markers', () => {
    const provinceView = mountAttached(IranMap, { props: { data: provinceData, capitalMarkers: 'auto' } })
    expect(count('[data-capital-type="province"]')).toBe(31)
    expect(byTestId('iran-map-capital-province-razaviKhorasan').getAttribute('data-latitude')).toBe('36.29807')
    provinceView.unmount()

    mountAttached(IranMap, { props: { mode: 'county', data: {}, capitalMarkers: 'auto' } })
    expect(count('[data-capital-type="county"]')).toBe(484)
  })

  it('reports the selected capital with its geographic coordinates', async () => {
    const onCapitalSelect = vi.fn()
    mountAttached(IranMap, { props: { data: provinceData, capitalMarkers: 'province', onCapitalSelect } })

    await click(byTestId('iran-map-capital-province-razaviKhorasan'))
    expect(onCapitalSelect).toHaveBeenCalledWith(
      expect.objectContaining({ areaId: 'razaviKhorasan', faName: 'مشهد', latitude: 36.29807, longitude: 59.60567 }),
    )
  })

  it('renders the surrounding waters and physical Iranian island coastlines', () => {
    mountAttached(IranMap, { props: { data: provinceData } })

    expect(count('[data-water-id]')).toBe(4)
    expect(count('[data-island-id]')).toBe(17)
    expect(byTestId('iran-map-island-qeshm').getAttribute('data-province-id')).toBe('hormozgan')
    expect(byTestId('iran-map-island-farsi').getAttribute('data-latitude')).toBe('27.993096')
  })

  it('selects an island through its active province or county layer', async () => {
    const onSelect = vi.fn()
    const onIslandSelect = vi.fn()
    mountAttached(IranMap, { props: { data: provinceData, onSelect, onIslandSelect } })

    await click(byTestId('iran-map-island-qeshm'))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'hormozgan', type: 'province' }))
    expect(onIslandSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'qeshm', countyId: 'hormozgan.qeshm' }),
      expect.objectContaining({ id: 'hormozgan' }),
    )
  })

  it('focuses the viewport on one province with only its selected counties', () => {
    const wrapper = mountAttached(IranMap, {
      props: {
        data: { ...provinceData, 'razaviKhorasan.mashhad': 90, 'razaviKhorasan.neyshabur': 65 },
        focusProvince: 'razaviKhorasan',
        detailedCounties: ['mashhad', 'neyshabur'],
        capitalMarkers: 'auto',
      },
    })

    expect(count('[data-area-type="province"]')).toBe(1)
    expect(count('[data-area-type="county"]')).toBe(2)
    expect(byTestId('iran-map-county-razaviKhorasan.mashhad')).toBeTruthy()
    expect(byTestId('iran-map-county-tehran.tehran')).toBeNull()
    expect(wrapper.get('svg').attributes('viewBox')).not.toBe('0 0 1000 825')
    expect(count('[data-capital-type="province"]')).toBe(1)
  })

  it('keeps island land separate while linking it to its county color and selection', async () => {
    const onSelect = vi.fn()
    mountAttached(IranMap, {
      props: { mode: 'county', focusProvince: 'hormozgan', data: { 'hormozgan.qeshm': 72 }, onSelect },
    })

    await click(byTestId('iran-map-island-qeshm'))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'hormozgan.qeshm', type: 'county', value: 72 }))
  })

  it('renders the root IranMap with the lean province catalog by default', async () => {
    const { IranMap: LeanMap } = await import('../src')
    mountAttached(LeanMap, { props: { data: provinceData } })

    expect(count('[data-area-type="province"]')).toBe(31)
    expect(count('[data-water-id]')).toBe(0)
    expect(count('[data-island-id]')).toBe(0)
  })

  it('warns once in development when the lean entry lacks a requested catalog', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { IranMap: LeanMap } = await import('../src')
    mountAttached(LeanMap, { props: { mode: 'county', data: {}, showIslands: true } })

    expect(count('[data-area-type="county"]')).toBe(0)
    expect(warn.mock.calls.some(([message]) => String(message).includes('counties'))).toBe(true)
  })
})
