import { describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import { buildMapModel } from '@msameim181/iran-map-core'
import { countyBoundaries } from '@msameim181/iran-map-core/counties'
import type { MapBoundary } from '@msameim181/iran-map-core'
import { IranMap } from '../src'
import { count, mountAttached } from './helpers'

vi.mock('@msameim181/iran-map-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@msameim181/iran-map-core')>()
  return { ...actual, buildMapModel: vi.fn(actual.buildMapModel) }
})

describe('catalogs prop', () => {
  it('tracks a field replaced on a reactive container and keeps the default provinces', async () => {
    const catalogs = reactive<{ counties: MapBoundary[]; provinces?: MapBoundary[] }>({
      counties: [],
      provinces: undefined, // an explicit undefined must not override the default
    })
    mountAttached(IranMap, { props: { mode: 'county', data: {}, catalogs } })
    expect(count('[data-area-type="county"]')).toBe(0)

    catalogs.counties = countyBoundaries
    await nextTick()
    expect(count('[data-area-type="county"]')).toBe(478)
    mountAttached(IranMap, { props: { data: {}, catalogs: { provinces: undefined } } })
    expect(count('[data-area-type="province"]')).toBe(31)
  })

  it('does not rebuild the model when an inline catalogs object keeps the same arrays', async () => {
    const build = vi.mocked(buildMapModel)
    const wrapper = mountAttached(IranMap, {
      props: { mode: 'county', data: {}, catalogs: { counties: countyBoundaries } },
    })
    const before = build.mock.calls.length
    await wrapper.setProps({ catalogs: { counties: countyBoundaries } })
    await wrapper.setProps({ catalogs: { counties: countyBoundaries } })
    expect(build.mock.calls.length).toBe(before)
    await wrapper.setProps({ catalogs: { counties: countyBoundaries.slice(0, 10) } })
    expect(build.mock.calls.length).toBe(before + 1)
    expect(count('[data-area-type="county"]')).toBe(10)
  })

  it('un-proxies arrays that were passed reactive', async () => {
    const counties = reactive([...countyBoundaries.slice(0, 5)])
    mountAttached(IranMap, { props: { mode: 'county', data: {}, catalogs: { counties } } })
    expect(count('[data-area-type="county"]')).toBe(5)
  })
})
