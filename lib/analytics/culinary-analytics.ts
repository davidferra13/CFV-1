'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { dateToDateString } from '@/lib/utils/format'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RecipeUsageStats {
  totalRecipes: number
  recipesUsedInEvents: number
  recipeReuseRate: number // % used in 2+ events
  avgTimesCooked: number
  neverCookedCount: number
  topRecipes: Array<{
    id: string
    name: string
    timesCookedCount: number
    lastCookedAt: string | null
  }>
}

export interface DishPerformanceStats {
  newDishesThisMonth: number
  newDishesThisYear: number
  menuModificationRate: number // % of sent menus that had revision_notes
  avgDishesSentPerMenu: number
}

export interface IngredientCostStats {
  totalIngredients: number
  withPricingData: number
  withPricingPercent: number
  mostExpensive: Array<{ name: string; lastPriceCents: number; unit: string }>
  recentlyUpdated: Array<{ name: string; lastPriceCents: number; lastPriceDate: string }>
}

export interface MenuApprovalStats {
  totalSent: number
  approved: number
  revisionRequested: number
  pending: number
  approvalRate: number
  revisionRate: number
  avgResponseHours: number
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function getRecipeUsageStats(): Promise<RecipeUsageStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: recipes } = await db
    .from('recipes')
    .select('id, name, times_cooked, last_cooked_at')
    .eq('tenant_id', chef.id)
    .eq('archived', false)
    .order('times_cooked', { ascending: false })

  const all = recipes ?? []
  const total = all.length
  const neverCooked = all.filter((r: any) => (r.times_cooked ?? 0) === 0).length
  const usedInEvents = all.filter((r: any) => (r.times_cooked ?? 0) > 0).length
  const usedMultiple = all.filter((r: any) => (r.times_cooked ?? 0) >= 2).length

  const avgCookedCount =
    usedInEvents > 0
      ? Math.round(
          (all.reduce((s: any, r: any) => s + (r.times_cooked ?? 0), 0) / usedInEvents) * 10
        ) / 10
      : 0

  const topRecipes = all
    .filter((r: any) => (r.times_cooked ?? 0) > 0)
    .slice(0, 10)
    .map((r: any) => ({
      id: r.id,
      name: r.name,
      timesCookedCount: r.times_cooked ?? 0,
      lastCookedAt: r.last_cooked_at ?? null,
    }))

  return {
    totalRecipes: total,
    recipesUsedInEvents: usedInEvents,
    recipeReuseRate: pct(usedMultiple, total),
    avgTimesCooked: avgCookedCount,
    neverCookedCount: neverCooked,
    topRecipes,
  }
}

export async function getDishPerformanceStats(): Promise<DishPerformanceStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString()

  // New dishes this month / year (from dishes table, non-template menus)
  const { count: dishesThisMonth } = await db
    .from('dishes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', chef.id)
    .gte('created_at', startOfMonth)

  const { count: dishesThisYear } = await db
    .from('dishes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', chef.id)
    .gte('created_at', startOfYear)

  // Menu modification rate: menus with revision_notes / total sent
  const { data: approvals } = await db
    .from('menu_approval_requests')
    .select('status, revision_notes, sent_at, responded_at')
    .eq('chef_id', chef.id)
    .not('sent_at', 'is', null)

  const totalSent = (approvals ?? []).filter((a: any) => a.sent_at).length
  const withRevisions = (approvals ?? []).filter((a: any) => a.revision_notes).length

  // Avg dishes per sent menu
  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('tenant_id', chef.id)
    .not('status', 'eq', 'draft')
    .not('event_id', 'is', null)

  const menuIds = (menus ?? []).map((m: any) => m.id)
  let avgDishes = 0

  if (menuIds.length > 0) {
    const { data: dishes } = await db.from('dishes').select('menu_id').in('menu_id', menuIds)

    const dishCountPerMenu = new Map<string, number>()
    for (const d of dishes ?? []) {
      dishCountPerMenu.set(d.menu_id, (dishCountPerMenu.get(d.menu_id) ?? 0) + 1)
    }
    const counts = Array.from(dishCountPerMenu.values())
    avgDishes =
      counts.length > 0
        ? Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10
        : 0
  }

  return {
    newDishesThisMonth: dishesThisMonth ?? 0,
    newDishesThisYear: dishesThisYear ?? 0,
    menuModificationRate: pct(withRevisions, totalSent),
    avgDishesSentPerMenu: avgDishes,
  }
}

export async function getIngredientCostStats(): Promise<IngredientCostStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: ingredients } = await db
    .from('ingredients')
    .select('name, last_price_cents, price_unit, last_price_date, average_price_cents')
    .eq('tenant_id', chef.id)
    .eq('archived', false)
    .order('last_price_cents', { ascending: false, nullsFirst: false })

  const all = ingredients ?? []
  const withPricing = all.filter((i: any) => i.last_price_cents != null)

  const mostExpensive = withPricing.slice(0, 5).map((i: any) => ({
    name: i.name,
    lastPriceCents: i.last_price_cents!,
    unit: i.price_unit ?? '',
  }))

  const recentlyUpdated = [...withPricing]
    .filter((i) => i.last_price_date)
    .sort((a, b) => {
      const aDate = a.last_price_date ? dateToDateString(a.last_price_date as Date | string) : ''
      const bDate = b.last_price_date ? dateToDateString(b.last_price_date as Date | string) : ''
      return bDate.localeCompare(aDate)
    })
    .slice(0, 5)
    .map((i) => ({
      name: i.name,
      lastPriceCents: i.last_price_cents!,
      lastPriceDate: i.last_price_date!,
    }))

  return {
    totalIngredients: all.length,
    withPricingData: withPricing.length,
    withPricingPercent: pct(withPricing.length, all.length),
    mostExpensive,
    recentlyUpdated,
  }
}

export async function getMenuApprovalStats(): Promise<MenuApprovalStats> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('menu_approval_requests')
    .select('status, sent_at, responded_at, revision_notes')
    .eq('chef_id', chef.id)
    .not('sent_at', 'is', null)

  const all = data ?? []
  const total = all.length
  const approved = all.filter((a: any) => a.status === 'approved').length
  const revisionReq = all.filter((a: any) => a.status === 'revision_requested').length
  const pending = all.filter((a: any) => a.status === 'sent').length

  const responseTimes = all
    .filter((a: any) => a.sent_at && a.responded_at)
    .map(
      (a: any) =>
        (new Date(a.responded_at!).getTime() - new Date(a.sent_at!).getTime()) / (1000 * 60 * 60)
    )
    .filter((h: any) => h >= 0)

  const avgResponseHours =
    responseTimes.length > 0
      ? Math.round(
          (responseTimes.reduce((a: any, b: any) => a + b, 0) / responseTimes.length) * 10
        ) / 10
      : 0

  return {
    totalSent: total,
    approved,
    revisionRequested: revisionReq,
    pending,
    approvalRate: pct(approved, total),
    revisionRate: pct(revisionReq, total),
    avgResponseHours,
  }
}

export async function getMostCommonDietaryRestrictions(): Promise<
  Array<{ restriction: string; count: number; percent: number }>
> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: events } = await db
    .from('events')
    .select('dietary_restrictions')
    .eq('tenant_id', chef.id)
    .eq('is_demo', false)
    .eq('status', 'completed')

  const total = events?.length ?? 0
  const counts = new Map<string, number>()

  for (const ev of events ?? []) {
    for (const r of ev.dietary_restrictions ?? []) {
      counts.set(r, (counts.get(r) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([restriction, count]) => ({
      restriction,
      count,
      percent: pct(count, total),
    }))
}
