'use server'

/**
 * Ingredient Resolution Engine - 3-Tier Availability Model
 *
 * OpenClaw's mandate is continuous, high-fidelity market awareness.
 * Before any vendor contact is triggered, this engine exhausts every passive
 * and programmatic data channel to produce an availability answer.
 *
 * -----------------------------------------------------------------------
 * TIER 1 - RESOLVED (no call needed)
 *   openclaw.store_products has in_stock signal within 3 days.
 *   System returns confirmed availability with price and store.
 *   Vendor contact is not warranted.
 *
 * TIER 2 - PARTIAL (known supplier, stale or unconfirmed signal)
 *   Vendor identity is known AND at least one of:
 *   - openclaw.store_products last_seen within 4-30 days (stale but informative)
 *   - vendor_price_points recorded within 90 days (chef's own data)
 *   - ingredient_price_history with openclaw source within 60 days
 *   Returning the vendor with unknown stock is a valid resolution.
 *   Vendor contact is acceptable but not required.
 *
 * TIER 3 - UNRESOLVED (call warranted)
 *   Specialty vendor identity known but NO availability signal in any source.
 *   This is the only tier that surfaces the call interface.
 *   Every vendor in this tier represents the boundary of known data.
 *   Outbound calls are a precision fallback, not a routine convenience.
 * -----------------------------------------------------------------------
 *
 * Key rule: retail chain stores (grocery, big-box) appear in Tiers 1/2 only.
 * Specialty vendors (butcher, fishmonger, farm, specialty, cheese, organic)
 * appear in Tier 3 because they are not scraped by OpenClaw at volume.
 * Calling a Stop & Shop about haddock availability is not what this is for.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { pgClient } from '@/lib/db'
import type { VendorCallCandidate } from '@/lib/vendors/sourcing-actions'
import { getVendorCallQueue } from '@/lib/vendors/sourcing-actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResolvedStore = {
  storeName: string
  chainName: string
  city: string
  state: string
  productName: string
  priceCents: number
  salePriceCents?: number | null
  sizeValue?: number | null
  sizeUnit?: string | null
  inStock: boolean | null
  lastSeen: string
  freshness: 'current' | 'recent' | 'stale'
}

export type PartialSignal = {
  vendorName: string
  vendorType: string
  city?: string | null
  state?: string | null
  priceCents?: number | null
  priceUnit?: string | null
  dataAge: string
  source: 'openclaw_stale' | 'vendor_price_point' | 'price_history'
  vendorId?: string | null
  phone?: string | null
}

export type IngredientResolution = {
  ingredientName: string
  resolvedAt: string

  // Tier 1: data confirms availability right now
  resolved: ResolvedStore[]

  // Tier 2: vendor known, signal is stale or unconfirmed
  partial: PartialSignal[]

  // Tier 3: no data at all - only tier that goes to the call interface
  unresolved: VendorCallCandidate[]

  // Summary
  confidenceLevel: 'high' | 'medium' | 'low' | 'none'
  resolvedCount: number
  partialCount: number
  unresolvedCount: number
}

// ---------------------------------------------------------------------------
// Freshness helper
// ---------------------------------------------------------------------------

function computeFreshness(dateStr: string): 'current' | 'recent' | 'stale' {
  const ageMs = Date.now() - new Date(dateStr).getTime()
  const ageDays = ageMs / 86_400_000
  if (ageDays <= 3) return 'current'
  if (ageDays <= 14) return 'recent'
  return 'stale'
}

function ageLabel(dateStr: string): string {
  const ageMs = Date.now() - new Date(dateStr).getTime()
  const ageDays = Math.floor(ageMs / 86_400_000)
  if (ageDays === 0) return 'today'
  if (ageDays === 1) return '1 day ago'
  if (ageDays < 7) return `${ageDays} days ago`
  const weeks = Math.floor(ageDays / 7)
  if (weeks === 1) return '1 week ago'
  if (weeks < 5) return `${weeks} weeks ago`
  const months = Math.floor(ageDays / 30)
  return `${months} month${months !== 1 ? 's' : ''} ago`
}

// ---------------------------------------------------------------------------
// Specialty vendor types - only these go to Tier 3 (call interface)
// Retail chains are resolved through data, not outbound calls
// ---------------------------------------------------------------------------

const SPECIALTY_TYPES = new Set([
  'butcher',
  'fishmonger',
  'farm',
  'greengrocer',
  'produce',
  'specialty',
  'cheese',
  'organic',
  'dairy',
  'deli',
  'bakery',
])

// ---------------------------------------------------------------------------
// Main resolution function
// ---------------------------------------------------------------------------

export async function resolveIngredientAvailability(
  ingredientName: string
): Promise<IngredientResolution> {
  const user = await requireChef()
  const chefId = user.tenantId!
  const db: any = createServerClient()

  const resolvedAt = new Date().toISOString()
  const searchPattern = `%${ingredientName.toLowerCase()}%`

  // Get chef's state for geographic scoping
  const { data: chef } = await db.from('chefs').select('home_state').eq('id', chefId).single()
  const chefState = (chef?.home_state || 'MA').toUpperCase()

  // -------------------------------------------------------------------------
  // Run all data queries in parallel
  // -------------------------------------------------------------------------

  const [ocRows, vppRows, vendorCallQueue] = await Promise.all([
    // Query 1: openclaw.store_products - live market data
    queryOpenClawAvailability(ingredientName, searchPattern, chefState),

    // Query 2: vendor_price_points - chef's own vendor price signals
    queryVendorPricePoints(ingredientName, searchPattern, chefId, db),

    // Query 3: full vendor call queue (saved + national directory)
    getVendorCallQueue(ingredientName),
  ])

  // -------------------------------------------------------------------------
  // Classify openclaw results into Tier 1 (resolved) and Tier 2 (partial)
  // -------------------------------------------------------------------------

  const resolved: ResolvedStore[] = []
  const partial: PartialSignal[] = []
  const seenStores = new Set<string>()

  for (const row of ocRows) {
    const storeKey = `${row.chain_name}::${row.city}`.toLowerCase()
    if (seenStores.has(storeKey)) continue
    seenStores.add(storeKey)

    const freshness = computeFreshness(row.last_seen_at)

    if (freshness === 'current' && row.in_stock !== false) {
      // Tier 1: confirmed current
      resolved.push({
        storeName: row.store_name,
        chainName: row.chain_name,
        city: row.city,
        state: row.state,
        productName: row.product_name,
        priceCents: row.price_cents,
        salePriceCents: row.sale_price_cents,
        sizeValue: row.size_value,
        sizeUnit: row.size_unit,
        inStock: row.in_stock,
        lastSeen: row.last_seen_at,
        freshness: 'current',
      })
    } else if (freshness !== 'stale' || row.price_cents > 0) {
      // Tier 2: stale but informative
      partial.push({
        vendorName: `${row.chain_name} (${row.city})`,
        vendorType: 'grocery',
        city: row.city,
        state: row.state,
        priceCents: row.price_cents,
        dataAge: ageLabel(row.last_seen_at),
        source: 'openclaw_stale',
        phone: null,
        vendorId: null,
      })
    }
  }

  // -------------------------------------------------------------------------
  // Classify vendor_price_points into Tier 2
  // (chef confirmed this vendor carries the item)
  // -------------------------------------------------------------------------

  const seenVendors = new Set<string>()

  for (const row of vppRows) {
    const key = row.vendor_id
    if (seenVendors.has(key)) continue
    seenVendors.add(key)

    partial.push({
      vendorName: row.vendor_name,
      vendorType: row.vendor_type || 'specialty',
      priceCents: row.price_cents,
      priceUnit: row.unit,
      dataAge: ageLabel(row.recorded_at),
      source: 'vendor_price_point',
      vendorId: row.vendor_id,
      phone: row.phone,
    })
  }

  // -------------------------------------------------------------------------
  // Tier 3: specialty vendors with NO data signal at all
  // These are the only vendors that go to the call interface
  // -------------------------------------------------------------------------

  // Build sets of what we already know about
  const resolvedStoreKeys = new Set(resolved.map((r) => r.chainName.toLowerCase()))
  const partialVendorIds = new Set(partial.map((p) => p.vendorId).filter(Boolean))
  const partialVendorNames = new Set(partial.map((p) => p.vendorName.toLowerCase().split(' (')[0]))

  const unresolved: VendorCallCandidate[] = vendorCallQueue.filter((v) => {
    // Only specialty vendors go to the call interface
    if (!SPECIALTY_TYPES.has(v.vendor_type)) return false

    // Skip if we already have a data signal for this vendor
    if (partialVendorIds.has(v.id)) return false
    if (partialVendorNames.has(v.name.toLowerCase())) return false

    // Skip if chain name matches a resolved retail store
    if (resolvedStoreKeys.has(v.name.toLowerCase())) return false

    return true
  })

  // -------------------------------------------------------------------------
  // Confidence level
  // -------------------------------------------------------------------------

  let confidenceLevel: IngredientResolution['confidenceLevel'] = 'none'
  if (resolved.length >= 3) confidenceLevel = 'high'
  else if (resolved.length >= 1 || partial.length >= 3) confidenceLevel = 'medium'
  else if (partial.length >= 1) confidenceLevel = 'low'

  return {
    ingredientName,
    resolvedAt,
    resolved,
    partial,
    unresolved,
    confidenceLevel,
    resolvedCount: resolved.length,
    partialCount: partial.length,
    unresolvedCount: unresolved.length,
  }
}

// ---------------------------------------------------------------------------
// Query: openclaw.store_products
// Searches for products matching the ingredient name in the chef's state.
// Returns up to 60 most recent results across all matching stores.
// ---------------------------------------------------------------------------

async function queryOpenClawAvailability(
  ingredientName: string,
  searchPattern: string,
  state: string
): Promise<
  Array<{
    store_name: string
    chain_name: string
    city: string
    state: string
    product_name: string
    price_cents: number
    sale_price_cents: number | null
    size_value: number | null
    size_unit: string | null
    in_stock: boolean | null
    last_seen_at: string
    source: string
  }>
> {
  try {
    const rows = await pgClient`
      SELECT
        s.name         AS store_name,
        c.name         AS chain_name,
        s.city,
        s.state,
        p.name         AS product_name,
        sp.price_cents,
        sp.sale_price_cents,
        p.size_value,
        p.size_unit,
        sp.in_stock,
        sp.last_seen_at::text,
        sp.source
      FROM openclaw.products p
      JOIN openclaw.store_products sp ON sp.product_id = p.id
      JOIN openclaw.stores s          ON s.id = sp.store_id
      JOIN openclaw.chains c          ON c.id = s.chain_id
      WHERE s.state = ${state}
        AND s.is_active = true
        AND p.is_food = true
        AND (
          lower(p.name) LIKE ${searchPattern}
          OR to_tsvector('english', p.name) @@ plainto_tsquery('english', ${ingredientName})
        )
        AND sp.last_seen_at > NOW() - INTERVAL '30 days'
        AND sp.price_cents > 0
      ORDER BY sp.last_seen_at DESC
      LIMIT 60
    `
    return rows as any[]
  } catch {
    // openclaw tables may not be seeded in dev - fail gracefully
    return []
  }
}

// ---------------------------------------------------------------------------
// Query: vendor_price_points
// Chef's own recorded signals for this ingredient from their vendors.
// ---------------------------------------------------------------------------

async function queryVendorPricePoints(
  ingredientName: string,
  searchPattern: string,
  chefId: string,
  db: any
): Promise<
  Array<{
    vendor_id: string
    vendor_name: string
    vendor_type: string
    phone: string | null
    price_cents: number
    unit: string
    recorded_at: string
  }>
> {
  try {
    const { data } = await db
      .from('vendor_price_points')
      .select(
        `
        vendor_id,
        price_cents,
        unit,
        recorded_at,
        vendors!inner(id, name, vendor_type, phone)
      `
      )
      .eq('chef_id', chefId)
      .ilike('item_name', searchPattern)
      .gte('recorded_at', new Date(Date.now() - 90 * 86_400_000).toISOString().split('T')[0])
      .order('recorded_at', { ascending: false })
      .limit(20)

    return (data || []).map((row: any) => ({
      vendor_id: row.vendor_id,
      vendor_name: row.vendors?.name || 'Unknown vendor',
      vendor_type: row.vendors?.vendor_type || 'specialty',
      phone: row.vendors?.phone || null,
      price_cents: row.price_cents,
      unit: row.unit,
      recorded_at: row.recorded_at,
    }))
  } catch {
    return []
  }
}
