import { createServerClient } from '@/lib/db/server'
import type { DinnerCircleSourceLink } from '@/lib/dinner-circles/types'

export interface IngredientShowcaseResult {
  ingredientLines: string[]
  sourceLinks: DinnerCircleSourceLink[]
}

/**
 * Build ingredient showcase data for an event from the database.
 * Queries the event's menu chain (menu -> dish -> component -> recipe -> ingredient)
 * via the event_ingredient_lifecycle view, then enriches with vendor data.
 *
 * Returns data in the same shape as DinnerCircleConfig.supplier so it can
 * be used as a fallback when manual entries are empty.
 */
export async function buildEventIngredientShowcase(
  eventId: string,
  tenantId: string
): Promise<IngredientShowcaseResult> {
  if (!eventId.trim()) {
    throw new Error('Event ID is required to build ingredient showcase data')
  }

  if (!tenantId.trim()) {
    throw new Error('Tenant ID is required to build ingredient showcase data')
  }

  const db: any = createServerClient({ admin: true })

  // 1. Get lifecycle data for this event from the view
  const { data: lifecycle, error: lifecycleError } = await db
    .from('event_ingredient_lifecycle')
    .select('ingredient_id, ingredient_name, unit, recipe_qty')
    .eq('event_id', eventId)
    .eq('chef_id', tenantId)

  if (lifecycleError) {
    throw new Error(`Failed to load event ingredient lifecycle: ${lifecycleError.message}`)
  }

  if (!lifecycle || lifecycle.length === 0) {
    return { ingredientLines: [], sourceLinks: [] }
  }

  // 2. Get ingredient details with vendor info
  const ingredientIds = [
    ...new Set(
      (lifecycle as any[])
        .map((l: any) => l.ingredient_id)
        .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    ),
  ]

  if (ingredientIds.length === 0) {
    return { ingredientLines: [], sourceLinks: [] }
  }

  const { data: ingredients, error: ingredientsError } = await db
    .from('ingredients')
    .select('id, name, category, preferred_vendor')
    .in('id', ingredientIds)
    .eq('tenant_id', tenantId)

  if (ingredientsError) {
    throw new Error(`Failed to load ingredient showcase details: ${ingredientsError.message}`)
  }

  const detailMap: Record<
    string,
    { name: string; category: string | null; preferred_vendor: string | null }
  > = {}
  for (const ing of ingredients ?? []) {
    detailMap[ing.id] = {
      name: ing.name,
      category: ing.category ?? null,
      preferred_vendor: ing.preferred_vendor ?? null,
    }
  }

  // 3. Build ingredient lines and source links
  const ingredientLines: string[] = []
  const sourceLinks: DinnerCircleSourceLink[] = []
  const seenIngredients = new Set<string>()

  for (const item of lifecycle as any[]) {
    const detail = detailMap[item.ingredient_id]
    const name = detail?.name ?? item.ingredient_name

    // Deduplicate (same ingredient may appear in multiple recipes)
    if (seenIngredients.has(item.ingredient_id)) continue
    seenIngredients.add(item.ingredient_id)

    ingredientLines.push(name)

    if (detail?.preferred_vendor) {
      sourceLinks.push({
        ingredient: name,
        sourceName: detail.preferred_vendor,
      })
    }
  }

  return { ingredientLines, sourceLinks }
}
