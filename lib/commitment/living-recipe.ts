import { createServerClient } from '@/lib/db/server'

// -- Types --------------------------------------------------------------------

export type RecipeComplianceRuleType =
  | 'document_within_days'
  | 'update_after_modification'
  | 'cost_link_required'
  | 'scaling_verified'

export interface RecipeViolation {
  ruleType: RecipeComplianceRuleType
  recipeId: string | null
  eventId: string | null
  description: string
  deadline: Date | null
}

export interface RecipeComplianceStatus {
  tenantId: string
  totalRecipes: number
  documentedWithinDeadline: number
  staleRecipes: number
  missingCostLink: number
  compliancePercent: number
}

export interface StaleRecipe {
  recipeId: string
  recipeName: string | null
  lastServed: Date | null
  lastUpdated: Date
  daysSinceUpdate: number
  reason: string
}

// -- Helpers ------------------------------------------------------------------

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

// -- Core Functions -----------------------------------------------------------

/**
 * Check recipe compliance for a specific event.
 * Rules: document new dishes within 7 days, update modified recipes within 48hr,
 * cost-link required for "complete" status, scaling verified for large events.
 */
export async function checkRecipeCompliance(
  tenantId: string,
  eventId: string
): Promise<RecipeViolation[]> {
  const client = createServerClient()
  const violations: RecipeViolation[] = []
  const now = new Date()

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('rule')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const activeRules = (commitmentRows ?? [])
    .map((r: any) => (typeof r.rule === 'string' ? JSON.parse(r.rule) : r.rule))
    .filter((r: any) =>
      [
        'document_within_days',
        'update_after_modification',
        'cost_link_required',
        'scaling_verified',
      ].includes(r.type)
    )

  if (activeRules.length === 0) return violations

  const { data: eventRow } = await client
    .from('events' as any)
    .select('*')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!eventRow) return violations

  const eventDate = new Date((eventRow as any).date || (eventRow as any).created_at)
  const guestCount = (eventRow as any).guest_count ?? 0

  const { data: menuItems } = await client
    .from('menu_items' as any)
    .select('id, recipe_id, name')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  const recipeIds = (menuItems ?? []).map((m: any) => m.recipe_id).filter(Boolean)

  for (const rule of activeRules) {
    if (rule.type === 'document_within_days') {
      const deadlineDays = rule.days ?? 7
      const daysSinceEvent = daysBetween(now, eventDate)

      if (daysSinceEvent > deadlineDays) {
        const unlinked = (menuItems ?? []).filter((m: any) => !m.recipe_id)
        for (const item of unlinked) {
          const deadline = new Date(eventDate)
          deadline.setDate(deadline.getDate() + deadlineDays)
          violations.push({
            ruleType: 'document_within_days',
            recipeId: null,
            eventId,
            description: `Dish "${(item as any).name}" served but not documented as recipe (${deadlineDays}-day deadline passed)`,
            deadline,
          })
        }
      }
    }

    if (rule.type === 'update_after_modification' && recipeIds.length > 0) {
      const updateDeadlineHours = rule.hours ?? 48

      for (const recipeId of recipeIds) {
        const { data: recipe } = await client
          .from('recipes' as any)
          .select('id, name, updated_at')
          .eq('id', recipeId)
          .single()

        if (!recipe) continue

        const recipeUpdated = new Date((recipe as any).updated_at)
        if (recipeUpdated < eventDate) {
          const hoursSinceEvent = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60)
          if (hoursSinceEvent > updateDeadlineHours) {
            violations.push({
              ruleType: 'update_after_modification',
              recipeId: (recipe as any).id,
              eventId,
              description: `Recipe "${(recipe as any).name}" may need update after serving (last updated before event)`,
              deadline: new Date(eventDate.getTime() + updateDeadlineHours * 60 * 60 * 1000),
            })
          }
        }
      }
    }

    if (rule.type === 'cost_link_required' && recipeIds.length > 0) {
      for (const recipeId of recipeIds) {
        const { data: recipe } = await client
          .from('recipes' as any)
          .select('id, name, status')
          .eq('id', recipeId)
          .single()

        if (!recipe || (recipe as any).status !== 'complete') continue

        const { count } = await client
          .from('recipe_ingredients' as any)
          .select('id', { count: 'exact', head: true })
          .eq('recipe_id', recipeId)
          .not('cost_per_unit', 'is', null)

        if (!count || count === 0) {
          violations.push({
            ruleType: 'cost_link_required',
            recipeId: (recipe as any).id,
            eventId,
            description: `Recipe "${(recipe as any).name}" marked complete but has no cost data linked`,
            deadline: null,
          })
        }
      }
    }

    if (rule.type === 'scaling_verified' && guestCount >= (rule.minGuests ?? 20)) {
      for (const recipeId of recipeIds) {
        const { data: recipe } = await client
          .from('recipes' as any)
          .select('id, name, base_servings')
          .eq('id', recipeId)
          .single()

        if (!recipe) continue

        const baseServings = (recipe as any).base_servings ?? 4
        if (guestCount > baseServings * 3) {
          violations.push({
            ruleType: 'scaling_verified',
            recipeId: (recipe as any).id,
            eventId,
            description: `Recipe "${(recipe as any).name}" scaled from ${baseServings} to ${guestCount} servings; verify ratios`,
            deadline: null,
          })
        }
      }
    }
  }

  return violations
}

/**
 * Get overall recipe documentation status.
 */
export async function getRecipeStatus(tenantId: string): Promise<RecipeComplianceStatus> {
  const client = createServerClient()

  const { count: totalRecipes } = await client
    .from('recipes' as any)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  const { data: recipesWithCost } = await client
    .from('recipes' as any)
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'complete')

  let missingCostLink = 0
  for (const r of recipesWithCost ?? []) {
    const { count } = await client
      .from('recipe_ingredients' as any)
      .select('id', { count: 'exact', head: true })
      .eq('recipe_id', (r as any).id)
      .not('cost_per_unit', 'is', null)

    if (!count || count === 0) missingCostLink++
  }

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { count: staleRecipes } = await client
    .from('recipes' as any)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .lt('updated_at', ninetyDaysAgo.toISOString())

  const total = totalRecipes ?? 0
  const stale = staleRecipes ?? 0
  const compliant = Math.max(0, total - stale - missingCostLink)

  return {
    tenantId,
    totalRecipes: total,
    documentedWithinDeadline: compliant,
    staleRecipes: stale,
    missingCostLink,
    compliancePercent: total > 0 ? Math.round((compliant / total) * 100) : 100,
  }
}

/**
 * Get recipes that are stale (not updated recently, served but not refreshed).
 */
export async function getStaleRecipes(tenantId: string): Promise<StaleRecipe[]> {
  const client = createServerClient()
  const now = new Date()
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: recipes } = await client
    .from('recipes' as any)
    .select('id, name, updated_at')
    .eq('tenant_id', tenantId)
    .lt('updated_at', ninetyDaysAgo.toISOString())
    .order('updated_at', { ascending: true })

  if (!recipes || recipes.length === 0) return []

  const stale: StaleRecipe[] = []

  for (const r of recipes) {
    const updatedAt = new Date((r as any).updated_at)
    const daysSinceUpdate = daysBetween(now, updatedAt)

    const { data: recentUse } = await client
      .from('menu_items' as any)
      .select('created_at')
      .eq('recipe_id', (r as any).id)
      .order('created_at', { ascending: false })
      .limit(1)

    const lastServed = recentUse?.[0] ? new Date((recentUse[0] as any).created_at) : null

    let reason = `Not updated in ${daysSinceUpdate} days`
    if (lastServed && lastServed > updatedAt) {
      reason = `Served on ${lastServed.toLocaleDateString()} but recipe not updated since ${updatedAt.toLocaleDateString()}`
    }

    stale.push({
      recipeId: (r as any).id,
      recipeName: (r as any).name ?? null,
      lastServed,
      lastUpdated: updatedAt,
      daysSinceUpdate,
      reason,
    })
  }

  return stale
}
