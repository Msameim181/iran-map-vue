// Tiny native tooltip. One absolutely-free `position: fixed` element per map, driven imperatively
// (no reactivity, no re-render of the map on mouse move). Browser-only: every function is called
// from event handlers or onMounted, never during setup/render, so SSR is unaffected.

const OFFSET = 14
const MARGIN = 6

export interface Tooltip {
  /** Show next to a pointer position (viewport coordinates). */
  showAtPoint(text: string, x: number, y: number): void
  /** Show above an element (keyboard focus). */
  showAtElement(text: string, element: Element): void
  /** Follow the pointer while visible. */
  move(x: number, y: number): void
  hide(): void
  readonly visible: boolean
}

export const createTooltip = (el: HTMLElement): Tooltip => {
  let width = 0
  let height = 0
  const place = (x: number, y: number, centered = false) => {
    const vw = document.documentElement.clientWidth
    const vh = document.documentElement.clientHeight
    let left = centered ? x - width / 2 : x + OFFSET
    let top = centered ? y - height - OFFSET / 2 : y + OFFSET
    // Flip to the other side of the pointer before clamping into the viewport.
    if (!centered && left + width + MARGIN > vw) left = x - width - OFFSET
    if (top + height + MARGIN > vh) top = (centered ? y : y - OFFSET) - height - OFFSET
    left = Math.max(MARGIN, Math.min(left, vw - width - MARGIN))
    top = Math.max(MARGIN, top)
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`
  }
  const reveal = (text: string) => {
    el.textContent = text
    el.hidden = false
    width = el.offsetWidth
    height = el.offsetHeight
  }
  return {
    showAtPoint(text, x, y) {
      reveal(text)
      place(x, y)
    },
    showAtElement(text, element) {
      reveal(text)
      const rect = element.getBoundingClientRect()
      place(rect.left + rect.width / 2, rect.top, true)
    },
    move(x, y) {
      if (!el.hidden) place(x, y)
    },
    hide() {
      el.hidden = true
    },
    get visible() {
      return !el.hidden
    },
  }
}
