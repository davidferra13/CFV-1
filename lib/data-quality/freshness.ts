// Data Freshness Engine
// Determines how stale critical business data is across entities.
// No 'use server' here; pure logic consumed by server actions.

import { createServerClient } from '@/lib/db/server'

// ---- Types ----

export type FreshnessStatus = 'fresh' | 'aging' | 'stale' | 'expired'

export interface FreshnessResult {
  ageDays: number
  status: FreshnessStatus
  threshold: { fresh: number; aging: number; stale: number }
  lastUpdated: string | null
}

export interface PriceFreshnessResult extends FreshnessResult {
  ingredientId: string
  ingredientName: string
}

export interface ClientFreshnessResult {
  clientId: string
  clientName: string
  fields: {
    phone: FreshnessResult
    email: FreshnessResult
    address: FreshnessResult
    dietary: FreshnessResult
  }
  worstStatus: FreshnessStatus
  overallAgeDays: number
}

export interface RecipeFreshnessResult {
  recipeId: string
  recipeName: string
  ageDays: number
  status: FreshnessStatus
  lastUpdated: string | null
}

export interface FreshnessReport {
  prices: { fresh: number; aging: number; stale: number; expired: number; total: number }
  clients: { fresh: number; aging: number; stale: number; expired: number; total: number }
  recipes: { fresh: number; aging: number; stale: number; expired: number; total: number }
  overallScore: number // 0-100, percentage of data that is fresh or aging
  staleItems: Array<{
    entity: 'price' | 'client' | 'recipe'
    id: string
    name: string
    ageDays: number
    status: FreshnessStatus
  }>
}

// ---- Thresholds (days) ----

const PRICE_THRESHOLDS = { fresh: 7, aging: 14, stale: 30 }
const CLIENT_THRESHOLDS = { fresh: 90, aging: 180, stale: 365 }
const RECIPE_THRESHOLDS = { fresh: 30, aging: 90, stale: 180 }

// ---- Helpers ----

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity
  const then = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
}

function classifyFreshness(
  ageDays: number,
  thresholds: { fresh: number; aging: number; stale: number }
): FreshnessStatus {
  if (ageDays <= thresholds.fresh) return 'fresh'
  if (ageDays <= thresholds.aging) return 'aging'
  if (ageDays <= thresholds.stale) return 'stale'
  return 'expired'
}

function worstOfStatuses(statuses: FreshnessStatus[]): FreshnessStatus {
  const priority: FreshnessStatus[] = ['expired', 'stale', 'aging', 'fresh']
  for (const p of priority) {
    if (statuses.includes(p)) return p
  }
  return 'fresh'
}

function makeFreshness(
  dateStr: string | null,
  thresholds: { fresh: number; aging: number; stale: number }
): FreshnessResult {
  const ageDays = dateStr ? daysSince(dateStr) : Infinity
  return {
    ageDays: ageDays === Infinity ? -1 : ageDays,
    status: dateStr ? classifyFreshness(ageDays, thresholds) : 'expired',
    threshold: thresholds,
    lastUpdated: dateStr,
  }
}

// ---- Price Freshness ----

export async function checkPriceFreshness(
  tenantId: string,
  ingredientId: string
): Promise<PriceFreshnessResult> {
  const db: any = createServerClient()

  const { data: price } = await db
    .from('chef_ingredient_prices')
    .select('confirmed_at, ingredient_id')
    .eq('chef_id', tenantId)
    .eq('ingredient_id', ingredientId)
    .order('confirmed_at', { ascending: false })
    .limit(1)
    .single()

  const { data: ingredient } = await db
    .from('ingredients')
    .select('name')
    .eq('id', ingredientId)
    .single()

  const confirmedAt = price?.confirmed_at ?? null
  const freshness = makeFreshness(confirmedAt, PRICE_THRESHOLDS)

  return {
    ...freshness,
    ingredientId,
    ingredientName: ingredient?.name ?? 'Unknown ingredient',
  }
}

// ---- Client Freshness ----

export async function checkClientFreshness(
  tenantId: string,
  clientId: string
): Promise<ClientFreshnessResult> {
  const db: any = createServerClient()

  const { data: client } = await db
    .from('clients')
    .select('full_name, phone, email, address, dietary_restrictions, updated_at, created_at')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) {
    return {
      clientId,
      clientName: 'Unknown',
      fields: {
        phone: makeFreshness(null, CLIENT_THRESHOLDS),
        email: makeFreshness(null, CLIENT_THRESHOLDS),
        address: makeFreshness(null, CLIENT_THRESHOLDS),
        dietary: makeFreshness(null, CLIENT_THRESHOLDS),
      },
      worstStatus: 'expired',
      overallAgeDays: -1,
    }
  }

  // We use updated_at as the proxy for all field freshness.
  // If a field is empty/null, treat it as expired regardless.
  const baseDate = client.updated_at || client.created_at

  const phoneFreshness = client.phone
    ? makeFreshness(baseDate, CLIENT_THRESHOLDS)
    : makeFreshness(null, CLIENT_THRESHOLDS)

  const emailFreshness = client.email
    ? makeFreshness(baseDate, CLIENT_THRESHOLDS)
    : makeFreshness(null, CLIENT_THRESHOLDS)

  const addressFreshness = client.address
    ? makeFreshness(baseDate, CLIENT_THRESHOLDS)
    : makeFreshness(null, CLIENT_THRESHOLDS)

  const dietaryRestrictions = client.dietary_restrictions
  const hasDietary = Array.isArray(dietaryRestrictions) && dietaryRestrictions.some((d: string) => d && d.trim() !== '')
  const dietaryFreshness = hasDietary
    ? makeFreshness(baseDate, CLIENT_THRESHOLDS)
    : makeFreshness(null, CLIENT_THRESHOLDS)

  const allStatuses = [
    phoneFreshness.status,
    emailFreshness.status,
    addressFreshness.status,
    dietaryFreshness.status,
  ]

  const overallAge = baseDate ? daysSince(baseDate) : -1

  return {
    clientId,
    clientName: client.full_name,
    fields: {
      phone: phoneFreshness,
      email: emailFreshness,
      address: addressFreshness,
      dietary: dietaryFreshness,
    },
    worstStatus: worstOfStatuses(allStatuses),
    overallAgeDays: overallAge,
  }
}

// ---- Recipe Freshness ----

export async function checkRecipeFreshness(
  tenantId: string,
  recipeId: string
): Promise<RecipeFreshnessResult> {
  const db: any = createServerClient()

  const { data: recipe } = await db
    .from('recipes')
    .select('name, updated_at')
    .eq('id', recipeId)
    .eq('tenant_id', tenantId)
    .single()

  if (!recipe) {
    return {
      recipeId,
      recipeName: 'Unknown',
      ageDays: -1,
      status: 'expired',
      lastUpdated: null,
    }
  }

  const freshness = makeFreshness(recipe.updated_at, RECIPE_THRESHOLDS)

  return {
    recipeId,
    recipeName: recipe.name,
    ageDays: freshness.ageDays,
    status: freshness.status,
    lastUpdated: recipe.updated_at,
  }
}

// ---- Aggregate Report ----

export async function getFreshnessReport(tenantId: string): Promise<FreshnessReport> {
  const db: any = createServerClient()

  // Price freshness: check chef_ingredient_prices
  const { data: prices } = await db
    .from('chef_ingredient_prices')
    .select('ingredient_id, confirmed_at')
    .eq('chef_id', tenantId)

  const priceRows = prices || []
  const priceBuckets = { fresh: 0, aging: 0, stale: 0, expired: 0 }
  for (const p of priceRows) {
    const status = classifyFreshness(daysSince(p.confirmed_at), PRICE_THRESHOLDS)
    priceBuckets[status]++
  }

  // Client freshness
  const { data: clientRows } = await db
    .from('clients')
    .select('id, full_name, updated_at, created_at')
    .eq('tenant_id', tenantId)

  const clients = clientRows || []
  const clientBuckets = { fresh: 0, aging: 0, stale: 0, expired: 0 }
  for (const c of clients) {
    const baseDate = c.updated_at || c.created_at
    const status = baseDate
      ? classifyFreshness(daysSince(baseDate), CLIENT_THRESHOLDS)
      : 'expired' as FreshnessStatus
    clientBuckets[status]++
  }

  // Recipe freshness
  const { data: recipeRows } = await db
    .from('recipes')
    .select('id, name, updated_at')
    .eq('tenant_id', tenantId)
    .eq('archived', false)

  const recipes = recipeRows || []
  const recipeBuckets = { fresh: 0, aging: 0, stale: 0, expired: 0 }
  for (const r of recipes) {
    const status = r.updated_at
      ? classifyFreshness(daysSince(r.updated_at), RECIPE_THRESHOLDS)
      : 'expired' as FreshnessStatus
    recipeBuckets[status]++
  }

  // Build stale items list (stale + expired only, capped at 50)
  const staleItems: FreshnessReport['staleItems'] = []

  for (const p of priceRows) {
    const age = daysSince(p.confirmed_at)
    const status = classifyFreshness(age, PRICE_THRESHOLDS)
    if (status === 'stale' || status === 'expired') {
      staleItems.push({
        entity: 'price',
        id: p.ingredient_id,
        name: `Ingredient ${p.ingredient_id.slice(0, 8)}`,
        ageDays: age,
        status,
      })
    }
  }

  for (const c of clients) {
    const baseDate = c.updated_at || c.created_at
    const age = baseDate ? daysSince(baseDate) : -1
    const status = baseDate ? classifyFreshness(age, CLIENT_THRESHOLDS) : 'expired' as FreshnessStatus
    if (status === 'stale' || status === 'expired') {
      staleItems.push({
        entity: 'client',
        id: c.id,
        name: c.full_name,
        ageDays: age,
        status,
      })
    }
  }

  for (const r of recipes) {
    const age = r.updated_at ? daysSince(r.updated_at) : -1
    const status = r.updated_at
      ? classifyFreshness(age, RECIPE_THRESHOLDS)
      : 'expired' as FreshnessStatus
    if (status === 'stale' || status === 'expired') {
      staleItems.push({
        entity: 'recipe',
        id: r.id,
        name: r.name,
        ageDays: age,
        status,
      })
    }
  }

  // Sort by staleness (most stale first), cap at 50
  staleItems.sort((a, b) => b.ageDays - a.ageDays)
  const topStale = staleItems.slice(0, 50)

  // Overall score: % of all items that are fresh or aging
  const totalItems = priceRows.length + clients.length + recipes.length
  const freshOrAging =
    priceBuckets.fresh +
    priceBuckets.aging +
    clientBuckets.fresh +
    clientBuckets.aging +
    recipeBuckets.fresh +
    recipeBuckets.aging

  const overallScore = totalItems > 0 ? Math.round((freshOrAging / totalItems) * 100) : 100

  return {
    prices: { ...priceBuckets, total: priceRows.length },
    clients: { ...clientBuckets, total: clients.length },
    recipes: { ...recipeBuckets, total: recipes.length },
    overallScore,
    staleItems: topStale,
  }
}
