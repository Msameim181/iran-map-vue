import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import type { Component } from 'vue'

// Single seam to core's catalogs; adjust together with example/src/core.ts.
export { countyBoundaries, provinceBoundaries } from '../example/src/core'

const mounted: VueWrapper[] = []

/**
 * Mount attached to document.body so document-level listeners (outside-click dismissal)
 * see real event paths, and track the wrapper so afterEach can unmount it.
 */
export const mountAttached = <C extends Component>(component: C, options: Record<string, unknown> = {}) => {
  const wrapper = mount(component, { ...options, attachTo: document.body }) as VueWrapper
  mounted.push(wrapper)
  return wrapper
}

export const unmountAll = () => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
}

export const byTestId = (id: string) => document.querySelector(`[data-testid="${id}"]`) as Element
export const allByTestId = (id: string) => Array.from(document.querySelectorAll(`[data-testid="${id}"]`))
export const count = (selector: string) => document.querySelectorAll(selector).length
export const fill = (el: Element) => el.getAttribute('fill')
