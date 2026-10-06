import type { ComponentInternalInstance } from 'vue'

/**
 * Whether the parent attached a listener for a declared emit. Read at render time: the parent's
 * vnode props are replaced on every parent patch, and a changed listener set re-renders the child.
 */
export const hasListener = (instance: ComponentInternalInstance, ...propKeys: string[]) => {
  const props = instance.vnode.props
  return !!props && propKeys.some((key) => !!props[key])
}
