import { pgClient } from '@/lib/db'
import { isLikelyAliasMatch, normalizeDictionaryAlias } from './normalization'
import { filterPublicDictionaryTerms } from './publication'
import { SEEDED_DICTIONARY_TERMS } from './seed'
import { DICTIONARY_ALIAS_KINDS, DICTIONARY_TERM_TYPES } from './types'
import type {
  CulinaryDictionaryAlias,
  CulinaryDictionaryReviewItem,
  CulinaryDictionarySafetyFlag,
  CulinaryDictionaryStats,
  CulinaryDictionaryTerm,
  DictionaryAliasSuggestion,
  DictionaryTermType,
} from './types'

type DictionarySearchInput = {
  query?: string
  termType?: DictionaryTermType | 'all'
  publicOnly?: boolean
  chefId?: string | null
  limit?: number
}

function toNumber(value: unknown, fallback = 0): number {
  if (value == null) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function cloneSeedTerms(): CulinaryDictionaryTerm[] {
  return SEEDED_DICTIONARY_TERMS.map((term) => ({
    ...term,
    aliases: term.aliases.map((alias) => ({ ...alias })),
    safetyFlags: term.safetyFlags.map((flag) => ({ ...flag })),
  }))
}

function isMissingDictionaryTableError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '42P01'
  )
}

function searchSeedTerms(input: DictionarySearchInput): CulinaryDictionaryTerm[] {
  const query = input.query?.trim() ?? ''
  const normalizedQuery = normalizeDictionaryAlias(query)
  let terms = cloneSeedTerms()

  if (input.publicOnly) {
    terms = filterPublicDictionaryTerms(terms)
  }

  if (input.termType && input.termType !== 'all') {
    terms = terms.filter((term) => term.termType === input.termType)
  }

  if (normalizedQuery) {
    terms = terms.filter(
      (term) =>
        isLikelyAliasMatch(normalizedQuery, term.canonicalName) ||
        term.aliases.some((alias) => isLikelyAliasMatch(normalizedQuery, alias.alias))
    )
  }

  return terms.slice(0, input.limit ?? 50)
}

function mapRowsToTerms(rows: any[]): CulinaryDictionaryTerm[] {
  const byId = new Map<string, CulinaryDictionaryTerm>()

  for (const row of rows) {
    const id = String(row.term_id)
    let term = byId.get(id)
    if (!term) {
      term = {
        id,
        canonicalSlug: String(row.canonical_slug),
        canonicalName: String(row.canonical_name),
        termType: row.term_type,
        category: row.category ?? null,
        shortDefinition: row.short_definition ?? null,
        longDefinition: row.long_definition ?? null,
        publicSafe: Boolean(row.public_safe),
        source: row.term_source ?? 'system',
        confidence: toNumber(row.term_confidence, 1),
        needsReview: Boolean(row.term_needs_review),
        aliases: [],
        safetyFlags: [],
      }
      byId.set(id, term)
    }

    if (row.alias_id && !term.aliases.some((alias) => alias.id === String(row.alias_id))) {
      term.aliases.push({
        id: String(row.alias_id),
        termId: id,
        alias: String(row.alias),
        normalizedAlias: String(row.normalized_alias),
        aliasKind: row.alias_kind,
        confidence: toNumber(row.alias_confidence, 1),
        source: row.alias_source ?? 'system',
        needsReview: Boolean(row.alias_needs_review),
      } satisfies CulinaryDictionaryAlias)
    }

    if (row.flag_id && !term.safetyFlags.some((flag) => flag.id === String(row.flag_id))) {
      term.safetyFlags.push({
        id: String(row.flag_id),
        termId: id,
        flagType: row.flag_type,
        flagKey: String(row.flag_key),
        severity: row.severity,
        explanation: row.explanation ?? null,
        source: row.flag_source ?? 'system',
      } satisfies CulinaryDictionarySafetyFlag)
    }
  }

  return Array.from(byId.values())
}

function isDictionaryTermType(value: unknown): value is DictionaryTermType {
  return typeof value === 'string' && DICTIONARY_TERM_TYPES.includes(value as any)
}

function mapApprovedReviewRowsToTerms(rows: any[]): CulinaryDictionaryTerm[] {
  return rows.map((row) => {
    const resolution = (row.resolution ?? {}) as Record<string, unknown>
    const canonicalName =
      typeof resolution.canonicalName === 'string' && resolution.canonicalName.trim()
        ? resolution.canonicalName.trim()
        : String(row.source_value)
    const canonicalSlug =
      typeof resolution.canonicalSlug === 'string' && resolution.canonicalSlug.trim()
        ? resolution.canonicalSlug.trim()
        : String(row.normalized_value).replace(/\s+/g, '-')
    const termType = isDictionaryTermType(resolution.termType) ? resolution.termType : 'other'
    const category = typeof resolution.category === 'string' ? resolution.category : null

    return {
      id: `chef-review-${String(row.id)}`,
      canonicalSlug,
      canonicalName,
      termType,
      category,
      shortDefinition: null,
      longDefinition: null,
      publicSafe: false,
      source: 'chef',
      confidence: row.confidence == null ? 0.65 : toNumber(row.confidence, 0.65),
      needsReview: false,
      aliases: [
        {
          id: `chef-review-${String(row.id)}-alias`,
          termId: `chef-review-${String(row.id)}`,
          alias: String(row.source_value),
          normalizedAlias: String(row.normalized_value),
          aliasKind: 'synonym',
          confidence: row.confidence == null ? 0.65 : toNumber(row.confidence, 0.65),
          source: 'chef',
          needsReview: false,
        },
      ],
      safetyFlags: [],
    } satisfies CulinaryDictionaryTerm
  })
}

async function getApprovedChefReviewTerms(
  input: DictionarySearchInput,
  limit: number
): Promise<CulinaryDictionaryTerm[]> {
  if (!input.chefId) return []

  const query = input.query?.trim() ?? ''
  const normalizedQuery = normalizeDictionaryAlias(query)

  const rows = await pgClient`
    SELECT id, source_value, normalized_value, confidence, resolution
    FROM culinary_dictionary_review_queue
    WHERE chef_id = ${input.chefId}
      AND status = 'approved'
      AND (${input.termType ?? 'all'} = 'all' OR resolution->>'termType' = ${input.termType ?? 'all'})
      AND (
        ${normalizedQuery} = ''
        OR normalized_value LIKE ${`%${normalizedQuery}%`}
        OR lower(source_value) LIKE ${`%${normalizedQuery}%`}
        OR lower(COALESCE(resolution->>'canonicalName', '')) LIKE ${`%${normalizedQuery}%`}
      )
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  return mapApprovedReviewRowsToTerms(rows as any[])
}

async function applyChefOverrides(
  terms: CulinaryDictionaryTerm[],
  chefId?: string | null
): Promise<CulinaryDictionaryTerm[]> {
  if (!chefId || terms.length === 0) return terms

  const rows = await pgClient`
    SELECT id, term_id, alias_id, override_type, value
    FROM chef_culinary_dictionary_overrides
    WHERE chef_id = ${chefId}
  `

  const termById = new Map(terms.map((term) => [term.id, term]))
  const hiddenAliasIds = new Set(
    (rows as any[])
      .filter((row) => row.override_type === 'hide_alias' && row.alias_id)
      .map((row) => String(row.alias_id))
  )

  for (const row of rows as any[]) {
    const termId = row.term_id ? String(row.term_id) : null
    if (!termId || row.override_type !== 'custom_alias') continue

    const term = termById.get(termId)
    if (!term) continue

    const value = (row.value ?? {}) as Record<string, unknown>
    const alias = typeof value.alias === 'string' ? value.alias.trim() : ''
    const normalizedAlias =
      typeof value.normalizedAlias === 'string'
        ? value.normalizedAlias
        : normalizeDictionaryAlias(alias)
    if (!alias || !normalizedAlias) continue

    if (term.aliases.some((existing) => existing.normalizedAlias === normalizedAlias)) continue

    term.aliases.push({
      id: `chef-${String(row.id)}`,
      termId,
      alias,
      normalizedAlias,
      aliasKind:
        typeof value.aliasKind === 'string' &&
        DICTIONARY_ALIAS_KINDS.includes(value.aliasKind as any)
          ? (value.aliasKind as any)
          : 'synonym',
      confidence: 1,
      source: 'chef',
      needsReview: false,
    })
  }

  if (hiddenAliasIds.size > 0) {
    for (const term of terms) {
      term.aliases = term.aliases.filter((alias) => !hiddenAliasIds.has(alias.id))
    }
  }

  return terms
}

export async function searchDictionaryTerms(
  input: DictionarySearchInput = {}
): Promise<CulinaryDictionaryTerm[]> {
  const query = input.query?.trim() ?? ''
  const normalizedQuery = normalizeDictionaryAlias(query)
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100)

  try {
    const rows = await pgClient`
      SELECT
        t.id AS term_id,
        t.canonical_slug,
        t.canonical_name,
        t.term_type,
        t.category,
        t.short_definition,
        t.long_definition,
        t.public_safe,
        t.source AS term_source,
        t.confidence AS term_confidence,
        t.needs_review AS term_needs_review,
        a.id AS alias_id,
        a.alias,
        a.normalized_alias,
        a.alias_kind,
        a.confidence AS alias_confidence,
        a.source AS alias_source,
        a.needs_review AS alias_needs_review,
        f.id AS flag_id,
        f.flag_type,
        f.flag_key,
        f.severity,
        f.explanation,
        f.source AS flag_source
      FROM culinary_dictionary_terms t
      LEFT JOIN culinary_dictionary_aliases a ON a.term_id = t.id
      LEFT JOIN culinary_dictionary_safety_flags f ON f.term_id = t.id
      WHERE (${input.publicOnly === true} = false OR t.public_safe = true)
        AND (${input.termType ?? 'all'} = 'all' OR t.term_type = ${input.termType ?? 'all'})
        AND (
          ${normalizedQuery} = ''
          OR lower(t.canonical_name) LIKE ${`%${normalizedQuery}%`}
          OR t.canonical_slug LIKE ${`%${normalizedQuery.replace(/\s+/g, '-')}%`}
          OR a.normalized_alias LIKE ${`%${normalizedQuery}%`}
        )
      ORDER BY t.canonical_name ASC, a.confidence DESC NULLS LAST
      LIMIT ${limit * 8}
    `

    const baseTerms = await applyChefOverrides(mapRowsToTerms(rows as any[]), input.chefId)
    const approvedReviewTerms = await getApprovedChefReviewTerms(input, limit)
    const terms = [...baseTerms, ...approvedReviewTerms].slice(0, limit)
    return terms.length > 0 || normalizedQuery ? terms : searchSeedTerms(input)
  } catch (error) {
    if (!isMissingDictionaryTableError(error)) {
      console.warn('[culinary-dictionary] Falling back to seeded dictionary terms', error)
    }
    return searchSeedTerms(input)
  }
}

export async function getDictionaryTermBySlug(
  slug: string,
  publicOnly = false
): Promise<CulinaryDictionaryTerm | null> {
  const terms = await searchDictionaryTerms({ query: slug, publicOnly, limit: 20 })
  return (
    terms.find((term) => term.canonicalSlug === slug || term.id === slug) ??
    terms.find((term) => term.aliases.some((alias) => alias.normalizedAlias === slug)) ??
    null
  )
}

export async function findDictionaryAliasSuggestions(
  query: string,
  limit = 5
): Promise<DictionaryAliasSuggestion[]> {
  const normalized = normalizeDictionaryAlias(query)
  if (!normalized) return []

  const terms = await searchDictionaryTerms({ query: normalized, publicOnly: false, limit })
  return terms
    .flatMap((term) => {
      const matchedAliases = term.aliases.filter((alias) =>
        isLikelyAliasMatch(normalized, alias.normalizedAlias)
      )
      const aliases = matchedAliases.length > 0 ? matchedAliases : term.aliases.slice(0, 1)
      return aliases.map((alias) => ({
        termId: term.id,
        canonicalName: term.canonicalName,
        canonicalSlug: term.canonicalSlug,
        alias: alias.alias,
        normalizedAlias: alias.normalizedAlias,
        aliasKind: alias.aliasKind,
        confidence: alias.confidence,
      }))
    })
    .slice(0, limit)
}

export async function getDictionaryStats(chefId?: string | null): Promise<CulinaryDictionaryStats> {
  try {
    const [termRows, overrideRows, reviewRows] = await Promise.all([
      pgClient`
        SELECT
          COUNT(*)::int AS total_terms,
          COUNT(*) FILTER (WHERE public_safe = true)::int AS public_terms,
          (SELECT COUNT(*)::int FROM culinary_dictionary_aliases) AS alias_count
        FROM culinary_dictionary_terms
      `,
      chefId
        ? pgClient`
          SELECT COUNT(*)::int AS chef_overrides
          FROM chef_culinary_dictionary_overrides
          WHERE chef_id = ${chefId}
        `
        : Promise.resolve([{ chef_overrides: 0 }]),
      chefId
        ? pgClient`
          SELECT COUNT(*)::int AS pending_reviews
          FROM culinary_dictionary_review_queue
          WHERE chef_id = ${chefId}
            AND status = 'pending'
        `
        : Promise.resolve([{ pending_reviews: 0 }]),
    ])

    return {
      totalTerms: toNumber(termRows[0]?.total_terms),
      publicTerms: toNumber(termRows[0]?.public_terms),
      aliasCount: toNumber(termRows[0]?.alias_count),
      pendingReviews: toNumber(reviewRows[0]?.pending_reviews),
      chefOverrides: toNumber(overrideRows[0]?.chef_overrides),
    }
  } catch {
    const seed = cloneSeedTerms()
    return {
      totalTerms: seed.length,
      publicTerms: filterPublicDictionaryTerms(seed).length,
      aliasCount: seed.reduce((sum, term) => sum + term.aliases.length, 0),
      pendingReviews: 0,
      chefOverrides: 0,
    }
  }
}

export async function getDictionaryReviewQueue(
  chefId: string
): Promise<CulinaryDictionaryReviewItem[]> {
  try {
    const rows = await pgClient`
      SELECT
        q.id,
        q.source_surface,
        q.source_value,
        q.normalized_value,
        q.suggested_term_id,
        q.suggested_alias_id,
        q.confidence,
        q.status,
        q.created_at,
        t.canonical_name AS suggested_term_name
      FROM culinary_dictionary_review_queue q
      LEFT JOIN culinary_dictionary_terms t ON t.id = q.suggested_term_id
      WHERE q.chef_id = ${chefId}
      ORDER BY
        CASE WHEN q.status = 'pending' THEN 0 ELSE 1 END,
        q.created_at DESC
      LIMIT 100
    `

    return (rows as any[]).map((row) => ({
      id: String(row.id),
      sourceSurface: String(row.source_surface),
      sourceValue: String(row.source_value),
      normalizedValue: String(row.normalized_value),
      suggestedTermId: row.suggested_term_id ? String(row.suggested_term_id) : null,
      suggestedAliasId: row.suggested_alias_id ? String(row.suggested_alias_id) : null,
      suggestedTermName: row.suggested_term_name ? String(row.suggested_term_name) : null,
      confidence: row.confidence == null ? null : toNumber(row.confidence),
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    }))
  } catch {
    return []
  }
}
