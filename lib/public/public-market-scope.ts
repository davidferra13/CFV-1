import { z } from 'zod'

export const PUBLIC_MARKET_SCOPE = 'United States'

const PUBLIC_MARKET_SCOPE_MAX_LENGTH = 120
const MARKET_SCOPE_KEY = 'market_scope'
const MARKET_SCOPE_MODE_KEY = 'market_scope_mode'

export type PublicMarketScopeMode = 'explicit' | 'national_fallback'

export type PublicMarketScopeSource = 'query' | 'request_location' | 'default'

export type PublicMarketScope = {
  label: string
  mode: PublicMarketScopeMode
  source: PublicMarketScopeSource
  isFallback: boolean
}

export const PublicMarketScopeSchema = z.object({
  label: z.string().min(1).max(PUBLIC_MARKET_SCOPE_MAX_LENGTH),
  mode: z.enum(['explicit', 'national_fallback']),
  source: z.enum(['query', 'request_location', 'default']),
  isFallback: z.boolean(),
})

type SearchParamInput = URLSearchParams | Record<string, string | string[] | undefined>

export function resolvePublicMarketScope(input?: {
  explicitLabel?: string | null
  source?: PublicMarketScopeSource
}): PublicMarketScope {
  const explicitLabel = sanitizePublicMarketScopeLabel(input?.explicitLabel ?? null)

  if (explicitLabel) {
    return {
      label: explicitLabel,
      mode: 'explicit',
      source: input?.source ?? 'query',
      isFallback: false,
    }
  }

  return {
    label: PUBLIC_MARKET_SCOPE,
    mode: 'national_fallback',
    source: 'default',
    isFallback: true,
  }
}

export function readPublicMarketScopeFromSearchParams(input: SearchParamInput): PublicMarketScope {
  const explicitLabel = getSearchParamValue(input, MARKET_SCOPE_KEY)
  const mode = getSearchParamValue(input, MARKET_SCOPE_MODE_KEY)

  if (mode === 'explicit' && explicitLabel) {
    return resolvePublicMarketScope({
      explicitLabel,
      source: 'query',
    })
  }

  return resolvePublicMarketScope()
}

export function appendPublicMarketScopeSearchParams(
  params: URLSearchParams,
  scope: PublicMarketScope
): URLSearchParams {
  params.set(MARKET_SCOPE_KEY, scope.label)
  params.set(MARKET_SCOPE_MODE_KEY, scope.mode)
  return params
}

export function formatPublicMarketScopeLabel(scope: PublicMarketScope): string {
  return scope.mode === 'explicit' ? scope.label : `${scope.label} fallback`
}

export function buildPublicMarketScopeNote(scope: PublicMarketScope): string {
  if (scope.mode === 'explicit') {
    return `Scope: ${scope.label}.`
  }

  return `Scope: ${scope.label} national fallback until a narrower market is known.`
}

function sanitizePublicMarketScopeLabel(value: string | null): string | null {
  if (!value) return null

  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return null
  return normalized.slice(0, PUBLIC_MARKET_SCOPE_MAX_LENGTH)
}

function getSearchParamValue(input: SearchParamInput, key: string): string | null {
  if (input instanceof URLSearchParams) {
    return input.get(key)
  }

  const raw = input[key]
  if (Array.isArray(raw)) return raw.find((value) => value.trim().length > 0) ?? null
  return typeof raw === 'string' ? raw : null
}
