import type { ComponentInternalInstance } from 'vue'

/**
 * Whether the parent attached a listener for a declared emit. Read at render time from the
 * parent's vnode props. `@event.once` arrives as `on<Event>Once`, so both spellings count.
 *
 * Declared emit listeners never trigger a child update when they change, so a listener that
 * toggles dynamically needs an explicit prop (`capitalsInteractive`, `editable`).
 */
export const hasListener = (instance: ComponentInternalInstance, ...propKeys: string[]) => {
  const props = instance.vnode.props
  return !!props && propKeys.some((key) => !!props[key] || !!props[`${key}Once`])
}
