import { permanentRedirect } from 'next/navigation'

type Props = {
  params: { path?: string[] }
  searchParams?: Record<string, string | string[]>
}

/**
 * Fallback redirect from old /discover/* URLs to /nearby/*.
 * The primary redirect is configured in next.config.js so the legacy path
 * resolves before app rendering. This page remains as a fallback if that
 * config is bypassed.
 * Preserves path segments and query parameters.
 * This ensures bookmarks, outreach email links, and indexed URLs still work.
 */
export default function DiscoverRedirect({ params, searchParams }: Props) {
  const pathSegments = params.path?.join('/') || ''
  const queryString = new URLSearchParams()

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      const v = Array.isArray(value) ? value[0] : value
      if (v) queryString.set(key, v)
    }
  }

  const qs = queryString.toString()
  const target = `/nearby${pathSegments ? `/${pathSegments}` : ''}${qs ? `?${qs}` : ''}`

  permanentRedirect(target)
}
