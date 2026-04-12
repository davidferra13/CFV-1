import { AsyncLocalStorage } from 'async_hooks'

const requestIdStore = new AsyncLocalStorage<string>()

/**
 * Run a function with a request ID bound to the current async context.
 * Call this in server action wrappers or API route handlers to establish
 * a correlation ID for deep library code that doesn't have access to headers().
 */
export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return requestIdStore.run(requestId, fn)
}

/**
 * Get the current request's correlation ID from AsyncLocalStorage.
 * Returns undefined outside of a runWithRequestId context.
 *
 * Primary mechanism: middleware sets x-request-id header, read via headers() in server components/actions.
 * Secondary mechanism: this function, for deep library code without headers() access.
 */
export function getRequestId(): string | undefined {
  return requestIdStore.getStore()
}
