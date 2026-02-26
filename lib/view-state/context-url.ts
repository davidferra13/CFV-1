'use client'

const CONTEXT_SCOPE_BY_PATH: Record<string, string[]> = {
  '/inquiries': ['inquiries.filters', 'inquiries.list'],
  '/events': ['events.list'],
  '/quotes': ['quotes.list'],
  '/clients': ['clients.list'],
}

function readScopeState(scopeKey: string): Record<string, unknown> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(`cf:view:last:${scopeKey}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function shouldInclude(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

function normalizeUrl(url: string): URL | null {
  if (typeof window === 'undefined') return null
  try {
    return new URL(url, window.location.origin)
  } catch {
    return null
  }
}

export function applyStoredViewContext(rawUrl: string): string {
  const url = normalizeUrl(rawUrl)
  if (!url) return rawUrl

  const scopes = CONTEXT_SCOPE_BY_PATH[url.pathname]
  if (!scopes || scopes.length === 0) {
    return `${url.pathname}${url.search}${url.hash}`
  }

  for (const scope of scopes) {
    const state = readScopeState(scope)
    for (const [key, value] of Object.entries(state)) {
      if (!shouldInclude(value)) continue
      if (Array.isArray(value)) {
        url.searchParams.set(key, value.map((entry) => String(entry)).join(','))
      } else {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return `${url.pathname}${url.search}${url.hash}`
}
