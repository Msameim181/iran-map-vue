import { describe, expect, it } from 'vitest'
import { createTooltip } from '../src/tooltip'

describe('createTooltip', () => {
  it('translates relative to the containing block so transformed ancestors do not offset it', () => {
    // jsdom has no layout; give the viewport a size so clamping does not apply.
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 1000, configurable: true })
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 800, configurable: true })
    const el = document.createElement('div')
    document.body.append(el)
    // Simulate a transformed ancestor: with no transform the element sits at (100, 50), not (0, 0).
    el.getBoundingClientRect = () => {
      const shifted = el.style.transform !== ''
      return { left: shifted ? 400 : 100, top: shifted ? 300 : 50, width: 80, height: 20 } as DOMRect
    }
    const tooltip = createTooltip(el)
    tooltip.showAtPoint('text', 200, 100)

    // Wanted viewport position: pointer + 14px offset = (214, 114); origin is (100, 50).
    expect(el.style.transform).toBe('translate(114px, 64px)')
    expect(el.hidden).toBe(false)
    tooltip.hide()
    expect(tooltip.visible).toBe(false)
    el.remove()
  })
})
