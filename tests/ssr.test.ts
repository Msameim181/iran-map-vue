// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { IranMap, ScoreBands } from '../src'

describe('server rendering', () => {
  it('renders the map to a string without touching window or document', async () => {
    expect(typeof document).toBe('undefined')
    const html = await renderToString(
      createSSRApp({ render: () => h(IranMap, { data: { tehran: 42 }, capitalMarkers: 'province' }) }),
    )
    expect(html).toContain('class="iran-map-wrapper"')
    expect(html.match(/data-area-type="province"/g)).toHaveLength(31)
    expect(html).toContain('aria-label="')
    expect(html).not.toContain('iran-map-tooltip') // created in the browser only
  })

  it('renders ScoreBands, as legend and as editor', async () => {
    const bands = [{ max: 50, color: '#facc15', label: 'Low' }]
    const legend = await renderToString(createSSRApp({ render: () => h(ScoreBands, { bands }) }))
    expect(legend).toContain('Score bands')
    expect(legend).not.toContain('<fieldset')
    const editor = await renderToString(createSSRApp({ render: () => h(ScoreBands, { bands, editable: true }) }))
    expect(editor).toContain('<fieldset')
  })
})
