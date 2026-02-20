import { createHash } from 'crypto'
import { createServerClient } from '@/lib/supabase/server'

export const EXTERNAL_REVIEW_PROVIDERS = ['google_places', 'website_jsonld'] as const

export type ExternalReviewProvider = (typeof EXTERNAL_REVIEW_PROVIDERS)[number]

export type ExternalReviewSourceRecord = {
  id: string
  tenant_id: string
  provider: ExternalReviewProvider
  label: string
  config: Record<string, unknown>
  active: boolean
  sync_interval_minutes: number
  last_synced_at: string | null
  last_cursor: string | null
  last_error: string | null
}

type NormalizedExternalReview = {
  sourceReviewId: string
  sourceUrl: string | null
  authorName: string | null
  rating: number | null
  reviewText: string
  reviewDate: string | null
  rawPayload: Record<string, unknown>
}

export type ExternalSyncResult = {
  sourceId: string
  provider: ExternalReviewProvider
  pulled: number
  upserted: number
  skipped: boolean
  error?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function hashId(input: string) {
  return createHash('sha256').update(input).digest('hex').slice(0, 32)
}

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  if (numeric <= 0) return null
  return Math.min(5, Math.max(0, Number(numeric.toFixed(2))))
}

function normalizeDateToIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().split('T')[0]
}

function normalizeUnixToIsoDate(value: unknown): string | null {
  const unixSeconds = Number(value)
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return null
  return new Date(unixSeconds * 1000).toISOString().split('T')[0]
}

function normalizeGoogleSourceConfig(config: Record<string, unknown>) {
  const placeId = typeof config.place_id === 'string' ? config.place_id.trim() : ''
  const placeUrl = typeof config.place_url === 'string' ? config.place_url.trim() : ''

  if (!placeId) {
    throw new Error('Google source config requires place_id')
  }

  return {
    placeId,
    placeUrl: placeUrl || null,
  }
}

function normalizeWebsiteSourceConfig(config: Record<string, unknown>) {
  const list = Array.isArray(config.urls) ? config.urls : []
  const urls = list
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)

  if (urls.length === 0) {
    throw new Error('Website source config requires at least one URL')
  }

  return {
    urls: Array.from(new Set(urls)).slice(0, 20),
  }
}

function sameHostOrSubdomain(candidateHost: string, ownerHost: string) {
  return candidateHost === ownerHost || candidateHost.endsWith(`.${ownerHost}`)
}

export function validateOwnedWebsiteUrls(chefWebsiteUrl: string | null, urls: string[]) {
  if (!chefWebsiteUrl) {
    throw new Error('Set your website URL in profile settings before enabling website review sync')
  }

  let ownerHost: string
  try {
    ownerHost = new URL(chefWebsiteUrl).hostname.toLowerCase()
  } catch {
    throw new Error('Chef website URL is invalid. Update it in profile settings.')
  }

  if (!ownerHost) {
    throw new Error('Chef website URL host is invalid.')
  }

  const normalized = urls.map((raw) => {
    const parsed = new URL(raw)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Unsupported URL protocol for website review source: ${raw}`)
    }

    const candidateHost = parsed.hostname.toLowerCase()
    if (!sameHostOrSubdomain(candidateHost, ownerHost)) {
      throw new Error(`URL host ${candidateHost} is outside your owned website host ${ownerHost}`)
    }

    return parsed.toString()
  })

  return {
    ownerHost,
    urls: Array.from(new Set(normalized)),
  }
}

async function fetchGooglePlaceReviews(config: Record<string, unknown>): Promise<NormalizedExternalReview[]> {
  const { placeId, placeUrl } = normalizeGoogleSourceConfig(config)
  const apiKey = process.env.GOOGLE_PLACES_API_KEY

  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured')
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', 'name,url,reviews')
  url.searchParams.set('reviews_no_translations', 'true')
  url.searchParams.set('key', apiKey)

  const response = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`)
  }

  const payload = (await response.json()) as Record<string, unknown>
  const status = typeof payload.status === 'string' ? payload.status : 'UNKNOWN'
  if (!['OK', 'ZERO_RESULTS'].includes(status)) {
    const detail = typeof payload.error_message === 'string' ? ` - ${payload.error_message}` : ''
    throw new Error(`Google Places API returned ${status}${detail}`)
  }

  const result = toRecord(payload.result)
  const defaultUrl = (typeof result.url === 'string' && result.url.trim()) || placeUrl || null
  const reviews = Array.isArray(result.reviews) ? result.reviews : []

  return reviews
    .map((raw): NormalizedExternalReview | null => {
      const item = toRecord(raw)
      const text = typeof item.text === 'string' ? item.text.trim() : ''
      if (!text) return null

      const authorUrl = typeof item.author_url === 'string' ? item.author_url.trim() : ''
      const authorName = typeof item.author_name === 'string' ? item.author_name.trim() : ''
      const rating = normalizeRating(item.rating)
      const reviewDate = normalizeUnixToIsoDate(item.time)
      const sourceReviewId = authorUrl
        ? `${placeId}:${authorUrl}`
        : `${placeId}:${hashId(`${authorName}|${text}|${String(item.time ?? '')}`)}`

      return {
        sourceReviewId,
        sourceUrl: authorUrl || defaultUrl,
        authorName: authorName || null,
        rating,
        reviewText: text,
        reviewDate,
        rawPayload: item,
      }
    })
    .filter((value): value is NormalizedExternalReview => value !== null)
}

function extractJsonLdBlocks(html: string): string[] {
  const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const blocks: string[] = []
  let match: RegExpExecArray | null

  while ((match = pattern.exec(html)) !== null) {
    const block = match[1]?.trim()
    if (block) blocks.push(block)
  }

  return blocks
}

function parseJsonLdBlock(raw: string): unknown | null {
  try {
    return JSON.parse(raw)
  } catch {
    const sanitized = raw.replace(/^[\uFEFF\u200B]+/, '').trim()
    try {
      return JSON.parse(sanitized)
    } catch {
      return null
    }
  }
}

function hasReviewShape(node: Record<string, unknown>) {
  const rawType = node['@type']
  const types = Array.isArray(rawType)
    ? rawType.filter((value): value is string => typeof value === 'string')
    : typeof rawType === 'string'
      ? [rawType]
      : []

  if (types.some((type) => type.toLowerCase() === 'review')) return true
  if (typeof node.reviewBody === 'string') return true
  if (isRecord(node.reviewRating)) return true

  return false
}

function collectReviewNodes(node: unknown, accumulator: Record<string, unknown>[]) {
  if (Array.isArray(node)) {
    for (const item of node) collectReviewNodes(item, accumulator)
    return
  }

  if (!isRecord(node)) return

  if (hasReviewShape(node)) {
    accumulator.push(node)
  }

  for (const value of Object.values(node)) {
    collectReviewNodes(value, accumulator)
  }
}

function extractAuthorName(node: Record<string, unknown>) {
  const author = node.author
  if (typeof author === 'string') return author.trim() || null
  if (isRecord(author) && typeof author.name === 'string') return author.name.trim() || null
  return null
}

function extractRating(node: Record<string, unknown>) {
  const reviewRating = node.reviewRating
  if (isRecord(reviewRating)) {
    return normalizeRating(reviewRating.ratingValue ?? reviewRating.value)
  }

  return normalizeRating(reviewRating)
}

function normalizeWebsiteReview(node: Record<string, unknown>, pageUrl: string): NormalizedExternalReview | null {
  const reviewTextRaw = typeof node.reviewBody === 'string'
    ? node.reviewBody
    : typeof node.description === 'string'
      ? node.description
      : ''

  const reviewText = reviewTextRaw.trim()
  if (!reviewText) return null

  const sourceUrl = typeof node.url === 'string' && node.url.trim() ? node.url.trim() : pageUrl
  const authorName = extractAuthorName(node)
  const reviewDate = normalizeDateToIsoDate(node.datePublished ?? node.dateCreated)
  const rating = extractRating(node)

  const explicitId = typeof node['@id'] === 'string'
    ? node['@id'].trim()
    : typeof node.id === 'string'
      ? node.id.trim()
      : ''

  const sourceReviewId = explicitId || `website:${hashId(`${sourceUrl}|${authorName ?? ''}|${reviewDate ?? ''}|${reviewText}`)}`

  return {
    sourceReviewId,
    sourceUrl,
    authorName,
    rating,
    reviewText,
    reviewDate,
    rawPayload: node,
  }
}

async function fetchWebsiteJsonLdReviews(config: Record<string, unknown>): Promise<NormalizedExternalReview[]> {
  const { urls } = normalizeWebsiteSourceConfig(config)
  const reviews: NormalizedExternalReview[] = []

  for (const url of urls) {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'User-Agent': 'ChefFlowReviewsSync/1.0 (+https://cheflowhq.com)',
      },
    })

    if (!response.ok) {
      throw new Error(`Website fetch failed (${response.status}) for ${url}`)
    }

    const html = await response.text()
    const blocks = extractJsonLdBlocks(html)

    for (const block of blocks) {
      const parsed = parseJsonLdBlock(block)
      if (!parsed) continue

      const nodes: Record<string, unknown>[] = []
      collectReviewNodes(parsed, nodes)

      for (const node of nodes) {
        const normalized = normalizeWebsiteReview(node, url)
        if (normalized) reviews.push(normalized)
      }
    }
  }

  return reviews
}

async function getChefWebsiteUrl(supabase: any, tenantId: string) {
  const { data, error } = await supabase
    .from('chefs')
    .select('website_url')
    .eq('id', tenantId)
    .single()

  if (error) {
    throw new Error(`Failed to load chef website URL: ${error.message}`)
  }

  return typeof data?.website_url === 'string' ? data.website_url : null
}

function dedupeBySourceReviewId(reviews: NormalizedExternalReview[]) {
  const map = new Map<string, NormalizedExternalReview>()
  for (const review of reviews) {
    map.set(review.sourceReviewId, review)
  }
  return Array.from(map.values())
}

async function pullFromProvider(source: ExternalReviewSourceRecord, chefWebsiteUrl: string | null) {
  if (source.provider === 'google_places') {
    return fetchGooglePlaceReviews(source.config)
  }

  if (source.provider === 'website_jsonld') {
    const normalized = normalizeWebsiteSourceConfig(source.config)
    validateOwnedWebsiteUrls(chefWebsiteUrl, normalized.urls)
    return fetchWebsiteJsonLdReviews({ ...source.config, urls: normalized.urls })
  }

  throw new Error(`Unsupported external review provider: ${source.provider}`)
}

function shouldRun(source: ExternalReviewSourceRecord) {
  if (!source.active) return false
  if (!source.last_synced_at) return true

  const last = Date.parse(source.last_synced_at)
  if (Number.isNaN(last)) return true

  const next = last + Math.max(15, source.sync_interval_minutes) * 60 * 1000
  return Date.now() >= next
}

function toSourceRecord(row: any): ExternalReviewSourceRecord {
  const provider = String(row.provider) as ExternalReviewProvider
  if (!EXTERNAL_REVIEW_PROVIDERS.includes(provider)) {
    throw new Error(`Unsupported provider stored in source ${row.id}`)
  }

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    provider,
    label: row.label,
    config: toRecord(row.config),
    active: Boolean(row.active),
    sync_interval_minutes: Number(row.sync_interval_minutes || 360),
    last_synced_at: row.last_synced_at,
    last_cursor: row.last_cursor,
    last_error: row.last_error,
  }
}

async function markSyncFailure(supabase: any, sourceId: string, message: string) {
  await supabase
    .from('external_review_sources')
    .update({
      last_error: message,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceId)
}

export async function syncExternalReviewSource(source: ExternalReviewSourceRecord, supabaseClient?: any): Promise<ExternalSyncResult> {
  const supabase: any = supabaseClient ?? createServerClient({ admin: true })

  try {
    const chefWebsiteUrl = await getChefWebsiteUrl(supabase, source.tenant_id)
    const pulled = await pullFromProvider(source, chefWebsiteUrl)
    const normalized = dedupeBySourceReviewId(pulled)
    const nowIso = new Date().toISOString()

    const rows = normalized.map((review) => ({
      tenant_id: source.tenant_id,
      source_id: source.id,
      provider: source.provider,
      source_review_id: review.sourceReviewId,
      source_url: review.sourceUrl,
      author_name: review.authorName,
      rating: review.rating,
      review_text: review.reviewText,
      review_date: review.reviewDate,
      raw_payload: review.rawPayload,
      last_seen_at: nowIso,
    }))

    let upserted = 0
    if (rows.length > 0) {
      const { data, error } = await supabase
        .from('external_reviews')
        .upsert(rows, {
          onConflict: 'tenant_id,provider,source_review_id',
        })
        .select('id')

      if (error) {
        throw new Error(`Failed to upsert external reviews: ${error.message}`)
      }

      upserted = (data || []).length
    }

    const { error: sourceUpdateError } = await supabase
      .from('external_review_sources')
      .update({
        last_synced_at: nowIso,
        last_error: null,
        last_cursor: nowIso,
      })
      .eq('id', source.id)

    if (sourceUpdateError) {
      throw new Error(`Failed to update source sync state: ${sourceUpdateError.message}`)
    }

    return {
      sourceId: source.id,
      provider: source.provider,
      pulled: normalized.length,
      upserted,
      skipped: false,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown external review sync error'
    await markSyncFailure(supabase, source.id, message)

    return {
      sourceId: source.id,
      provider: source.provider,
      pulled: 0,
      upserted: 0,
      skipped: false,
      error: message,
    }
  }
}

export async function syncExternalReviewSourceById(sourceId: string, options?: {
  admin?: boolean
  skipIntervalCheck?: boolean
}) {
  const supabase: any = createServerClient({ admin: options?.admin ?? true })

  const { data, error } = await supabase
    .from('external_review_sources')
    .select('id, tenant_id, provider, label, config, active, sync_interval_minutes, last_synced_at, last_cursor, last_error')
    .eq('id', sourceId)
    .single()

  if (error || !data) {
    throw new Error('External review source not found')
  }

  const source = toSourceRecord(data)
  if (!source.active) {
    return {
      sourceId: source.id,
      provider: source.provider,
      pulled: 0,
      upserted: 0,
      skipped: true,
    } satisfies ExternalSyncResult
  }

  if (!options?.skipIntervalCheck && !shouldRun(source)) {
    return {
      sourceId: source.id,
      provider: source.provider,
      pulled: 0,
      upserted: 0,
      skipped: true,
    } satisfies ExternalSyncResult
  }

  return syncExternalReviewSource(source, supabase)
}

export async function syncAllActiveExternalReviewSources(limit = 100) {
  const supabase: any = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('external_review_sources')
    .select('id, tenant_id, provider, label, config, active, sync_interval_minutes, last_synced_at, last_cursor, last_error')
    .eq('active', true)
    .order('updated_at', { ascending: true })
    .limit(Math.max(1, Math.min(limit, 500)))

  if (error) {
    throw new Error(`Failed to load external review sources: ${error.message}`)
  }

  const sources = ((data || []) as any[]).map(toSourceRecord)

  const results: ExternalSyncResult[] = []
  for (const source of sources) {
    if (!shouldRun(source)) {
      results.push({
        sourceId: source.id,
        provider: source.provider,
        pulled: 0,
        upserted: 0,
        skipped: true,
      })
      continue
    }

    const result = await syncExternalReviewSource(source, supabase)
    results.push(result)
  }

  const synced = results.filter((result) => !result.skipped)

  return {
    totalSources: sources.length,
    attempted: synced.length,
    skipped: results.length - synced.length,
    failed: synced.filter((result) => !!result.error).length,
    pulled: synced.reduce((sum, result) => sum + result.pulled, 0),
    upserted: synced.reduce((sum, result) => sum + result.upserted, 0),
    results,
  }
}
