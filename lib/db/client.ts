type ResolveGoogleOAuthCallbackOptions = {
  siteUrl?: string | null
  browserOrigin?: string | null
}

function readHttpOrigin(value: string, label: string): string {
  let parsed: URL

  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`Invalid ${label}`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Invalid ${label}`)
  }

  return parsed.origin
}

function readOptionalBrowserOrigin(value?: string | null): string | null {
  if (!value) return null

  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.origin
  } catch {
    return null
  }
}

function normalizeNextPath(nextPath?: string | null): string | null {
  if (!nextPath) return null

  const trimmed = nextPath.trim()
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) return null

  return trimmed
}

export function resolveGoogleOAuthCallbackUrl(
  nextPath?: string | null,
  opts: ResolveGoogleOAuthCallbackOptions = {}
): string {
  const configuredSiteUrl = opts.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? null

  let origin: string | null = null
  if (configuredSiteUrl) {
    origin = readHttpOrigin(configuredSiteUrl, 'NEXT_PUBLIC_SITE_URL')
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_SITE_URL must be set in production')
  } else {
    origin = readOptionalBrowserOrigin(opts.browserOrigin)
  }

  if (!origin) {
    throw new Error('Unable to determine OAuth callback origin')
  }

  const callback = new URL('/auth/callback', origin)
  const normalizedNext = normalizeNextPath(nextPath)
  if (normalizedNext) {
    callback.searchParams.set('next', normalizedNext)
  }

  return callback.toString()
}
