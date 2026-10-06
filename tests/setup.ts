import { afterEach } from 'vitest'
import { unmountAll } from './helpers'

// Some files run in the node environment (SSR); only touch the DOM when there is one.
afterEach(() => {
  if (typeof document !== 'undefined') unmountAll()
})
