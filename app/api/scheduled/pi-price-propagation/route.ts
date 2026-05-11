import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { createServerClient } from '@/lib/db/server'
import { isPiBridgeAvailable } from '@/lib/pricing/pi-bridge'
import { refreshIngredientCostsForTenant } from '@/lib/pricing/cost-refresh-actions'

const EVENT_LIMIT = 500
const TENANT_LIMIT = 25

type TenantEventMap = Map<string, Set<string>>

function todayString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`
}

async function getRecipeClosure(db: any, recipeIds: string[]): Promise<string[]> {
  const allRecipeIds = new Set(recipeIds)
  let frontier = recipeIds

  for (let depth = 0; depth < 4 && frontier.length > 0; depth++) {
    const { data: links } = await db
      .from('recipe_sub_recipes')
      .select('child_recipe_id')
      .in('parent_recipe_id', frontier)

    const next = ((links ?? []) as Array<{ child_recipe_id: string | null }>)
      .map((link) => link.child_recipe_id)
      .filter((id): id is string => {
        if (!id) return false
        return !allRecipeIds.has(id)
      })

    next.forEach((id) => allRecipeIds.add(id))
    frontier = next
  }

  return Array.from(allRecipeIds)
}

async function getIngredientIdsForMenus(db: any, menuIds: string[]): Promise<string[]> {
  if (menuIds.length === 0) return []

  const { data: dishes } = await db.from('dishes').select('id').in('menu_id', menuIds)
  const dishIds = ((dishes ?? []) as Array<{ id: string }>).map((dish) => dish.id)
  if (dishIds.length === 0) return []

  const { data: components } = await db
    .from('components')
    .select('recipe_id')
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  const recipeIds = [
    ...new Set(
      ((components ?? []) as Array<{ recipe_id: string | null }>)
        .map((component) => component.recipe_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  if (recipeIds.length === 0) return []

  const allRecipeIds = await getRecipeClosure(db, recipeIds)
  const { data: ingredients } = await db
    .from('recipe_ingredients')
    .select('ingredient_id')
    .in('recipe_id', allRecipeIds)

  return [
    ...new Set(
      ((ingredients ?? []) as Array<{ ingredient_id: string | null }>)
        .map((ingredient) => ingredient.ingredient_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]
}

async function runPiPricePropagation(request: NextRequest) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('pi-price-propagation', async () => {
      const piAvailable = await isPiBridgeAvailable()
      if (!piAvailable) {
        return { skipped: true, reason: 'pi_bridge_unavailable', tenants: [] }
      }

      const db: any = createServerClient({ admin: true })
      const { data: events, error } = await db
        .from('events')
        .select('id, tenant_id, menu_id')
        .not('menu_id', 'is', null)
        .not('status', 'in', '(cancelled,completed,archived)')
        .gte('event_date', todayString())
        .order('event_date', { ascending: true })
        .limit(EVENT_LIMIT)

      if (error) throw new Error(error.message)

      const menusByTenant: TenantEventMap = new Map()
      for (const event of (events ?? []) as Array<{
        tenant_id: string | null
        menu_id: string | null
      }>) {
        if (!event.tenant_id || !event.menu_id) continue
        if (!menusByTenant.has(event.tenant_id)) menusByTenant.set(event.tenant_id, new Set())
        menusByTenant.get(event.tenant_id)!.add(event.menu_id)
      }

      const tenantResults: Array<{
        tenantId: string
        menuCount: number
        ingredientCount: number
        refreshed: number
        matched: number
        unmatched: number
        errors: number
      }> = []

      for (const [tenantId, menuIds] of Array.from(menusByTenant.entries()).slice(
        0,
        TENANT_LIMIT
      )) {
        const ingredientIds = await getIngredientIdsForMenus(db, Array.from(menuIds))
        if (ingredientIds.length === 0) {
          tenantResults.push({
            tenantId,
            menuCount: menuIds.size,
            ingredientCount: 0,
            refreshed: 0,
            matched: 0,
            unmatched: 0,
            errors: 0,
          })
          continue
        }

        const refreshResult = await refreshIngredientCostsForTenant(tenantId, ingredientIds)
        tenantResults.push({
          tenantId,
          menuCount: menuIds.size,
          ingredientCount: ingredientIds.length,
          refreshed: refreshResult.refreshed,
          matched: refreshResult.matched,
          unmatched: refreshResult.unmatched,
          errors: refreshResult.errors.length,
        })
      }

      return {
        skipped: false,
        eventCount: (events ?? []).length,
        tenantCount: tenantResults.length,
        tenants: tenantResults,
      }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[pi-price-propagation] Cron failed:', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return runPiPricePropagation(request)
}

export async function POST(request: NextRequest) {
  return runPiPricePropagation(request)
}
