/**
 * Nutrition Enricher
 * Matches chef ingredients to USDA system_ingredients by name/alias,
 * persisting the system_ingredient_id link for local nutrition lookups.
 *
 * Not a 'use server' file. Called by the polish job.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { normalizeIngredientName } from '@/lib/pricing/name-normalizer'

interface SystemIngredient {
  id: string
  name: string
  slug: string
  aliases: string[] | null
  category: string
}

interface UnlinkedIngredient {
  id: string
  name: string
  category: string | null
}

interface EnrichResult {
  linked: number
  categorized: number
  skipped: number
  errors: string[]
}

/**
 * Match unlinked chef ingredients to system_ingredients by name, slug, or alias.
 * Deterministic matching only (no AI). Updates system_ingredient_id on match.
 */
export async function enrichNutritionLinks(options?: {
  batchSize?: number
  dryRun?: boolean
}): Promise<EnrichResult> {
  const batchSize = options?.batchSize ?? 50
  const dryRun = options?.dryRun ?? false
  const result: EnrichResult = { linked: 0, categorized: 0, skipped: 0, errors: [] }

  try {
    // Load all system ingredients for matching
    const systemIngredients = (await db.execute(sql`
      SELECT id, name, slug, aliases, category
      FROM system_ingredients
      WHERE is_active = true
    `)) as unknown as SystemIngredient[]

    if (systemIngredients.length === 0) {
      result.errors.push('No system_ingredients found. Run USDA import first.')
      return result
    }

    // Build lookup maps for fast matching
    const bySlug = new Map<string, SystemIngredient>()
    const byNameLower = new Map<string, SystemIngredient>()
    const byAlias = new Map<string, SystemIngredient>()

    for (const si of systemIngredients) {
      if (si.slug) bySlug.set(si.slug, si)
      byNameLower.set(si.name.toLowerCase(), si)
      if (si.aliases) {
        for (const alias of si.aliases) {
          if (alias) byAlias.set(alias.toLowerCase(), si)
        }
      }
    }

    // Get unlinked ingredients (no system_ingredient_id yet)
    const unlinked = (await db.execute(sql`
      SELECT id, name, category
      FROM ingredients
      WHERE system_ingredient_id IS NULL
        AND archived = false
      ORDER BY name
    `)) as unknown as UnlinkedIngredient[]

    if (unlinked.length === 0) {
      return result
    }

    // Process in batches
    for (let i = 0; i < unlinked.length; i += batchSize) {
      const batch = unlinked.slice(i, i + batchSize)

      for (const ing of batch) {
        try {
          const match = findBestMatch(ing.name, bySlug, byNameLower, byAlias)

          if (!match) {
            result.skipped++
            continue
          }

          if (!dryRun) {
            // Link to system ingredient
            await db.execute(sql`
              UPDATE ingredients
              SET system_ingredient_id = ${match.id},
                  updated_at = now()
              WHERE id = ${ing.id}
                AND system_ingredient_id IS NULL
            `)

            // Inherit category if the chef ingredient has a generic one
            if (
              ing.category &&
              (ing.category === 'other' || ing.category === 'uncategorized') &&
              match.category
            ) {
              await db.execute(sql`
                UPDATE ingredients
                SET category = ${match.category}::ingredient_category,
                    updated_at = now()
                WHERE id = ${ing.id}
              `)
              result.categorized++
            }
          }

          result.linked++
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'unknown'
          result.errors.push(`Failed to link ${ing.name}: ${msg}`)
        }
      }

      // Small delay between batches to avoid overwhelming DB
      if (i + batchSize < unlinked.length) {
        await new Promise((r) => setTimeout(r, 100))
      }
    }

    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    result.errors.push(`Fatal: ${msg}`)
    return result
  }
}

/**
 * Find the best system_ingredient match for a chef ingredient name.
 * Lookup chain: exact name -> normalized name -> slug -> alias -> partial contains
 */
function findBestMatch(
  name: string,
  bySlug: Map<string, SystemIngredient>,
  byNameLower: Map<string, SystemIngredient>,
  byAlias: Map<string, SystemIngredient>
): SystemIngredient | null {
  const lower = name.toLowerCase().trim()
  const normalized = normalizeIngredientName(name)
  const slug = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  // 1. Exact name match
  const exact = byNameLower.get(lower)
  if (exact) return exact

  // 2. Normalized name match
  const norm = byNameLower.get(normalized)
  if (norm) return norm

  // 3. Slug match
  const slugMatch = bySlug.get(slug)
  if (slugMatch) return slugMatch

  // 4. Normalized slug match
  const normSlug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const normSlugMatch = bySlug.get(normSlug)
  if (normSlugMatch) return normSlugMatch

  // 5. Alias match (exact)
  const aliasMatch = byAlias.get(lower)
  if (aliasMatch) return aliasMatch

  // 6. Alias match (normalized)
  const normAliasMatch = byAlias.get(normalized)
  if (normAliasMatch) return normAliasMatch

  // 7. Partial contains (only for names >= 4 chars to avoid false positives)
  if (normalized.length >= 4) {
    for (const [key, si] of byNameLower) {
      if (key.includes(normalized) || normalized.includes(key)) {
        return si
      }
    }
  }

  return null
}
