export type LoadResultStatus = 'ok' | 'empty' | 'unavailable'

export type LoadResult<T> =
  | {
      status: 'ok'
      data: T
      error: null
    }
  | {
      status: 'empty'
      data: T
      error: null
      reason: string
    }
  | {
      status: 'unavailable'
      data: T
      error: string
    }

type LoadResultOptions<T> = {
  fallback: T
  emptyWhen?: (data: T) => boolean
  emptyReason?: string
  errorMessage?: string
  log?: (message: string, error: unknown) => void
}

export async function loadResult<T>(
  label: string,
  loader: () => Promise<T>,
  options: LoadResultOptions<T>
): Promise<LoadResult<T>> {
  try {
    const data = await loader()
    if (options.emptyWhen?.(data)) {
      return {
        status: 'empty',
        data,
        error: null,
        reason: options.emptyReason ?? 'No data is available yet.',
      }
    }
    return { status: 'ok', data, error: null }
  } catch (error) {
    options.log?.(`[loadResult] ${label} failed`, error)
    return {
      status: 'unavailable',
      data: options.fallback,
      error: options.errorMessage ?? `${label} is unavailable right now.`,
    }
  }
}

export function hasUnavailableResult(results: Array<LoadResult<unknown>>): boolean {
  return results.some((result) => result.status === 'unavailable')
}

export function getUnavailableLabels<T extends Record<string, LoadResult<unknown>>>(
  results: T
): Array<keyof T> {
  return (Object.keys(results) as Array<keyof T>).filter(
    (key) => results[key].status === 'unavailable'
  )
}
