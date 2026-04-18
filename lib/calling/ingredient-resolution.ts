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
 *   openclaw.store_products has price data within 7 days.
 *   NOTE: in_stock is not reliably populated by scrapers. Price presence
 *   within the recency window is used as the availability proxy.
 *   Vendor contact is not warranted.
 *
 * TIER 2 - PARTIAL (known supplier, stale or unconfirmed signal)
 *   At least one of:
 *   - openclaw.store_products price within 8-60 days (stale retail data)
 *   - vendor_price_points recorded within 90 days (chef's own data)
 *   - ai_calls result='yes' for this ingredient within 14 days (call feedback)
 *   Returning vendor with unknown stock is a valid resolution.
 *   Optional escalation path available if vendor has a phone number.
 *
 * TIER 3 - UNRESOLVED (call warranted)
 *   Specialty vendor identity known, NO signal in any source.
 *   Rule: saved vendors always reach Tier 3 regardless of type.
 *   National directory vendors: specialty types only (no retail chains).
 *   Every vendor here represents the boundary of known data.
 *   Outbound calls are a precision fallback, not routine convenience.
 * -----------------------------------------------------------------------
 *
 * Failure posture:
 * - openclaw query failure is surfaced explicitly (openclawAvailable: false)
 *   and is DISTINGUISHABLE from "no matching products exist"
 * - When all tiers return zero, the UI shows a web sourcing fallback
 * - Freshness thresholds are calibrated to weekly sync cadence (not ideal)
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
  // Flag state is local only until a persistence migration is added
  flaggedIncorrect?: boolean
}

export type PartialSignal = {
  vendorName: string
  vendorType: string
  city?: string | null
  state?: string | null
  priceCents?: number | null
  priceUnit?: string | null
  dataAge: string
  source: 'openclaw_stale' | 'vendor_price_point' | 'price_history' | 'ai_call'
  vendorId?: string | null
  phone?: string | null
  // Tier 2 escalation: has phone = can be called directly from partial panel
  canCall: boolean
}

export type DataSourceHealth = {
  openclawAvailable: boolean
  openclawLastSync?: string | null
  vendorDataAvailable: boolean
  vendorQueryFailed: boolean
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

  // System health: distinguishes "no data" from "query failed"
  health: DataSourceHealth

  // Summary
  confidenceLevel: 'high' | 'medium' | 'low' | 'none'
  resolvedCount: number
  partialCount: number
  unresolvedCount: number
}

// ---------------------------------------------------------------------------
// Freshness thresholds
// Calibrated to weekly OpenClaw sync cadence, not ideal daily cadence.
// "current" = within one full sync cycle (7 days)
// "recent"  = within two-four sync cycles (30 days)
// "stale"   = older than recent, included for context but not as confirmation
// ---------------------------------------------------------------------------

const FRESHNESS_CURRENT_DAYS = 7
const FRESHNESS_RECENT_DAYS = 30
const OPENCLAW_TIER1_CUTOFF_DAYS = 7 // resolve as Tier 1 if within this window
const OPENCLAW_TIER2_CUTOFF_DAYS = 60 // classify as Tier 2 if within this window
const VENDOR_PRICE_POINT_CUTOFF_DAYS = 90
const AI_CALL_FEEDBACK_CUTOFF_DAYS = 14

function computeFreshness(dateStr: string): 'current' | 'recent' | 'stale' {
  const ageDays = (Date.now() - new Date(dateStr).getTime()) / 86_400_000
  if (ageDays <= FRESHNESS_CURRENT_DAYS) return 'current'
  if (ageDays <= FRESHNESS_RECENT_DAYS) return 'recent'
  return 'stale'
}

function ageLabel(dateStr: string): string {
  const ageDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (ageDays === 0) return 'today'
  if (ageDays === 1) return '1 day ago'
  if (ageDays < 7) return `${ageDays} days ago`
  const weeks = Math.floor(ageDays / 7)
  if (weeks === 1) return '1 week ago'
  if (weeks < 5) return `${weeks} weeks ago`
  return `${Math.floor(ageDays / 30)} month${Math.floor(ageDays / 30) !== 1 ? 's' : ''} ago`
}

// ---------------------------------------------------------------------------
// Ingredient name normalization
// Handles common variations before building the search pattern:
// - Strip hyphens ("dry-aged" → "dry aged")
// - Collapse whitespace
// - Build multiple patterns for multi-word queries
// ---------------------------------------------------------------------------

function normalizeIngredientName(name: string): {
  normalized: string
  searchPattern: string
  ftsQuery: string
} {
  const normalized = name.trim().toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ')
  const searchPattern = `%${normalized}%`
  // For FTS: use the normalized form. For multi-word, this hits phrase proximity.
  const ftsQuery = normalized
  return { normalized, searchPattern, ftsQuery }
}

// ---------------------------------------------------------------------------
// Specialty vendor types that reach Tier 3 from the national directory.
// Saved vendors bypass this filter entirely (fix #8).
// Retail chains are resolved through data pipelines, not outbound calls.
// ---------------------------------------------------------------------------

const NATIONAL_DIRECTORY_CALLABLE_TYPES = new Set([
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
  const { normalized, searchPattern, ftsQuery } = normalizeIngredientName(ingredientName)

  // Get chef's state for geographic scoping
  const { data: chef } = await db.from('chefs').select('home_state').eq('id', chefId).single()
  const chefState = (chef?.home_state || 'MA').toUpperCase()

  // -------------------------------------------------------------------------
  // Run all data queries in parallel
  // -------------------------------------------------------------------------

  const [ocResult, vppResult, aiResult, vendorCallQueue, flagsResult] = await Promise.all([
    // Query 1: openclaw.store_products - live market data
    queryOpenClawAvailability(normalized, searchPattern, ftsQuery, chefState),

    // Query 2: vendor_price_points - chef's own vendor price signals
    queryVendorPricePoints(searchPattern, chefId, db),

    // Query 3: recent ai_calls with result='yes' - call feedback loop
    queryAiCallFeedback(searchPattern, chefId, db),

    // Query 4: full vendor call queue (saved + national directory)
    getVendorCallQueue(ingredientName),

    // Query 5: chef-flagged incorrect Tier 1 entries - exclude from resolved
    queryIngredientFlags(searchPattern, chefId, db),
  ])

  const { rows: ocRows, succeeded: openclawAvailable } = ocResult
  const vppRows = vppResult.rows
  const aiCallRows = aiResult.rows
  const flaggedVendorNames = flagsResult.flags
  const vendorQueryFailed = vppResult.failed || aiResult.failed || flagsResult.failed

  // -------------------------------------------------------------------------
  // Classify openclaw results into Tier 1 (resolved) and Tier 2 (partial)
  //
  // Fix #1: in_stock is not reliably populated by scrapers.
  // Price presence within TIER1 window = availability proxy.
  // We only treat in_stock === false as a negative confirmation.
  // -------------------------------------------------------------------------

  const resolved: ResolvedStore[] = []
  const partial: PartialSignal[] = []
  const seenStores = new Set<string>()

  for (const row of ocRows) {
    const storeKey = `${row.chain_name}::${row.city}`.toLowerCase()
    if (seenStores.has(storeKey)) continue
    seenStores.add(storeKey)

    const ageDays = (Date.now() - new Date(row.last_seen_at).getTime()) / 86_400_000
    const freshness = computeFreshness(row.last_seen_at)

    // Explicit out-of-stock signal: skip (negative confirmation)
    if (row.in_stock === false) continue

    if (ageDays <= OPENCLAW_TIER1_CUTOFF_DAYS) {
      // Skip if the chef flagged this chain as incorrect for this ingredient
      if (flaggedVendorNames.has(row.chain_name.toLowerCase())) continue

      // Tier 1: price present within sync window = available proxy
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
        freshness,
      })
    } else if (ageDays <= OPENCLAW_TIER2_CUTOFF_DAYS) {
      // Tier 2: stale retail signal - informational, no direct contact path
      partial.push({
        vendorName: `${row.chain_name} (${row.city})`,
        vendorType: 'grocery',
        city: row.city,
        state: row.state,
        priceCents: row.price_cents,
        dataAge: ageLabel(row.last_seen_at),
        source: 'openclaw_stale',
        phone: null, // openclaw.stores has no phone field (#9)
        vendorId: null,
        canCall: false, // retail chains: order online, not callable
      })
    }
  }

  // -------------------------------------------------------------------------
  // Classify vendor_price_points into Tier 2
  // -------------------------------------------------------------------------

  const seenVendors = new Set<string>()

  for (const row of vppRows) {
    if (seenVendors.has(row.vendor_id)) continue
    seenVendors.add(row.vendor_id)

    partial.push({
      vendorName: row.vendor_name,
      vendorType: row.vendor_type || 'specialty',
      priceCents: row.price_cents,
      priceUnit: row.unit,
      dataAge: ageLabel(row.recorded_at),
      source: 'vendor_price_point',
      vendorId: row.vendor_id,
      phone: row.phone,
      canCall: !!row.phone, // has phone = can escalate from Tier 2
    })
  }

  // -------------------------------------------------------------------------
  // Fix #3: ai_calls feedback loop
  // Recent successful calls for this ingredient graduate that vendor to Tier 2.
  // This means: call once, don't call again for 14 days.
  // -------------------------------------------------------------------------

  for (const row of aiCallRows) {
    const key = row.vendor_id || row.contact_phone
    if (!key || seenVendors.has(key)) continue
    seenVendors.add(key)

    partial.push({
      vendorName: row.contact_name || row.contact_phone || 'Unknown vendor',
      vendorType: 'specialty',
      dataAge: ageLabel(row.created_at),
      source: 'ai_call',
      vendorId: row.vendor_id,
      phone: row.contact_phone,
      priceCents: row.price_quoted ? parsePriceToCentsApprox(row.price_quoted) : null,
      canCall: !!row.contact_phone,
    })
  }

  // -------------------------------------------------------------------------
  // Tier 3: vendors with NO signal after full pipeline exhaustion
  //
  // Fix #8: saved vendors ALWAYS enter Tier 3 if no signal found.
  // National directory: specialty types only (no grocery/retail chains).
  // -------------------------------------------------------------------------

  const partialVendorIds = new Set(partial.map((p) => p.vendorId).filter(Boolean))
  const partialVendorNames = new Set(
    partial.map((p) => p.vendorName.toLowerCase().split(' (')[0].trim())
  )
  // Fix #9: phone-based dedup for ai_call partials where vendor_id is null.
  // National directory calls before a vendor is saved to vendors table produce
  // ai_call records with vendor_id=null. Without this set, those vendors would
  // still appear in Tier 3 on the next query because partialVendorIds misses them.
  const partialVendorPhones = new Set(
    partial.filter((p) => !p.vendorId && p.phone).map((p) => p.phone!)
  )

  const unresolved: VendorCallCandidate[] = vendorCallQueue.filter((v) => {
    // Saved vendors: always callable if no data signal (fix #8)
    const isSaved = v.source === 'saved'

    // National directory: only specialty types
    if (!isSaved && !NATIONAL_DIRECTORY_CALLABLE_TYPES.has(v.vendor_type)) return false

    // Skip if we already have a data signal
    if (partialVendorIds.has(v.id)) return false
    if (partialVendorNames.has(v.name.toLowerCase())) return false
    // Fix #9: phone-based dedup - don't re-call a vendor we already have a result for
    if (v.phone && partialVendorPhones.has(v.phone)) return false

    return true
  })

  // -------------------------------------------------------------------------
  // Confidence level
  // -------------------------------------------------------------------------

  let confidenceLevel: IngredientResolution['confidenceLevel'] = 'none'
  if (resolved.length >= 3) confidenceLevel = 'high'
  else if (resolved.length >= 1 || partial.length >= 3) confidenceLevel = 'medium'
  else if (partial.length >= 1) confidenceLevel = 'low'

  // -------------------------------------------------------------------------
  // Data source health (#4)
  // Distinguishes "no matching products" from "query failed"
  // -------------------------------------------------------------------------

  const health: DataSourceHealth = {
    openclawAvailable,
    vendorDataAvailable: vppRows.length > 0 || aiCallRows.length > 0,
    vendorQueryFailed,
  }

  return {
    ingredientName,
    resolvedAt,
    resolved,
    partial,
    unresolved,
    health,
    confidenceLevel,
    resolvedCount: resolved.length,
    partialCount: partial.length,
    unresolvedCount: unresolved.length,
  }
}

// ---------------------------------------------------------------------------
// Query: openclaw.store_products
// Returns { rows, succeeded } so callers can distinguish failure from empty.
// Fix #4: failure is surfaced explicitly.
// Fix #6: uses normalized name + stripped hyphens for better matching.
// ---------------------------------------------------------------------------

async function queryOpenClawAvailability(
  normalized: string,
  searchPattern: string,
  ftsQuery: string,
  state: string
): Promise<{
  rows: Array<{
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
  succeeded: boolean
}> {
  try {
    // Build an alternate pattern with hyphens restored for products that use them
    const hyphenPattern = `%${normalized.replace(/ /g, '-')}%`

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
          OR lower(p.name) LIKE ${hyphenPattern}
          OR to_tsvector('english', p.name) @@ plainto_tsquery('english', ${ftsQuery})
        )
        AND sp.last_seen_at > NOW() - INTERVAL '60 days'
        AND sp.price_cents > 0
        AND sp.in_stock IS DISTINCT FROM false
      ORDER BY sp.last_seen_at DESC
      LIMIT 80
    `
    return { rows: rows as any[], succeeded: true }
  } catch {
    // Distinguish failure from empty: return succeeded=false
    return { rows: [], succeeded: false }
  }
}

// ---------------------------------------------------------------------------
// Query: vendor_price_points
// ---------------------------------------------------------------------------

async function queryVendorPricePoints(
  searchPattern: string,
  chefId: string,
  db: any
): Promise<{
  rows: Array<{
    vendor_id: string
    vendor_name: string
    vendor_type: string
    phone: string | null
    price_cents: number
    unit: string
    recorded_at: string
  }>
  failed: boolean
}> {
  try {
    const cutoff = new Date(Date.now() - VENDOR_PRICE_POINT_CUTOFF_DAYS * 86_400_000)
      .toISOString()
      .split('T')[0]

    const { data } = await db
      .from('vendor_price_points')
      .select(
        `vendor_id, price_cents, unit, recorded_at, vendors!inner(id, name, vendor_type, phone)`
      )
      .eq('chef_id', chefId)
      .ilike('item_name', searchPattern)
      .gte('recorded_at', cutoff)
      .order('recorded_at', { ascending: false })
      .limit(20)

    // Deduplicate by vendor_id, preferring non-sentinel records.
    // Sentinel: price_cents=1 AND unit='confirmed' (written after a call that
    // confirmed availability but captured no price). Show as null price.
    const byVendor = new Map<string, any>()
    for (const row of data || []) {
      const isSentinel = row.price_cents === 1 && row.unit === 'confirmed'
      const existing = byVendor.get(row.vendor_id)
      // Prefer: real price over sentinel. If both are sentinels, keep most recent (first seen).
      if (
        !existing ||
        (existing.price_cents === 1 && existing.unit === 'confirmed' && !isSentinel)
      ) {
        byVendor.set(row.vendor_id, row)
      }
    }

    return {
      rows: Array.from(byVendor.values()).map((row: any) => ({
        vendor_id: row.vendor_id,
        vendor_name: row.vendors?.name || 'Unknown vendor',
        vendor_type: row.vendors?.vendor_type || 'specialty',
        phone: row.vendors?.phone || null,
        // Sentinel (price_cents=1, unit='confirmed'): availability confirmed, price unknown.
        // Do not display 1 cent as a real price.
        price_cents: row.price_cents === 1 && row.unit === 'confirmed' ? null : row.price_cents,
        unit: row.unit,
        recorded_at: row.recorded_at,
      })),
      failed: false,
    }
  } catch (err) {
    console.error('[calling/resolution] queryVendorPricePoints failed:', err)
    return { rows: [], failed: true }
  }
}

// ---------------------------------------------------------------------------
// Query: ai_calls feedback loop (#3)
// Recent calls where result='yes' for this ingredient.
// Prevents re-calling vendors that already confirmed availability.
// ---------------------------------------------------------------------------

async function queryAiCallFeedback(
  searchPattern: string,
  chefId: string,
  db: any
): Promise<{
  rows: Array<{
    vendor_id: string | null
    contact_name: string | null
    contact_phone: string | null
    price_quoted: string | null
    created_at: string
  }>
  failed: boolean
}> {
  try {
    const cutoff = new Date(Date.now() - AI_CALL_FEEDBACK_CUTOFF_DAYS * 86_400_000).toISOString()

    const { data } = await db
      .from('ai_calls')
      .select('vendor_id, contact_name, contact_phone, extracted_data, created_at')
      .eq('chef_id', chefId)
      .eq('result', 'yes')
      .ilike('subject', searchPattern)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(10)

    return {
      rows: (data || []).map((row: any) => ({
        vendor_id: row.vendor_id,
        contact_name: row.contact_name,
        contact_phone: row.contact_phone,
        price_quoted: row.extracted_data?.price_quoted || null,
        created_at: row.created_at,
      })),
      failed: false,
    }
  } catch (err) {
    console.error('[calling/resolution] queryAiCallFeedback failed:', err)
    return { rows: [], failed: true }
  }
}

// ---------------------------------------------------------------------------
// Query: ingredient_accuracy_flags
// Returns a Set of lowercase chain/vendor names the chef marked incorrect
// for this ingredient. Tier 1 entries with these names are demoted.
// ---------------------------------------------------------------------------

async function queryIngredientFlags(
  searchPattern: string,
  chefId: string,
  db: any
): Promise<{ flags: Set<string>; failed: boolean }> {
  try {
    const { data } = await db
      .from('ingredient_accuracy_flags')
      .select('vendor_name')
      .eq('chef_id', chefId)
      .ilike('ingredient_name', searchPattern)
      .eq('reviewed', false)

    return {
      flags: new Set(
        (data || [])
          .map((r: any) => (r.vendor_name as string | null)?.toLowerCase())
          .filter(Boolean)
      ),
      failed: false,
    }
  } catch (err) {
    console.error('[calling/resolution] queryIngredientFlags failed:', err)
    return { flags: new Set(), failed: true }
  }
}

// ---------------------------------------------------------------------------
// Approximate price parser for ai_call extracted_data price strings.
// e.g. "$8.50/lb" → 850, "12.99" → 1299
// Not precise enough for financial use - only for display in Tier 2.
// ---------------------------------------------------------------------------

function parsePriceToCentsApprox(priceStr: string): number | null {
  const match = priceStr.match(/[\d]+\.?[\d]*/)
  if (!match) return null
  const val = parseFloat(match[0])
  if (isNaN(val) || val <= 0 || val > 10000) return null
  return Math.round(val * 100)
}
