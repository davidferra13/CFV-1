'use server'

// Grocery Price Quote — automated ingredient pricing via Spoonacular + Kroger + MealMe APIs.
// Queries all configured services concurrently for each ingredient and stores the results.
// Falls back to last_price_cents from the Recipe Book if all APIs return nothing.
//
// MealMe covers 1M+ stores including: Market Basket, Hannaford, Shaw's, Stop & Shop,
// Whole Foods, Walmart, and every other major NE chain. Requires MEALME_API_KEY.
// Contact mealme.ai sales to obtain a key.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { buildInstacartCartLink } from './instacart-actions'
import { lookupUsdaPrice } from './usda-prices'
import { getNeMultiplier } from './regional-multipliers'

// ─── Types ────────────────────────────────────────────────────────────────────

export type IngredientPriceResult = {
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: string
  category: string | null
  spoonacularCents: number | null // raw national API price
  krogerCents: number | null // raw national API price
  usdaCents: number | null // USDA NE average (already regional)
  mealMeCents: number | null
  averageCents: number | null // NE-adjusted average of all sources
  recipeBookCents: number | null
  hasNoApiData: boolean // true = fell back to Recipe Book or null
  isOptional: boolean
}

export type GroceryQuoteResult = {
  quoteId: string
  eventId: string
  items: IngredientPriceResult[]
  spoonacularTotalCents: number | null
  krogerTotalCents: number | null
  usdaTotalCents: number | null
  mealMeTotalCents: number | null
  mealMeConfigured: boolean
  averageTotalCents: number
  instacartLink: string | null
  createdAt: string
  ingredientCount: number
  budgetCeilingCents: number | null
  quotedPriceCents: number | null
  actualGroceryCostCents: number | null
  accuracyDeltaPct: number | null
  isFromCache: boolean
}

export type ManualGroceryDraftItemInput = {
  name: string
  quantity?: number | null
  unit?: string | null
  category?: string | null
}

export type ManualGroceryDraftPriceItem = {
  name: string
  quantity: number
  unit: string
  category: string | null
  spoonacularCents: number | null
  krogerCents: number | null
  usdaCents: number | null
  mealMeCents: number | null
  averageCents: number | null
  hasNoApiData: boolean
}

export type ManualGroceryDraftPriceResult = {
  items: ManualGroceryDraftPriceItem[]
  averageTotalCents: number
  pricedItemCount: number
  requestedItemCount: number
  mealMeConfigured: boolean
  createdAt: string
}

// ─── Internal: aggregate event ingredients ────────────────────────────────────

type RawIngredient = {
  ingredientId: string
  name: string
  quantity: number
  unit: string
  category: string | null
  lastPriceCents: number | null
  isOptional: boolean
}

async function getEventIngredients(eventId: string, tenantId: string): Promise<RawIngredient[]> {
  const supabase: any = createServerClient()

  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!menus || menus.length === 0) return []

  const { data: dishes } = await supabase
    .from('dishes')
    .select('id')
    .eq('menu_id', menus[0].id)
    .eq('tenant_id', tenantId)

  if (!dishes || dishes.length === 0) return []

  const { data: components } = await supabase
    .from('components')
    .select('recipe_id, scale_factor')
    .in(
      'dish_id',
      dishes.map((d: any) => d.id)
    )
    .eq('tenant_id', tenantId)
    .not('recipe_id', 'is', null)

  if (!components || components.length === 0) return []

  const recipeIds = [...new Set(components.map((c: any) => c.recipe_id!))]

  // Accumulate scale factors: if recipe appears in multiple components, sum them
  const recipeScales = new Map<string, number>()
  for (const comp of components) {
    if (!comp.recipe_id) continue
    recipeScales.set(
      comp.recipe_id,
      (recipeScales.get(comp.recipe_id) ?? 0) + Number(comp.scale_factor)
    )
  }

  const { data: recipeIngredients } = await supabase
    .from('recipe_ingredients')
    .select(
      `recipe_id, quantity, unit, is_optional, ingredient_id,
       ingredient:ingredients(id, name, category, is_staple, last_price_cents)`
    )
    .in('recipe_id', recipeIds)

  if (!recipeIngredients) return []

  // Aggregate by ingredient + unit (same ingredient used across multiple recipes → sum)
  const aggregated = new Map<string, RawIngredient>()

  for (const ri of recipeIngredients) {
    const ing = ri.ingredient as unknown as {
      id: string
      name: string
      category: string
      is_staple: boolean
      last_price_cents: number | null
    } | null

    if (!ing || ing.is_staple) continue
    if (ing.category === 'alcohol') continue

    const scaleFactor = recipeScales.get(ri.recipe_id) ?? 1
    const scaledQty = Number(ri.quantity) * scaleFactor
    const key = `${ing.id}::${ri.unit}`

    const existing = aggregated.get(key)
    if (existing) {
      existing.quantity += scaledQty
    } else {
      aggregated.set(key, {
        ingredientId: ing.id,
        name: ing.name,
        quantity: scaledQty,
        unit: ri.unit,
        category: ing.category ?? null,
        lastPriceCents: ing.last_price_cents,
        isOptional: ri.is_optional,
      })
    }
  }

  return [...aggregated.values()]
}

// ─── Spoonacular API ──────────────────────────────────────────────────────────
// Uses two endpoints:
//   1. /food/ingredients/search — find ingredient ID by name
//   2. /food/ingredients/{id}/information — get cost for specific quantity + unit
// Returns cents for the requested quantity (Spoonacular handles unit conversion).

async function getSpoonacularPrice(
  name: string,
  quantity: number,
  unit: string
): Promise<number | null> {
  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) return null

  try {
    const searchRes = await fetch(
      `https://api.spoonacular.com/food/ingredients/search?query=${encodeURIComponent(name)}&number=1&apiKey=${apiKey}`
    )
    if (!searchRes.ok) return null

    const searchData = await searchRes.json()
    const ingredientId = searchData.results?.[0]?.id
    if (!ingredientId) return null

    const infoRes = await fetch(
      `https://api.spoonacular.com/food/ingredients/${ingredientId}/information` +
        `?amount=${quantity}&unit=${encodeURIComponent(unit)}&apiKey=${apiKey}`
    )
    if (!infoRes.ok) return null

    const infoData = await infoRes.json()
    const cost = infoData.estimatedCost
    // Spoonacular returns { value: number, unit: "cents" }
    if (!cost || cost.unit !== 'cents') return null
    return Math.round(cost.value)
  } catch {
    return null
  }
}

// ─── Kroger API ───────────────────────────────────────────────────────────────
// Uses client_credentials OAuth flow (token cached in module scope for 30 min).
// Searches by ingredient name and returns the shelf price of the best match.
// Note: returns price per package, not scaled to recipe quantity — used as a
// reference data point for the average, not a quantity-adjusted total.

let krogerToken: { token: string; expiresAt: number } | null = null
const liveDraftPriceCache = new Map<
  string,
  {
    expiresAt: number
    item: ManualGroceryDraftPriceItem
  }
>()
const LIVE_DRAFT_CACHE_TTL_MS = 10 * 60 * 1000

async function getKrogerToken(): Promise<string | null> {
  const clientId = process.env.KROGER_CLIENT_ID
  const clientSecret = process.env.KROGER_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  if (krogerToken && krogerToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return krogerToken.token
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const res = await fetch('https://api.kroger.com/v1/connect/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials&scope=product.compact',
    })
    if (!res.ok) return null

    const data = await res.json()
    krogerToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
    return krogerToken.token
  } catch {
    return null
  }
}

async function getKrogerPrice(name: string): Promise<number | null> {
  const token = await getKrogerToken()
  if (!token) return null

  try {
    const res = await fetch(
      `https://api.kroger.com/v1/products?filter.term=${encodeURIComponent(name)}&filter.limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    )
    if (!res.ok) return null

    const data = await res.json()
    const item = data.data?.[0]?.items?.[0]
    if (!item) return null

    const price = item.price?.regular ?? item.price?.promo
    if (typeof price !== 'number') return null

    return Math.round(price * 100)
  } catch {
    return null
  }
}

// ─── MealMe API ───────────────────────────────────────────────────────────────
// Covers 1M+ stores: Market Basket, Hannaford, Shaw's, Stop & Shop, Whole Foods,
// Walmart, and every major NE chain. Returns real shelf prices by location.
//
// Flow:
//   1. Search stores near the chef's zip code to find the relevant store_id(s)
//   2. Search for the ingredient by name within those stores → get product + price
//
// Requires: MEALME_API_KEY (contact mealme.ai sales to obtain)
// Auth: Id-Token: mealme:{API_KEY}
// Docs: https://docs.mealme.ai

async function getMealMePrice(name: string, zipCode: string | null): Promise<number | null> {
  const apiKey = process.env.MEALME_API_KEY
  if (!apiKey) return null

  const headers = {
    'Id-Token': `mealme:${apiKey}`,
    Accept: 'application/json',
  }

  try {
    // Step 1: find a nearby grocery store
    const locationParam = zipCode ? `&user_zipcode=${encodeURIComponent(zipCode)}` : ''

    const storeRes = await fetch(
      `https://api.mealme.ai/search/store/v3?store_type=grocery&fetch_quotes=false${locationParam}&maximum_miles=15`,
      { headers }
    )
    if (!storeRes.ok) return null

    const storeData = await storeRes.json()
    // MealMe returns stores sorted by distance — take the first grocery result
    const store = (storeData.stores ?? storeData.data ?? [])[0]
    if (!store?.store_id) return null

    // Step 2: search for the ingredient at that store
    const itemRes = await fetch(
      `https://api.mealme.ai/search/item/v3?store_id=${encodeURIComponent(store.store_id)}&q=${encodeURIComponent(name)}&limit=1`,
      { headers }
    )
    if (!itemRes.ok) return null

    const itemData = await itemRes.json()
    const item = (itemData.products ?? itemData.items ?? itemData.data ?? [])[0]
    if (!item) return null

    // MealMe returns price in cents
    const price = item.price ?? item.unit_price ?? item.formatted_price
    if (typeof price === 'number') return price
    // Some responses return formatted string like "$5.20"
    if (typeof price === 'string') {
      const parsed = parseFloat(price.replace(/[^0-9.]/g, ''))
      if (!isNaN(parsed)) return Math.round(parsed * 100)
    }

    return null
  } catch {
    return null
  }
}

function getLiveDraftCacheKey(item: {
  name: string
  quantity: number
  unit: string
  category: string | null
}, zipCode: string | null): string {
  return [
    zipCode ?? '',
    item.name.trim().toLowerCase(),
    item.quantity.toFixed(4),
    item.unit.trim().toLowerCase(),
    (item.category ?? '').toLowerCase(),
  ].join('|')
}

function trimLiveDraftCache(nowMs: number) {
  if (liveDraftPriceCache.size < 500) return
  for (const [key, value] of liveDraftPriceCache.entries()) {
    if (value.expiresAt <= nowMs) {
      liveDraftPriceCache.delete(key)
    }
  }
}

// ─── USDA unit family matching ────────────────────────────────────────────────
// USDA prices are per a specific unit (lb, pint, bunch, etc.). We only scale by
// recipe quantity when the recipe unit belongs to the same unit family, avoiding
// nonsensical multiplication (e.g. 499 cents/pint × 2 cups = $9.98 instead of ~$4.99).

const USDA_UNIT_FAMILIES: string[][] = [
  ['lb', 'lbs', 'pound', 'pounds'],
  ['oz', 'ounce', 'ounces'],
  ['pint', 'pt'],
  ['each', 'whole', 'piece', 'head', 'clove', 'item'],
  ['bunch', 'bunches'],
  ['qt', 'quart', 'quarts'],
  ['dozen', 'doz'],
]

function usdaUnitMatches(usdaUnit: string, recipeUnit: string): boolean {
  const norm = (s: string) => s.toLowerCase().trim()
  const u1 = norm(usdaUnit)
  const u2 = norm(recipeUnit)
  if (u1 === u2) return true
  return USDA_UNIT_FAMILIES.some((fam) => fam.includes(u1) && fam.includes(u2))
}

// ─── Main: run a quote ────────────────────────────────────────────────────────

export async function runGroceryPriceQuote(eventId: string): Promise<GroceryQuoteResult | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Return cached quote if < 24 hours old
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: cached } = await supabase
    .from('grocery_price_quotes')
    .select('*, grocery_price_quote_items(*)')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'complete')
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (cached) {
    return buildResultFromRow(cached, eventId, supabase, user.tenantId!, true)
  }

  const ingredients = await getEventIngredients(eventId, user.tenantId!)
  if (ingredients.length === 0) return null

  // Fetch chef's zip code for MealMe location-based pricing
  const { data: prefs } = await supabase
    .from('chef_preferences')
    .select('zip_code, city, state')
    .eq('tenant_id', user.tenantId!)
    .single()

  const chefZip: string | null = (prefs as any)?.zip_code ?? (prefs as any)?.zipcode ?? null

  const mealMeConfigured = !!process.env.MEALME_API_KEY

  // Create pending quote record
  const { data: quote, error: quoteErr } = await supabase
    .from('grocery_price_quotes')
    .insert({
      tenant_id: user.tenantId!,
      event_id: eventId,
      ingredient_count: ingredients.length,
      status: 'pending',
    })
    .select()
    .single()

  if (quoteErr || !quote) return null

  // Query all ingredients concurrently
  const results: IngredientPriceResult[] = await Promise.all(
    ingredients.map(async (ing) => {
      const [spoonacularCents, krogerCents, mealMeCents] = await Promise.all([
        getSpoonacularPrice(ing.name, ing.quantity, ing.unit),
        getKrogerPrice(ing.name),
        getMealMePrice(ing.name, chefZip),
      ])

      // USDA NE lookup — free, no API call, already Northeast-regional.
      // Only applied when the recipe unit matches the USDA unit family to avoid
      // nonsensical math (e.g. USDA price/pint × recipe quantity in cups).
      const usdaEntry = lookupUsdaPrice(ing.name)
      const usdaCents =
        usdaEntry && usdaUnitMatches(usdaEntry.unit, ing.unit)
          ? Math.round(usdaEntry.cents * ing.quantity)
          : null

      // Apply NE multiplier to national API prices before averaging
      const multiplier = getNeMultiplier(ing.category)
      const adjSpoonacular = spoonacularCents ? Math.round(spoonacularCents * multiplier) : null
      const adjKroger = krogerCents ? Math.round(krogerCents * multiplier) : null

      // Average all NE-calibrated sources (USDA is already NE — no multiplier)
      const apiPrices = [adjSpoonacular, adjKroger, usdaCents, mealMeCents].filter(
        (p): p is number => p !== null
      )

      const hasNoApiData = apiPrices.length === 0

      let averageCents: number | null = null
      if (apiPrices.length > 0) {
        averageCents = Math.round(apiPrices.reduce((sum, p) => sum + p, 0) / apiPrices.length)
      } else if (ing.lastPriceCents !== null) {
        // Fall back to recipe book price × quantity
        averageCents = Math.round(ing.lastPriceCents * ing.quantity)
      }

      return {
        ingredientId: ing.ingredientId,
        ingredientName: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        category: ing.category,
        spoonacularCents,
        krogerCents,
        usdaCents,
        mealMeCents,
        averageCents,
        recipeBookCents:
          ing.lastPriceCents !== null ? Math.round(ing.lastPriceCents * ing.quantity) : null,
        hasNoApiData,
        isOptional: ing.isOptional,
      }
    })
  )

  // Persist line items
  await supabase.from('grocery_price_quote_items').insert(
    results.map((r) => ({
      quote_id: quote.id,
      ingredient_id: r.ingredientId,
      ingredient_name: r.ingredientName,
      quantity: r.quantity,
      unit: r.unit,
      spoonacular_price_cents: r.spoonacularCents,
      kroger_price_cents: r.krogerCents,
      mealme_price_cents: r.mealMeCents,
      average_price_cents: r.averageCents,
    }))
  )

  // Compute totals
  const spoonacularTotal = sumNullable(results.map((r) => r.spoonacularCents))
  const krogerTotal = sumNullable(results.map((r) => r.krogerCents))
  const usdaTotal = sumNullable(results.map((r) => r.usdaCents))
  const mealMeTotal = sumNullable(results.map((r) => r.mealMeCents))
  const averageTotal = results.reduce((sum, r) => sum + (r.averageCents ?? 0), 0)

  // Build Instacart cart link
  const instacartLink = await buildInstacartCartLink(
    results.map((r) => ({ name: r.ingredientName, quantity: r.quantity, unit: r.unit }))
  )

  // Update quote to complete
  await supabase
    .from('grocery_price_quotes')
    .update({
      spoonacular_total_cents: spoonacularTotal,
      kroger_total_cents: krogerTotal,
      mealme_total_cents: mealMeTotal,
      average_total_cents: averageTotal,
      instacart_link: instacartLink,
      status: 'complete',
    })
    .eq('id', quote.id)

  // Persist estimated food cost to the event for Profit Summary integration (non-blocking)
  try {
    await supabase
      .from('events')
      .update({ estimated_food_cost_cents: averageTotal } as any)
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
  } catch (err) {
    console.error('[GroceryQuote] Failed to persist estimate to event:', err)
  }

  const { budgetCeilingCents, quotedPriceCents } = await getEventBudgetContext(
    eventId,
    user.tenantId!,
    supabase
  )

  return {
    quoteId: quote.id,
    eventId,
    items: results,
    spoonacularTotalCents: spoonacularTotal,
    krogerTotalCents: krogerTotal,
    usdaTotalCents: usdaTotal,
    mealMeTotalCents: mealMeTotal,
    mealMeConfigured,
    averageTotalCents: averageTotal,
    instacartLink,
    createdAt: quote.created_at,
    ingredientCount: ingredients.length,
    budgetCeilingCents,
    quotedPriceCents,
    actualGroceryCostCents: null,
    accuracyDeltaPct: null,
    isFromCache: false,
  }
}

export async function previewManualGroceryPricing(
  items: ManualGroceryDraftItemInput[]
): Promise<ManualGroceryDraftPriceResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const normalizedItems = items
    .map((item) => ({
      name: String(item.name ?? '').trim(),
      quantity:
        typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0
          ? item.quantity
          : 1,
      unit: String(item.unit ?? 'each').trim() || 'each',
      category: typeof item.category === 'string' && item.category.trim() ? item.category : null,
    }))
    .filter((item) => item.name.length > 0)
    .slice(0, 40)

  if (normalizedItems.length === 0) {
    return {
      items: [],
      averageTotalCents: 0,
      pricedItemCount: 0,
      requestedItemCount: 0,
      mealMeConfigured: !!process.env.MEALME_API_KEY,
      createdAt: new Date().toISOString(),
    }
  }

  const { data: prefs } = await supabase
    .from('chef_preferences')
    .select('zip_code')
    .eq('tenant_id', user.tenantId!)
    .single()

  const chefZip: string | null = (prefs as any)?.zip_code ?? null
  const mealMeConfigured = !!process.env.MEALME_API_KEY
  const nowMs = Date.now()
  trimLiveDraftCache(nowMs)

  const pricedItems = await Promise.all(
    normalizedItems.map(async (item): Promise<ManualGroceryDraftPriceItem> => {
      const cacheKey = getLiveDraftCacheKey(item, chefZip)
      const cached = liveDraftPriceCache.get(cacheKey)
      if (cached && cached.expiresAt > nowMs) {
        return cached.item
      }

      const [spoonacularCents, krogerCents, mealMeCents] = await Promise.all([
        getSpoonacularPrice(item.name, item.quantity, item.unit),
        getKrogerPrice(item.name),
        getMealMePrice(item.name, chefZip),
      ])

      const usdaEntry = lookupUsdaPrice(item.name)
      const usdaCents =
        usdaEntry && usdaUnitMatches(usdaEntry.unit, item.unit)
          ? Math.round(usdaEntry.cents * item.quantity)
          : null

      const multiplier = getNeMultiplier(item.category)
      const adjSpoonacular = spoonacularCents ? Math.round(spoonacularCents * multiplier) : null
      const adjKroger = krogerCents ? Math.round(krogerCents * multiplier) : null
      const apiPrices = [adjSpoonacular, adjKroger, usdaCents, mealMeCents].filter(
        (price): price is number => price !== null
      )

      const hasNoApiData = apiPrices.length === 0
      const averageCents =
        apiPrices.length > 0
          ? Math.round(apiPrices.reduce((sum, price) => sum + price, 0) / apiPrices.length)
          : null

      const pricedItem: ManualGroceryDraftPriceItem = {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        spoonacularCents,
        krogerCents,
        usdaCents,
        mealMeCents,
        averageCents,
        hasNoApiData,
      }

      liveDraftPriceCache.set(cacheKey, {
        expiresAt: nowMs + LIVE_DRAFT_CACHE_TTL_MS,
        item: pricedItem,
      })

      return pricedItem
    })
  )

  const averageTotalCents = pricedItems.reduce((sum, item) => sum + (item.averageCents ?? 0), 0)
  const pricedItemCount = pricedItems.filter((item) => item.averageCents !== null).length

  return {
    items: pricedItems,
    averageTotalCents,
    pricedItemCount,
    requestedItemCount: normalizedItems.length,
    mealMeConfigured,
    createdAt: new Date().toISOString(),
  }
}

// ─── Get latest saved quote ───────────────────────────────────────────────────

export async function getLatestGroceryQuote(eventId: string): Promise<GroceryQuoteResult | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('grocery_price_quotes')
    .select('*, grocery_price_quote_items(*)')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null
  return buildResultFromRow(data, eventId, supabase, user.tenantId!, true)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sumNullable(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) : null
}

async function getEventBudgetContext(
  eventId: string,
  tenantId: string,
  supabase: any
): Promise<{ budgetCeilingCents: number | null; quotedPriceCents: number | null }> {
  const [{ data: event }, { data: prefs }] = await Promise.all([
    supabase.from('events').select('quoted_price_cents').eq('id', eventId).single(),
    supabase
      .from('chef_preferences')
      .select('target_margin_percent')
      .eq('tenant_id', tenantId)
      .single(),
  ])

  const quotedPriceCents = event?.quoted_price_cents ?? null
  let budgetCeilingCents: number | null = null
  if (quotedPriceCents && prefs?.target_margin_percent) {
    budgetCeilingCents = Math.round(
      quotedPriceCents * (1 - Number(prefs.target_margin_percent) / 100)
    )
  }

  return { budgetCeilingCents, quotedPriceCents }
}

// ─── Log actual grocery cost (post-event) ────────────────────────────────────
// Called from the close-out wizard after the chef enters what they actually spent.
// Computes accuracy_delta_pct vs the stored estimate so the system can self-calibrate.

export async function logActualGroceryCost(
  eventId: string,
  actualCostCents: number
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Find the most recent complete quote for this event
  const { data: quote } = await supabase
    .from('grocery_price_quotes')
    .select('id, average_total_cents')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!quote) return

  const accuracyDeltaPct =
    quote.average_total_cents && quote.average_total_cents > 0
      ? parseFloat(
          (
            ((actualCostCents - quote.average_total_cents) / quote.average_total_cents) *
            100
          ).toFixed(2)
        )
      : null

  await (supabase.from('grocery_price_quotes') as any)
    .update({
      actual_grocery_cost_cents: actualCostCents,
      accuracy_delta_pct: accuracyDeltaPct,
      actual_cost_logged_at: new Date().toISOString(),
    })
    .eq('id', quote.id)
}

async function buildResultFromRow(
  row: any,
  eventId: string,
  supabase: any,
  tenantId: string,
  isFromCache: boolean
): Promise<GroceryQuoteResult> {
  const items: IngredientPriceResult[] = (row.grocery_price_quote_items ?? []).map((item: any) => ({
    ingredientId: item.ingredient_id ?? '',
    ingredientName: item.ingredient_name,
    quantity: Number(item.quantity),
    unit: item.unit ?? '',
    category: null, // not stored per-item in DB — null for cached results
    spoonacularCents: item.spoonacular_price_cents,
    krogerCents: item.kroger_price_cents,
    usdaCents: null, // not stored per-item in DB — null for cached results
    mealMeCents: item.mealme_price_cents ?? null,
    averageCents: item.average_price_cents,
    recipeBookCents: null,
    hasNoApiData:
      item.spoonacular_price_cents == null &&
      item.kroger_price_cents == null &&
      item.mealme_price_cents == null,
    isOptional: false,
  }))

  const { budgetCeilingCents, quotedPriceCents } = await getEventBudgetContext(
    eventId,
    tenantId,
    supabase
  )

  return {
    quoteId: row.id,
    eventId,
    items,
    spoonacularTotalCents: row.spoonacular_total_cents,
    krogerTotalCents: row.kroger_total_cents,
    usdaTotalCents: null, // not stored in DB — null for cached results
    mealMeTotalCents: row.mealme_total_cents ?? null,
    mealMeConfigured: !!process.env.MEALME_API_KEY,
    averageTotalCents: row.average_total_cents ?? 0,
    instacartLink: row.instacart_link,
    createdAt: row.created_at,
    ingredientCount: row.ingredient_count ?? items.length,
    budgetCeilingCents,
    quotedPriceCents,
    actualGroceryCostCents: row.actual_grocery_cost_cents ?? null,
    // Supabase returns DECIMAL columns as strings — parse to number before use in the UI
    accuracyDeltaPct: row.accuracy_delta_pct != null ? Number(row.accuracy_delta_pct) : null,
    isFromCache,
  }
}
