// safeFetch - Server-side data fetch wrapper for error resilience.
//
// Problem: 15+ critical pages use Promise.all() with zero error handling.
// If any single fetch fails (DB hiccup, timeout, network blip), the
// entire page crashes with an unhandled error. Users see Next.js error page.
//
// Solution: Wrap fetches to return { data, error } tuples. Pages can then
// show graceful degradation (ErrorState component) instead of crashing.
//
// Usage (single fetch):
//   const { data: menus, error } = await safeFetch(() => getMenus())
//   if (error) return <ErrorState title="Could not load menus" />
//
// Usage (parallel fetches - all-or-nothing):
//   const { data, error } = await safeFetchAll({
//     menus: () => getMenus(),
//     recipes: () => getRecipes(),
//     components: () => getAllComponents(),
//   })
//   if (error) return <ErrorState title="Could not load page data" />
//   const { menus, recipes, components } = data
//
// Usage (parallel fetches - partial failure OK):
//   const results = await safeFetchPartial({
//     menus: () => getMenus(),           // required
//     weather: () => getWeather(),        // optional
//   })
//   if (results.menus.error) return <ErrorState title="Could not load menus" />
//   const weather = results.weather.data // may be null

type FetchFn<T> = () => Promise<T>

interface SafeResult<T> {
  data: T
  error: null
}

interface SafeError {
  data: null
  error: string
}

type SafeFetchResult<T> = SafeResult<T> | SafeError

/**
 * Wraps a single async fetch in try/catch, returning { data, error } tuple.
 * Prevents unhandled exceptions from crashing server components.
 */
export async function safeFetch<T>(fn: FetchFn<T>): Promise<SafeFetchResult<T>> {
  try {
    const data = await fn()
    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[safeFetch] Fetch failed:', message)
    return { data: null, error: message }
  }
}

/**
 * Wraps multiple parallel fetches. All must succeed or the whole result is an error.
 * Use this when partial data is meaningless (e.g., page needs all 3 datasets to render).
 */
export async function safeFetchAll<T extends Record<string, FetchFn<unknown>>>(
  fetches: T
): Promise<SafeFetchResult<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }>> {
  const keys = Object.keys(fetches) as (keyof T)[]
  const fns = keys.map((k) => fetches[k]())

  try {
    const results = await Promise.all(fns)
    const data = {} as { [K in keyof T]: Awaited<ReturnType<T[K]>> }
    keys.forEach((key, i) => {
      ;(data as any)[key] = results[i]
    })
    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[safeFetchAll] One or more fetches failed:', message)
    return { data: null, error: message }
  }
}

/**
 * Wraps multiple parallel fetches independently. Each returns its own { data, error }.
 * Use this when some data is optional (e.g., weather can fail but events must load).
 */
export async function safeFetchPartial<T extends Record<string, FetchFn<unknown>>>(
  fetches: T
): Promise<{ [K in keyof T]: SafeFetchResult<Awaited<ReturnType<T[K]>>> }> {
  const keys = Object.keys(fetches) as (keyof T)[]
  const settled = await Promise.allSettled(keys.map((k) => fetches[k]()))

  const result = {} as { [K in keyof T]: SafeFetchResult<Awaited<ReturnType<T[K]>>> }
  keys.forEach((key, i) => {
    const s = settled[i]
    if (s.status === 'fulfilled') {
      ;(result as any)[key] = { data: s.value, error: null }
    } else {
      const message = s.reason instanceof Error ? s.reason.message : 'Unknown error'
      console.error(`[safeFetchPartial] "${String(key)}" failed:`, message)
      ;(result as any)[key] = { data: null, error: message }
    }
  })

  return result
}
