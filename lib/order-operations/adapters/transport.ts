import type { OrderOpsTransport } from './types'

type FetchLike = typeof fetch

export function createFetchTransport(fetchImpl: FetchLike = fetch): OrderOpsTransport {
  return async <T>({ url, method, headers, body }) => {
    const response = await fetchImpl(url, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })

    const contentType = response.headers.get('content-type') ?? ''
    let data: unknown = null
    if (response.status !== 204) {
      data = contentType.includes('application/json')
        ? await response.json()
        : await response.text()
    }

    return {
      status: response.status,
      ok: response.ok,
      data: data as T,
    }
  }
}
