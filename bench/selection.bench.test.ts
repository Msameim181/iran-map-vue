// Not part of the default suite (vitest include is tests/**). Run: npx vitest run --config bench/vitest.config.ts
import { it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { IranMap } from '../src/full'

const data: Record<string, number> = {}
for (let i = 0; i < 478; i++) data[`k${i}`] = i % 100

it('measures selection re-render cost in county mode with capital labels', async () => {
  const wrapper = mount(IranMap, {
    attachTo: document.body,
    props: { mode: 'county', data, capitalMarkers: 'county', showCapitalLabels: true, showLabels: true },
  })
  const areas = Array.from(document.querySelectorAll('.iran-map-area')) as Element[]
  const click = async (el: Element) => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
  }
  for (let i = 0; i < 5; i++) await click(areas[i]) // warm up
  const times: number[] = []
  for (let i = 0; i < 40; i++) {
    const t0 = performance.now()
    await click(areas[(i * 11) % areas.length])
    times.push(performance.now() - t0)
  }
  times.sort((a, b) => a - b)
  const median = times[Math.floor(times.length / 2)]
  console.log(
    `BENCH select re-render: median ${median.toFixed(1)} ms, p90 ${times[36].toFixed(1)} ms, nodes ${document.getElementsByTagName('*').length}`,
  )
  wrapper.unmount()
}, 120000)
