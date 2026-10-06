import { describe, expect, it } from 'vitest'
import { IranMap } from '../src/full'
import { mountAttached } from './helpers'

describe('Map label outlines', () => {
  it('scales the province-label halo with focused text instead of using a thick fixed outline', () => {
    const wrapper = mountAttached(IranMap, {
      props: { data: { razaviKhorasan: 50 }, focusProvince: 'razaviKhorasan' },
    })
    const label = wrapper.get('.iran-map-label').element
    const width = Number(label.getAttribute('stroke-width'))
    expect(width).toBeGreaterThan(0)
    expect(width).toBeLessThan(1.25)
    expect(width / Number(label.getAttribute('font-size'))).toBeCloseTo(1.25 / 12)
  })
})
