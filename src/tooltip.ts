// Tiny native tooltip. One `position: fixed` element per map, appended to the owning document's
// <body> (not inside the map), so scaled, rotated, filtered or clipped ancestors in the host app
// cannot offset or crop it. Driven imperatively: no reactivity, no re-render of the map on mouse
// move. Browser-only: everything runs from event handlers or onMounted, never during setup or
// render, so SSR is unaffected.

const OFFSET = 14
const MARGIN = 6

export interface Tooltip {
  /** Show next to a pointer position (viewport coordinates). */
  showAtPoint(text: string, x: number, y: number): void
  /** Show above an element (keyboard focus). */
  showAtElement(text: string, element: Element): void
  /** Follow the pointer while visible (throttled to one update per frame). */
  move(x: number, y: number): void
  /** Replace the text of a visible tooltip. */
  setText(text: string): void
  hide(): void
  /** Remove the element from the document. */
  destroy(): void
  readonly visible: boolean
}

export const createTooltip = (doc: Document): Tooltip => {
  const win = doc.defaultView
  const el = doc.createElement('div')
  el.className = 'iran-map-tooltip'
  el.setAttribute('role', 'tooltip')
  el.hidden = true
  doc.body.append(el)

  let width = 0
  let height = 0
  // `position: fixed` is relative to the viewport only when no ancestor creates a containing
  // block; measure where (0, 0) really is each time the tooltip opens and translate relative to it.
  let originX = 0
  let originY = 0
  let frame = 0
  let pending: [number, number] | undefined
  // What the tooltip is anchored to, so a text change can re-run placement with the new size.
  let anchor: { x: number; y: number } | { element: Element } | undefined

  const place = (x: number, y: number, centered = false) => {
    const vw = doc.documentElement.clientWidth
    const vh = doc.documentElement.clientHeight
    let left = centered ? x - width / 2 : x + OFFSET
    let top = centered ? y - height - OFFSET / 2 : y + OFFSET
    // Flip to the other side of the pointer before clamping into the viewport.
    if (!centered && left + width + MARGIN > vw) left = x - width - OFFSET
    if (top + height + MARGIN > vh) top = y - height - OFFSET
    left = Math.max(MARGIN, Math.min(left, vw - width - MARGIN))
    top = Math.max(MARGIN, top)
    el.style.transform = `translate(${Math.round(left - originX)}px, ${Math.round(top - originY)}px)`
  }
  const replace = () => {
    if (!anchor) return
    if ('element' in anchor) {
      const rect = anchor.element.getBoundingClientRect()
      place(rect.left + rect.width / 2, rect.top, true)
    } else {
      place(anchor.x, anchor.y)
    }
  }
  const cancelFrame = () => {
    if (frame) win?.cancelAnimationFrame(frame)
    frame = 0
    pending = undefined
  }
  const reveal = (text: string) => {
    cancelFrame()
    el.textContent = text
    el.hidden = false
    el.style.transform = ''
    const box = el.getBoundingClientRect()
    originX = box.left
    originY = box.top
    width = box.width
    height = box.height
  }

  return {
    showAtPoint(text, x, y) {
      reveal(text)
      anchor = { x, y }
      replace()
    },
    showAtElement(text, element) {
      reveal(text)
      anchor = { element }
      replace()
    },
    move(x, y) {
      if (el.hidden) return
      if (!win?.requestAnimationFrame) {
        anchor = { x, y }
        return replace()
      }
      pending = [x, y]
      if (frame) return
      frame = win.requestAnimationFrame(() => {
        frame = 0
        if (pending && !el.hidden) {
          anchor = { x: pending[0], y: pending[1] }
          replace()
        }
        pending = undefined
      })
    },
    setText(text) {
      if (el.hidden || el.textContent === text) return
      el.textContent = text
      const box = el.getBoundingClientRect()
      width = box.width
      height = box.height
      replace() // the new text may be wider or taller: keep the anchor, redo flip and clamp
    },
    hide() {
      cancelFrame()
      anchor = undefined
      el.hidden = true
    },
    destroy() {
      cancelFrame()
      el.remove()
    },
    get visible() {
      return !el.hidden
    },
  }
}
