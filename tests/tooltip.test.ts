import { afterEach, describe, expect, it } from 'vitest'
import { createTooltip } from '../src/tooltip'

const viewport = (width: number, height: number) => {
  // jsdom has no layout; give the viewport a size so clamping behaves like a browser.
  Object.defineProperty(document.documentElement, 'clientWidth', { value: width, configurable: true })
  Object.defineProperty(document.documentElement, 'clientHeight', { value: height, configurable: true })
}
const element = () => document.querySelector('.iran-map-tooltip') as HTMLElement
const stubBox = (width: number, height: number, origin = [0, 0]) => {
  element().getBoundingClientRect = () => {
    const shifted = element().style.transform !== ''
    // With no transform the element sits at the containing block origin, like a real browser.
    return { left: shifted ? 400 : origin[0], top: shifted ? 300 : origin[1], width, height } as DOMRect
  }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('createTooltip', () => {
  it('lives in the document body, outside any map ancestor', () => {
    const wrapper = document.createElement('div')
    wrapper.style.transform = 'scale(0.5)'
    document.body.append(wrapper)
    const tooltip = createTooltip(document)

    expect(element().parentElement).toBe(document.body)
    expect(wrapper.contains(element())).toBe(false)
    tooltip.destroy()
    expect(element()).toBeNull()
  })

  it('translates relative to the containing block origin', () => {
    viewport(1000, 800)
    const tooltip = createTooltip(document)
    stubBox(80, 20, [100, 50])
    tooltip.showAtPoint('text', 200, 100)

    // Wanted viewport position: pointer + 14px offset = (214, 114); origin is (100, 50).
    expect(element().style.transform).toBe('translate(114px, 64px)')
    expect(element().hidden).toBe(false)
    expect(element().textContent).toBe('text')
    tooltip.hide()
    expect(tooltip.visible).toBe(false)
  })

  it('flips to the left of the pointer and clamps into the viewport', () => {
    viewport(300, 200)
    const tooltip = createTooltip(document)
    stubBox(100, 40)
    tooltip.showAtPoint('x', 280, 20)
    // Right side would overflow, so it flips: 280 - 100 - 14 = 166.
    expect(element().style.transform).toBe('translate(166px, 34px)')

    tooltip.showAtPoint('x', 5, 190)
    // Bottom would overflow: flips above the pointer (190 - 14 - 40 = 136), x stays right of it.
    expect(element().style.transform).toBe('translate(19px, 136px)')
  })

  it('centers above an element for keyboard focus', () => {
    viewport(1000, 800)
    const tooltip = createTooltip(document)
    stubBox(100, 40)
    const target = document.createElement('div')
    target.getBoundingClientRect = () => ({ left: 400, top: 300, width: 60, height: 30 }) as DOMRect
    tooltip.showAtElement('x', target)
    // centered: 430 - 50 = 380; above: 300 - 40 - 7 = 253
    expect(element().style.transform).toBe('translate(380px, 253px)')
  })

  it('coalesces pointer moves into one placement per frame', async () => {
    viewport(1000, 800)
    const tooltip = createTooltip(document)
    stubBox(80, 20)
    tooltip.showAtPoint('x', 10, 10)
    const frames: FrameRequestCallback[] = []
    const win = document.defaultView!
    win.requestAnimationFrame = ((callback: FrameRequestCallback) => frames.push(callback)) as never
    win.cancelAnimationFrame = (() => undefined) as never
    tooltip.move(100, 100)
    tooltip.move(200, 200)
    tooltip.move(300, 300)
    expect(frames).toHaveLength(1)
    frames[0](0)
    expect(element().style.transform).toBe('translate(314px, 314px)')
  })
})
