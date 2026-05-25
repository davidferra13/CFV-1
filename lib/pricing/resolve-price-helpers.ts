/**
 * Shared helpers for PIE price resolution.
 *
 * Extracted from resolve-price.ts to avoid circular imports between
 * resolve-price.ts and lib/pricing/tiers/*.ts.
 *
 * REFACTOR ONLY: zero behavioral changes. All logic copy-pasted from
 * the original resolve-price.ts.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// --- Types (re-exported from resolve-price.ts originals) ---

export type PriceSource =
  | 'chef_override'
  | 'pinned_price'
  | 'receipt'
  | 'api_quote'
  | 'wholesale'
  | 'direct_scrape'
  | 'flyer'
  | 'instacart'
  | 'regional_average'
  | 'resolved_national'
  | 'market_aggregate'
  | 'government'
  | 'historical'
  | 'category_baseline'
  | 'synthetic'
  | 'none'

export type PriceFreshness = 'current' | 'recent' | 'stale' | 'none'

export type ResolutionTier =
  | 'chef_override'
  | 'chef_receipt'
  | 'wholesale'
  | 'zip_local'
  | 'regional'
  | 'market_state'
  | 'market_national'
  | 'government'
  | 'historical'
  | 'category_baseline'
  | 'synthetic'
  | 'none'

export type CoverageLevel = 'direct' | 'regional' | 'estimated'

export interface ResolvedPrice {
  /** Price in cents. PIE Law 9: ALWAYS a number, never null. Synthetic floor guarantees this. */
  cents: number
  unit: string
  source: PriceSource
  sourceTier: string | null
  /**
   * Honest geographic/authority tier for this price. Added 2026-04-10 to
   * stop the pricing engine from silently reporting national medians as if
   * they were local. Always set by resolvePrice / resolvePricesBatch.
   */
  resolutionTier: ResolutionTier
  /** How geographically reliable this price is for the requesting chef. */
  coverageLevel: CoverageLevel
  store: string | null
  confidence: number
  /** Confidence adjusted for age. Decays over time. Use this for ranking. */
  effectiveConfidence: number
  freshness: PriceFreshness
  confirmedAt: string | null
  reason: string | null
}

export interface PriceRow {
  price_per_unit_cents: number | null
  unit: string | null
  store_name: string | null
  purchase_date: string
  source: string
}

export interface QuoteRow {
  ingredient_id: string
  best_cents: number | null
  source_label: string | null
  created_at: string
}

export interface AvgRow {
  avg_cents: number | null
  unit: string | null
  latest_date: string | null
}

// --- Unit Normalization (Weight -> oz, Volume -> fl oz, Count -> each) ---

const WEIGHT_UNITS = new Set([
  'oz',
  'ounce',
  'ounces',
  'lb',
  'lbs',
  'pound',
  'pounds',
  'g',
  'gram',
  'grams',
  'kg',
  'kilogram',
  'kilograms',
  'mg',
])
const VOLUME_UNITS = new Set([
  'tsp',
  'teaspoon',
  'tbsp',
  'tablespoon',
  'cup',
  'cups',
  'fl oz',
  'fl_oz',
  'floz',
  'pint',
  'pt',
  'quart',
  'qt',
  'gallon',
  'gal',
  'ml',
  'l',
  'liter',
  'liters',
  'dl',
])
const COUNT_UNITS = new Set([
  'each',
  'ea',
  'piece',
  'pieces',
  'unit',
  'whole',
  'bunch',
  'head',
  'can',
  'bag',
  'bottle',
  'jar',
  'package',
  'stick',
  'slice',
  'ct',
  'count',
  'pk',
  'pack',
  'box',
  'dozen',
  'doz',
])

const WEIGHT_TO_OZ: Record<string, number> = {
  oz: 1,
  ounce: 1,
  ounces: 1,
  lb: 16,
  lbs: 16,
  pound: 16,
  pounds: 16,
  g: 1 / 28.3495,
  gram: 1 / 28.3495,
  grams: 1 / 28.3495,
  kg: 35.274,
  kilogram: 35.274,
  kilograms: 35.274,
  mg: 1 / 28349.5,
}
const VOLUME_TO_FLOZ: Record<string, number> = {
  'fl oz': 1,
  fl_oz: 1,
  floz: 1,
  tsp: 1 / 6,
  teaspoon: 1 / 6,
  tbsp: 0.5,
  tablespoon: 0.5,
  cup: 8,
  cups: 8,
  pint: 16,
  pt: 16,
  quart: 32,
  qt: 32,
  gallon: 128,
  gal: 128,
  ml: 1 / 29.5735,
  l: 33.814,
  liter: 33.814,
  liters: 33.814,
  dl: 3.3814,
}
const COUNT_TO_EACH: Record<string, number> = {
  each: 1,
  ea: 1,
  piece: 1,
  pieces: 1,
  unit: 1,
  whole: 1,
  ct: 1,
  count: 1,
  pk: 1,
  pack: 1,
  box: 1,
  bag: 1,
  bottle: 1,
  jar: 1,
  can: 1,
  stick: 1,
  slice: 1,
  head: 1,
  bunch: 1,
  package: 1,
  dozen: 12,
  doz: 12,
}

interface NormalizedPrice {
  cents: number
  unit: string
}

/** Normalize any price+unit to standard base unit within its family.
 *  Weight -> oz, Volume -> fl oz, Count -> each.
 *  Returns null if unit is unrecognized. */
export function normalizeToStandardUnit(cents: number, rawUnit: string): NormalizedPrice | null {
  const u = rawUnit.trim().toLowerCase()
  const wFactor = WEIGHT_TO_OZ[u]
  if (wFactor !== undefined) return { cents: cents / wFactor, unit: 'oz' }
  const vFactor = VOLUME_TO_FLOZ[u]
  if (vFactor !== undefined) return { cents: cents / vFactor, unit: 'fl oz' }
  const cFactor = COUNT_TO_EACH[u]
  if (cFactor !== undefined) return { cents: cents / cFactor, unit: 'each' }
  return null
}

// --- Chef State Lookup (cached per request) ---

const stateCache = new Map<string, string | null>()

export async function getChefHomeState(tenantId: string): Promise<string | null> {
  if (stateCache.has(tenantId)) return stateCache.get(tenantId)!
  const rows = (await db.execute(
    sql`SELECT home_state FROM chefs WHERE id = ${tenantId} LIMIT 1`
  )) as unknown as { home_state: string | null }[]
  const state = rows[0]?.home_state || null
  stateCache.set(tenantId, state)
  return state
}

// --- Grocery Spend Tier (cached per request) ---

const SPEND_TIER_FACTORS: Record<string, number> = {
  budget: 0.8,
  mid: 1.0,
  premium: 1.3,
  luxury: 1.6,
}

const spendTierCache = new Map<string, number>()

export async function getSpendTierFactor(tenantId: string): Promise<number> {
  if (spendTierCache.has(tenantId)) return spendTierCache.get(tenantId)!
  try {
    const rows = (await db.execute(
      sql`SELECT grocery_spend_tier FROM chef_pricing_config WHERE chef_id = ${tenantId} LIMIT 1`
    )) as unknown as { grocery_spend_tier: string | null }[]
    const tier = rows[0]?.grocery_spend_tier || 'mid'
    const factor = SPEND_TIER_FACTORS[tier] || 1.0
    spendTierCache.set(tenantId, factor)
    return factor
  } catch {
    spendTierCache.set(tenantId, 1.0)
    return 1.0
  }
}

// --- Freshness ---

export function computeFreshness(dateStr: string | null): PriceFreshness {
  if (!dateStr) return 'none'
  const date = new Date(dateStr)
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff <= 3) return 'current'
  if (daysDiff <= 14) return 'recent'
  if (daysDiff <= 90) return 'stale'
  return 'none'
}

// --- Confidence Decay ---

/**
 * Step decay: confidence drops in tiers based on price age.
 * A 3-day-old receipt (base 1.0) stays at 1.0.
 * A 45-day-old Instacart price (base 0.6) drops to 0.3.
 * A 6-month-old government baseline (base 0.4) drops to 0.06.
 */
function decayConfidence(baseConfidence: number, dateStr: string | null): number {
  if (!dateStr) return baseConfidence * 0.15
  const ageDays = Math.floor(
    (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (ageDays <= 3) return baseConfidence
  if (ageDays <= 14) return baseConfidence * 0.9
  if (ageDays <= 30) return baseConfidence * 0.75
  if (ageDays <= 60) return baseConfidence * 0.5
  if (ageDays <= 90) return baseConfidence * 0.3
  return baseConfidence * 0.15
}

/** Derive coverageLevel from resolutionTier */
export function coverageLevelForTier(tier: ResolutionTier): CoverageLevel {
  switch (tier) {
    case 'chef_override':
    case 'chef_receipt':
    case 'wholesale':
    case 'zip_local':
      return 'direct'
    case 'regional':
    case 'market_state':
      return 'regional'
    case 'market_national':
    case 'government':
    case 'historical':
    case 'category_baseline':
    case 'synthetic':
    case 'none':
      return 'estimated'
  }
}

/** Add effectiveConfidence and coverageLevel to a resolved price */
export function withDecay(
  price: Omit<ResolvedPrice, 'effectiveConfidence' | 'coverageLevel'>
): ResolvedPrice {
  return {
    ...price,
    coverageLevel: coverageLevelForTier(price.resolutionTier),
    effectiveConfidence:
      Math.round(decayConfidence(price.confidence, price.confirmedAt) * 100) / 100,
  }
}

// --- Regional Price Parity (BLS/BEA state-level food-at-home index) ---

export const STATE_RPP: Record<string, number> = {
  AL: 88.2,
  AK: 108.5,
  AZ: 97.2,
  AR: 87.5,
  CA: 112.5,
  CO: 102.8,
  CT: 108.2,
  DE: 101.5,
  FL: 99.2,
  GA: 92.5,
  HI: 118.0,
  ID: 93.8,
  IL: 95.2,
  IN: 90.8,
  IA: 89.5,
  KS: 89.2,
  KY: 89.0,
  LA: 91.5,
  ME: 98.2,
  MD: 103.5,
  MA: 108.5,
  MI: 92.2,
  MN: 94.8,
  MS: 86.2,
  MO: 89.5,
  MT: 93.8,
  NE: 89.8,
  NV: 97.5,
  NH: 104.2,
  NJ: 112.8,
  NM: 93.2,
  NY: 108.2,
  NC: 92.8,
  ND: 90.2,
  OH: 90.5,
  OK: 89.2,
  OR: 100.8,
  PA: 95.5,
  RI: 101.5,
  SC: 91.2,
  SD: 89.5,
  TN: 91.8,
  TX: 93.5,
  UT: 96.8,
  VT: 102.5,
  VA: 96.8,
  WA: 104.5,
  WV: 88.5,
  WI: 93.8,
  WY: 93.2,
  DC: 115.8,
  PR: 92.0,
}

/**
 * Adjust a national-average price by the chef's state RPP factor.
 * Returns the adjusted cents value. If no state is provided, returns raw cents.
 */
export function applyRpp(cents: number, state: string | null): number {
  if (!state) return cents
  const factor = STATE_RPP[state.toUpperCase()]
  if (!factor) return cents
  return Math.round(cents * (factor / 100))
}

// --- Source display names ---

export function sourceDisplayStore(source: PriceSource, storeName: string | null): string {
  switch (source) {
    case 'chef_override':
      return 'Your price'
    case 'pinned_price':
      return storeName ? `Pinned (${storeName})` : 'Pinned price'
    case 'receipt':
      return storeName || 'Your receipt'
    case 'api_quote':
      return storeName || 'API quote'
    case 'wholesale':
      return storeName || 'Wholesale distributor'
    case 'direct_scrape':
      return storeName || 'Store website'
    case 'flyer':
      return storeName || 'Weekly circular'
    case 'instacart':
      return storeName ? `${storeName} (Instacart)` : 'Instacart'
    case 'regional_average':
      return storeName || 'Regional Average'
    case 'resolved_national':
      return storeName || 'National Price Index'
    case 'market_aggregate':
      return storeName || 'Market Average'
    case 'government':
      return 'USDA NE avg'
    case 'historical':
      return 'Your avg'
    case 'category_baseline':
      return storeName || 'Category estimate'
    case 'synthetic':
      return storeName || 'Synthetic estimate'
    case 'none':
      return ''
  }
}

/**
 * Pick the honest tier for a receipt-sourced price.
 */
export function tierForReceiptSource(
  source: string,
  storeName: string | null,
  preferredState: string | null
): ResolutionTier {
  if (
    source === 'manual' ||
    source === 'grocery_entry' ||
    source === 'po_receipt' ||
    source === 'vendor_invoice'
  ) {
    return 'chef_receipt'
  }
  if (source === 'openclaw_wholesale') return 'wholesale'
  if (
    preferredState &&
    storeName &&
    storeName.toLowerCase().includes(preferredState.toLowerCase())
  ) {
    return 'zip_local'
  }
  return 'regional'
}

// --- Synthetic price generation ---

import {
  inferSubcategory,
  SUBCATEGORY_FLOOR_CENTS,
  CATEGORY_FLOOR_CENTS,
  DEFAULT_FLOOR_CENTS,
} from './subcategory-floors'

/** Generate an inline synthetic price from subcategory floor + RPP + spend tier. Never returns null. */
export function generateInlineSynthetic(
  category: string | null,
  state: string | null,
  ingredientName?: string | null,
  spendTierFactor: number = 1.0
): { cents: number; reason: string } {
  const cat = category?.toLowerCase() || 'pantry'
  const subcat = ingredientName ? inferSubcategory(ingredientName, cat) : null
  const floor = subcat
    ? SUBCATEGORY_FLOOR_CENTS[subcat] || CATEGORY_FLOOR_CENTS[cat] || DEFAULT_FLOOR_CENTS
    : CATEGORY_FLOOR_CENTS[cat] || DEFAULT_FLOOR_CENTS
  const adjusted = Math.round(floor * spendTierFactor)
  const cents = applyRpp(adjusted, state)
  const label = subcat || cat
  const tierNote = spendTierFactor !== 1.0 ? `, spend tier ${spendTierFactor}x` : ''
  const reason = state
    ? `Synthetic estimate: ${label} floor ($${(floor / 100).toFixed(2)}${tierNote}), adjusted for ${state}`
    : `Synthetic estimate: ${label} floor ($${(floor / 100).toFixed(2)}${tierNote})`
  return { cents, reason }
}
