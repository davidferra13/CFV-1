/**
 * Ingredient knowledge queries - public, no authentication required.
 *
 * Bridges openclaw.canonical_ingredients (price data) with
 * system_ingredients + ingredient_knowledge (encyclopedic data).
 *
 * Matching is done by name similarity because the two systems use
 * different ID schemes. We use trigram similarity (pg_trgm) so that
 * "Artichoke, (globe or french)" matches "Artichoke".
 */

import { pgClient } from '@/lib/db'
import { isKnowledgeIngredientPubliclyIndexable } from '@/lib/openclaw/public-ingredient-publish'

async function withPgTrgmSimilarityThreshold<T>(
  threshold: number,
  runner: (client: typeof pgClient) => Promise<T>
): Promise<T> {
  const transactionalClient = pgClient as typeof pgClient & {
    begin?: unknown
  }
  const begin = transactionalClient.begin as unknown as
    | ((callback: (tx: typeof pgClient) => Promise<T>) => Promise<T>)
    | undefined

  if (typeof begin !== 'function') {
    return runner(pgClient)
  }

  return begin(async (tx) => {
    const transactionClient = tx as typeof pgClient
    await transactionClient`SET LOCAL pg_trgm.similarity_threshold = ${threshold}`
    return runner(transactionClient)
  })
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IngredientKnowledge {
  wikidataQid: string | null
  wikipediaSlug: string | null
  wikipediaUrl: string | null
  wikiSummary: string | null
  wikiExtract: string | null
  originCountries: string[]
  flavorProfile: string | null
  culinaryUses: string | null
  typicalPairings: string[]
  taxonName: string | null
  dietaryFlags: string[]
  imageUrl: string | null
  nutritionJson: Record<string, unknown> | null
  culinarySection: string | null
  enrichmentConfidence: number | null
  enrichedAt: string | null
}

// ---------------------------------------------------------------------------
// Fetch knowledge by ingredient name (fuzzy match)
// ---------------------------------------------------------------------------

/**
 * Look up encyclopedic knowledge for an ingredient by display name.
 * Matches against system_ingredients using trigram similarity, then joins
 * to ingredient_knowledge. Returns null if no enriched match found.
 *
 * Similarity threshold 0.3 is intentionally loose - ingredient names in the
 * two systems often differ slightly (e.g. "Basil, fresh" vs "Basil").
 */
export async function getIngredientKnowledgeByName(
  name: string
): Promise<IngredientKnowledge | null> {
  if (!name?.trim()) return null

  const rows = await withPgTrgmSimilarityThreshold(0.30, (client) =>
    client`
      SELECT
        k.wikidata_qid,
        k.wikipedia_slug,
        k.wikipedia_url,
        k.wiki_summary,
        k.wiki_extract,
        k.origin_countries,
        k.flavor_profile,
        k.culinary_uses,
        k.typical_pairings,
        k.taxon_name,
        k.dietary_flags,
        k.image_url,
        k.nutrition_json,
        k.culinary_section,
        k.enrichment_confidence,
        k.enriched_at,
        extensions.similarity(si.name, ${name}) AS sim
      FROM system_ingredients si
      JOIN ingredient_knowledge k ON k.system_ingredient_id = si.id
      WHERE si.is_active = true
        AND k.needs_review = false
        AND k.wiki_summary IS NOT NULL
        AND si.name OPERATOR(extensions.%) ${name}
      ORDER BY sim DESC
      LIMIT 1
    `
  )

  const row = (rows as any[])[0]
  if (!row) return null

  return {
    wikidataQid: row.wikidata_qid ?? null,
    wikipediaSlug: row.wikipedia_slug ?? null,
    wikipediaUrl: row.wikipedia_url ?? null,
    wikiSummary: row.wiki_summary ?? null,
    wikiExtract: row.wiki_extract ?? null,
    originCountries: (row.origin_countries as string[]) ?? [],
    flavorProfile: row.flavor_profile ?? null,
    culinaryUses: row.culinary_uses ?? null,
    typicalPairings: (row.typical_pairings as string[]) ?? [],
    taxonName: row.taxon_name ?? null,
    dietaryFlags: (row.dietary_flags as string[]) ?? [],
    imageUrl: row.image_url ?? null,
    nutritionJson: row.nutrition_json ?? null,
    culinarySection: row.culinary_section ?? null,
    enrichmentConfidence: row.enrichment_confidence ? Number(row.enrichment_confidence) : null,
    enrichedAt: row.enriched_at ? new Date(row.enriched_at).toISOString() : null,
  }
}

// ---------------------------------------------------------------------------
// Fetch knowledge by system_ingredient UUID (direct, used from chef portal)
// ---------------------------------------------------------------------------

export async function getIngredientKnowledgeById(
  systemIngredientId: string
): Promise<IngredientKnowledge | null> {
  const rows = await pgClient`
    SELECT
      k.wikidata_qid, k.wikipedia_slug, k.wikipedia_url,
      k.wiki_summary, k.wiki_extract, k.origin_countries,
      k.flavor_profile, k.culinary_uses, k.typical_pairings,
      k.taxon_name, k.dietary_flags, k.image_url,
      k.nutrition_json, k.culinary_section,
      k.enrichment_confidence, k.enriched_at
    FROM ingredient_knowledge k
    WHERE k.system_ingredient_id = ${systemIngredientId}
      AND k.needs_review = false
    LIMIT 1
  `

  const row = (rows as any[])[0]
  if (!row) return null

  return {
    wikidataQid: row.wikidata_qid ?? null,
    wikipediaSlug: row.wikipedia_slug ?? null,
    wikipediaUrl: row.wikipedia_url ?? null,
    wikiSummary: row.wiki_summary ?? null,
    wikiExtract: row.wiki_extract ?? null,
    originCountries: (row.origin_countries as string[]) ?? [],
    flavorProfile: row.flavor_profile ?? null,
    culinaryUses: row.culinary_uses ?? null,
    typicalPairings: (row.typical_pairings as string[]) ?? [],
    taxonName: row.taxon_name ?? null,
    dietaryFlags: (row.dietary_flags as string[]) ?? [],
    imageUrl: row.image_url ?? null,
    nutritionJson: row.nutrition_json ?? null,
    culinarySection: row.culinary_section ?? null,
    enrichmentConfidence: row.enrichment_confidence ? Number(row.enrichment_confidence) : null,
    enrichedAt: row.enriched_at ? new Date(row.enriched_at).toISOString() : null,
  }
}

// ---------------------------------------------------------------------------
// Fetch knowledge by URL slug (via ingredient_knowledge_slugs table)
// Returns knowledge + ingredient display name, or null if slug not found.
// ---------------------------------------------------------------------------

export async function getIngredientKnowledgeBySlug(
  slug: string
): Promise<{ knowledge: IngredientKnowledge; name: string; category: string | null } | null> {
  if (!isKnowledgeIngredientPubliclyIndexable({ slug })) return null

  const rows = await pgClient`
    SELECT
      si.name,
      si.category,
      k.wikidata_qid, k.wikipedia_slug, k.wikipedia_url,
      k.wiki_summary, k.wiki_extract, k.origin_countries,
      k.flavor_profile, k.culinary_uses, k.typical_pairings,
      k.taxon_name, k.dietary_flags, k.image_url,
      k.nutrition_json, k.culinary_section,
      k.enrichment_confidence, k.enriched_at
    FROM ingredient_knowledge_slugs iks
    JOIN system_ingredients si ON si.id = iks.system_ingredient_id
    JOIN ingredient_knowledge k ON k.system_ingredient_id = iks.system_ingredient_id
    WHERE iks.slug = ${slug}
      AND k.needs_review = false
    LIMIT 1
  `

  const row = (rows as any[])[0]
  if (!row) return null
  if (!isKnowledgeIngredientPubliclyIndexable({ slug, name: row.name ?? slug })) return null

  return {
    name: row.name ?? slug,
    category: row.category ?? null,
    knowledge: {
      wikidataQid: row.wikidata_qid ?? null,
      wikipediaSlug: row.wikipedia_slug ?? null,
      wikipediaUrl: row.wikipedia_url ?? null,
      wikiSummary: row.wiki_summary ?? null,
      wikiExtract: row.wiki_extract ?? null,
      originCountries: (row.origin_countries as string[]) ?? [],
      flavorProfile: row.flavor_profile ?? null,
      culinaryUses: row.culinary_uses ?? null,
      typicalPairings: (row.typical_pairings as string[]) ?? [],
      taxonName: row.taxon_name ?? null,
      dietaryFlags: (row.dietary_flags as string[]) ?? [],
      imageUrl: row.image_url ?? null,
      nutritionJson: row.nutrition_json ?? null,
      culinarySection: row.culinary_section ?? null,
      enrichmentConfidence: row.enrichment_confidence ? Number(row.enrichment_confidence) : null,
      enrichedAt: row.enriched_at ? new Date(row.enriched_at).toISOString() : null,
    },
  }
}

// ---------------------------------------------------------------------------
// Batch fetch knowledge for multiple ingredient names (for recipe pages)
// Returns a Map of name -> IngredientKnowledge for matched names.
// ---------------------------------------------------------------------------

export async function getIngredientKnowledgeBatch(
  names: string[]
): Promise<Map<string, IngredientKnowledge>> {
  if (!names.length) return new Map()

  const result = new Map<string, IngredientKnowledge>()

  // Run parallel lookups - each uses the indexed similarity function
  const rows = await Promise.all(names.map((name) => getIngredientKnowledgeByName(name)))

  for (let i = 0; i < names.length; i++) {
    const k = rows[i]
    if (k) result.set(names[i], k)
  }

  return result
}

// ---------------------------------------------------------------------------
// List enriched ingredient slugs for sitemap generation
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

export const INGREDIENT_CATEGORIES: Record<string, string> = {
  produce: 'Produce',
  protein: 'Proteins',
  pantry: 'Pantry',
  baking: 'Baking',
  dairy: 'Dairy',
  beverage: 'Beverages',
  oil: 'Oils',
  canned: 'Canned Goods',
  specialty: 'Specialty',
  frozen: 'Frozen',
  alcohol: 'Alcohol',
  condiment: 'Condiments',
  spice: 'Spices',
  fresh_herb: 'Fresh Herbs',
  other: 'Other',
}

export async function getIngredientCategories(): Promise<
  Array<{ category: string; label: string; count: number }>
> {
  const rows = await pgClient`
    SELECT si.category, COUNT(*) AS cnt
    FROM ingredient_knowledge_slugs iks
    JOIN system_ingredients si ON si.id = iks.system_ingredient_id
    JOIN ingredient_knowledge k ON k.system_ingredient_id = iks.system_ingredient_id
    WHERE k.wiki_summary IS NOT NULL AND k.needs_review = false
      AND si.category IS NOT NULL
    GROUP BY si.category
    ORDER BY cnt DESC
  `

  return (rows as any[]).map((r) => ({
    category: r.category as string,
    label: INGREDIENT_CATEGORIES[r.category] ?? r.category,
    count: Number(r.cnt),
  }))
}

export type CategoryIngredient = {
  slug: string
  name: string
  wikiSummary: string | null
  flavorProfile: string | null
  dietaryFlags: string[]
  imageUrl: string | null
}

export async function getIngredientsByCategory(
  category: string,
  offset = 0,
  limit = 48
): Promise<{ items: CategoryIngredient[]; total: number }> {
  const rows = await pgClient`
    SELECT
      iks.slug, si.name,
      k.wiki_summary, k.flavor_profile, k.dietary_flags, k.image_url,
      COUNT(*) OVER() AS total_count
    FROM ingredient_knowledge_slugs iks
    JOIN system_ingredients si ON si.id = iks.system_ingredient_id
    JOIN ingredient_knowledge k ON k.system_ingredient_id = iks.system_ingredient_id
    WHERE k.wiki_summary IS NOT NULL AND k.needs_review = false
      AND si.category = ${category}
    ORDER BY si.name ASC
    LIMIT ${limit} OFFSET ${offset}
  `

  const total = (rows as any[]).length > 0 ? Number((rows as any[])[0].total_count) : 0
  return {
    total,
    items: (rows as any[]).map((r) => ({
      slug: r.slug as string,
      name: r.name as string,
      wikiSummary: r.wiki_summary ?? null,
      flavorProfile: r.flavor_profile ?? null,
      dietaryFlags: (r.dietary_flags as string[]) ?? [],
      imageUrl: r.image_url ?? null,
    })),
  }
}

export async function getRelatedIngredients(
  category: string,
  excludeSlug: string,
  limit = 6
): Promise<CategoryIngredient[]> {
  const searchLimit = Math.min(Math.max(limit, 1) * 4, 24)
  const rows = await pgClient`
    SELECT iks.slug, si.name, k.wiki_summary, k.flavor_profile, k.dietary_flags, k.image_url
    FROM ingredient_knowledge_slugs iks
    JOIN system_ingredients si ON si.id = iks.system_ingredient_id
    JOIN ingredient_knowledge k ON k.system_ingredient_id = iks.system_ingredient_id
    WHERE k.wiki_summary IS NOT NULL AND k.needs_review = false
      AND si.category = ${category}
      AND iks.slug != ${excludeSlug}
    ORDER BY RANDOM()
    LIMIT ${searchLimit}
  `

  return (rows as any[])
    .filter((r) => isKnowledgeIngredientPubliclyIndexable({ slug: r.slug, name: r.name }))
    .slice(0, limit)
    .map((r) => ({
      slug: r.slug as string,
      name: r.name as string,
      wikiSummary: r.wiki_summary ?? null,
      flavorProfile: r.flavor_profile ?? null,
      dietaryFlags: (r.dietary_flags as string[]) ?? [],
      imageUrl: r.image_url ?? null,
    }))
}

export async function getEnrichedIngredientSlugs(): Promise<
  Array<{ slug: string; enrichedAt: string }>
> {
  const rows = await pgClient`
    SELECT iks.slug, k.enriched_at, si.name
    FROM ingredient_knowledge_slugs iks
    JOIN system_ingredients si ON si.id = iks.system_ingredient_id
    JOIN ingredient_knowledge k ON k.system_ingredient_id = iks.system_ingredient_id
    WHERE k.wiki_summary IS NOT NULL AND k.needs_review = false
    ORDER BY k.enriched_at DESC
  `

  return (rows as any[])
    .filter((r) => isKnowledgeIngredientPubliclyIndexable({ slug: r.slug, name: r.name }))
    .map((r) => ({
      slug: r.slug as string,
      enrichedAt: r.enriched_at ? new Date(r.enriched_at).toISOString() : new Date().toISOString(),
    }))
}

// ---------------------------------------------------------------------------
// Recently enriched ingredients (for homepage fresh content)
// ---------------------------------------------------------------------------

export async function getRecentlyEnrichedIngredients(limit = 12): Promise<CategoryIngredient[]> {
  const rows = await pgClient`
    SELECT iks.slug, si.name, k.wiki_summary, k.flavor_profile, k.dietary_flags, k.image_url
    FROM ingredient_knowledge_slugs iks
    JOIN system_ingredients si ON si.id = iks.system_ingredient_id
    JOIN ingredient_knowledge k ON k.system_ingredient_id = iks.system_ingredient_id
    WHERE k.wiki_summary IS NOT NULL AND k.needs_review = false AND k.image_url IS NOT NULL
    ORDER BY k.enriched_at DESC
    LIMIT ${limit}
  `
  return (rows as any[]).map((r) => ({
    slug: r.slug as string,
    name: r.name as string,
    wikiSummary: r.wiki_summary ?? null,
    flavorProfile: r.flavor_profile ?? null,
    dietaryFlags: (r.dietary_flags as string[]) ?? [],
    imageUrl: r.image_url ?? null,
  }))
}

// ---------------------------------------------------------------------------
// Stats: how many ingredients have knowledge data
// ---------------------------------------------------------------------------

export async function getKnowledgeStats(): Promise<{
  total: number
  enriched: number
  needsReview: number
  coverage: number
}> {
  const rows = await pgClient`
    SELECT
      COUNT(*) FILTER (WHERE si.is_active) AS total,
      COUNT(k.id) FILTER (WHERE k.needs_review = false AND k.wiki_summary IS NOT NULL) AS enriched,
      COUNT(k.id) FILTER (WHERE k.needs_review = true) AS needs_review
    FROM system_ingredients si
    LEFT JOIN ingredient_knowledge k ON k.system_ingredient_id = si.id
  `

  const row = (rows as any[])[0]
  const total = Number(row?.total ?? 0)
  const enriched = Number(row?.enriched ?? 0)
  return {
    total,
    enriched,
    needsReview: Number(row?.needs_review ?? 0),
    coverage: total > 0 ? Math.round((enriched / total) * 100) : 0,
  }
}
