import {
  cleanWebResearchText,
  inferSourceType,
  safeSourceUrl,
  stableWebResearchId,
} from './normalization'
import { sanitizeWebResearchQuery, validateWebResearchRequest } from './policy'
import type {
  WebResearchEvidence,
  WebResearchJob,
  WebResearchProvider,
  WebResearchProviderHealth,
  WebResearchProviderId,
  WebResearchProviderResult,
  WebResearchRequest,
} from './types'

const DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

const ALL_JOB_TYPES = [
  'competitor_scan',
  'seo_query_check',
  'supplier_lookup',
  'ingredient_lookup',
  'chef_profile_research',
  'venue_client_public_research',
  'local_market_demand',
  'menu_service_trend',
  'source_freshness_recheck',
  'citation_refresh',
  'pie_supplier_research',
  'restaurant_browse_candidate_discovery',
  'restaurant_profile_enrichment',
  'public_listing_verification',
] as const

function health(
  provider: WebResearchProviderId,
  values: Omit<WebResearchProviderHealth, 'provider'>
): WebResearchProviderHealth {
  return { provider, ...values }
}

export function createDisabledWebResearchProvider(message = 'No approved provider configured.') {
  const provider: WebResearchProvider = {
    id: 'disabled',
    displayName: 'Disabled Web Research',
    requiresAttribution: false,
    supportedJobTypes: [...ALL_JOB_TYPES],
    maxResults: 0,
    cacheTtlMs: 0,
    async healthcheck() {
      return health('disabled', {
        enabled: false,
        configured: false,
        credentialStatus: 'missing',
        message,
      })
    },
    async search() {
      return []
    },
  }
  return provider
}

export function createMockWebResearchProvider(results?: WebResearchProviderResult[]) {
  const provider: WebResearchProvider = {
    id: 'mock',
    displayName: 'Mock Web Research',
    requiresAttribution: true,
    supportedJobTypes: [...ALL_JOB_TYPES],
    maxResults: 10,
    cacheTtlMs: DEFAULT_CACHE_TTL_MS,
    async healthcheck() {
      return health('mock', {
        enabled: true,
        configured: true,
        credentialStatus: 'not_required',
        message: 'Mock provider ready.',
      })
    },
    async search(request) {
      const query = sanitizeWebResearchQuery(request.query)
      return (
        results ?? [
          {
            providerResultId: 'mock-restaurant-1',
            title: `${query} - public restaurant profile`,
            snippet: 'Source-backed restaurant and chef candidate for admin review.',
            sourceUrl: 'https://example.com/restaurants/blue-door-bistro',
            displayUrl: 'example.com/restaurants/blue-door-bistro',
            rank: 1,
          },
          {
            providerResultId: 'mock-menu-1',
            title: `${query} menu`,
            snippet: 'Menu source used only as evidence until reviewed.',
            sourceUrl: 'https://example.com/restaurants/blue-door-bistro/menu',
            displayUrl: 'example.com/restaurants/blue-door-bistro/menu',
            rank: 2,
          },
        ]
      ).slice(0, request.maxResults ?? 10)
    },
  }
  return provider
}

type GoogleCustomSearchItem = {
  cacheId?: string
  title?: string
  snippet?: string
  link?: string
  displayLink?: string
}

export function createGoogleCustomSearchProvider(env = process.env, fetcher = fetch) {
  const key = env.GOOGLE_CUSTOM_SEARCH_KEY
  const cx = env.GOOGLE_CUSTOM_SEARCH_CX
  const configured = Boolean(key && cx)

  const provider: WebResearchProvider = {
    id: 'google-custom-search',
    displayName: 'Google Custom Search JSON API',
    requiresAttribution: true,
    supportedJobTypes: [...ALL_JOB_TYPES],
    maxResults: 10,
    cacheTtlMs: DEFAULT_CACHE_TTL_MS,
    async healthcheck() {
      return health('google-custom-search', {
        enabled: configured,
        configured,
        credentialStatus: configured ? 'configured' : 'missing',
        message: configured
          ? 'Google Custom Search credentials are configured. Live calls still require project billing and API access.'
          : 'GOOGLE_CUSTOM_SEARCH_KEY and GOOGLE_CUSTOM_SEARCH_CX are required.',
      })
    },
    async search(request) {
      if (!configured) return []

      const validation = validateWebResearchRequest(request)
      if (!validation.ok) {
        throw new Error(validation.issues.join(' '))
      }

      const params = new URLSearchParams({
        key: key!,
        cx: cx!,
        q: validation.sanitizedQuery,
        num: String(Math.min(10, Math.max(1, request.maxResults ?? 10))),
      })
      if (request.locale) params.set('lr', request.locale)

      const response = await fetcher(`https://www.googleapis.com/customsearch/v1?${params}`)
      if (!response.ok) {
        throw new Error(`Google Custom Search failed with ${response.status}.`)
      }

      const data = (await response.json()) as { items?: GoogleCustomSearchItem[] }
      const normalized: WebResearchProviderResult[] = []
      for (const [index, item] of (data.items ?? []).entries()) {
        const sourceUrl = item.link ? safeSourceUrl(item.link) : null
        if (!sourceUrl) continue

        const result: WebResearchProviderResult = {
          title: cleanWebResearchText(item.title, sourceUrl),
          snippet: cleanWebResearchText(item.snippet),
          sourceUrl,
          rank: index + 1,
        }
        if (item.cacheId) result.providerResultId = item.cacheId
        if (item.displayLink) result.displayUrl = item.displayLink
        normalized.push(result)
      }

      return normalized
    },
  }
  return provider
}

export function selectWebResearchProvider(
  env = process.env,
  providers: Record<WebResearchProviderId, WebResearchProvider> = {
    mock: createMockWebResearchProvider(),
    'google-custom-search': createGoogleCustomSearchProvider(env),
    disabled: createDisabledWebResearchProvider(),
  }
) {
  const requested = env.WEB_RESEARCH_PROVIDER as WebResearchProviderId | undefined
  if (requested && providers[requested]) return providers[requested]
  if (env.GOOGLE_CUSTOM_SEARCH_KEY && env.GOOGLE_CUSTOM_SEARCH_CX)
    return providers['google-custom-search']
  return providers.disabled
}

export function normalizeProviderResultsToEvidence(params: {
  jobId: string
  request: WebResearchRequest
  provider: WebResearchProvider
  results: WebResearchProviderResult[]
  now?: Date
}): WebResearchEvidence[] {
  const now = params.now ?? new Date()
  const retrievedAt = now.toISOString()
  const retentionExpiresAt = new Date(now.getTime() + DEFAULT_RETENTION_MS).toISOString()
  const query = sanitizeWebResearchQuery(params.request.query)

  return params.results.map((result) => ({
    id: stableWebResearchId('evidence', [params.provider.id, query, result.sourceUrl, result.rank]),
    jobId: params.jobId,
    query,
    provider: params.provider.id,
    providerResultId: result.providerResultId,
    sourceUrl: result.sourceUrl,
    canonicalUrl: safeSourceUrl(result.sourceUrl) ?? result.sourceUrl,
    title: cleanWebResearchText(result.title, result.sourceUrl),
    snippet: cleanWebResearchText(result.snippet),
    displayUrl: result.displayUrl,
    rank: result.rank,
    retrievedAt,
    publishedAt: result.publishedAt ?? null,
    locale: params.request.locale,
    geo: params.request.geo,
    sourceType: inferSourceType(result.sourceUrl, result.title),
    confidence: Math.max(0.35, Math.min(0.95, 1 - (result.rank - 1) * 0.08)),
    freshness: 'fresh',
    usageScope: params.request.usageScope,
    retentionExpiresAt,
    attributionRequired: params.provider.requiresAttribution,
    reviewStatus: 'needs_review',
  }))
}

export async function runWebResearchJob(params: {
  request: WebResearchRequest
  provider?: WebResearchProvider
  now?: Date
}): Promise<WebResearchJob> {
  const provider = params.provider ?? selectWebResearchProvider()
  const now = params.now ?? new Date()
  const validation = validateWebResearchRequest(params.request)
  const jobId = stableWebResearchId('job', [
    params.request.jobType,
    validation.sanitizedQuery,
    now.toISOString(),
  ])

  if (!validation.ok) {
    return {
      id: jobId,
      type: params.request.jobType,
      query: validation.sanitizedQuery,
      provider: provider.id,
      status: 'failed',
      createdAt: now.toISOString(),
      error: validation.issues.join(' '),
      evidence: [],
    }
  }

  try {
    const results = await provider.search({ ...params.request, query: validation.sanitizedQuery })
    const evidence = normalizeProviderResultsToEvidence({
      jobId,
      request: { ...params.request, query: validation.sanitizedQuery },
      provider,
      results,
      now,
    })
    return {
      id: jobId,
      type: params.request.jobType,
      query: validation.sanitizedQuery,
      provider: provider.id,
      status: 'completed',
      createdAt: now.toISOString(),
      completedAt: now.toISOString(),
      evidence,
    }
  } catch (error) {
    return {
      id: jobId,
      type: params.request.jobType,
      query: validation.sanitizedQuery,
      provider: provider.id,
      status: 'failed',
      createdAt: now.toISOString(),
      error: error instanceof Error ? error.message : 'Unknown provider failure.',
      evidence: [],
    }
  }
}
