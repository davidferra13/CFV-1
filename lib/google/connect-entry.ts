import { sanitizeGoogleConnectReturnTo } from './connect-shared'

export function buildGoogleConnectEntryUrl(
  scopes: string[],
  options?: { returnTo?: string | null }
): string {
  const params = new URLSearchParams()

  for (const scope of Array.from(new Set(scopes.filter(Boolean)))) {
    params.append('scope', scope)
  }

  const returnTo = sanitizeGoogleConnectReturnTo(options?.returnTo)
  if (returnTo) {
    params.set('returnTo', returnTo)
  }

  const query = params.toString()
  return query ? `/api/auth/google/connect?${query}` : '/api/auth/google/connect'
}
