// API Ninjas — free sales tax API by ZIP code
// https://api-ninjas.com/api/salestax
// 100,000 requests/month free, no credit card

import { cacheGet, cacheSet } from '@/lib/cache/upstash'

const API_NINJAS_BASE = 'https://api.api-ninjas.com/v1'
const UPSTASH_TTL = 30 * 24 * 60 * 60 // 30 days — tax rates change rarely

// ─── In-Memory Cache ─────────────────────────────────────────────────────────
// Same zip = same rate. Tax rates change very rarely.
// Next.js fetch cache (7 days) handles cross-request caching.
// This Map handles within-process deduplication (multiple invoices, same zip, same request batch).

type CachedRate = { result: SalesTaxResult; expiresAt: number }
const rateCache = new Map<string, CachedRate>()
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours in-memory

export interface SalesTaxResult {
  zip_code: string
  federal_rate: number // Always 0 for US (no federal sales tax)
  state_rate: number
  county_rate: number
  city_rate: number
  combined_rate: number // Total effective rate
  state: string
}

export interface TaxCalculation {
  subtotalCents: number
  taxRate: number // Combined rate as decimal (e.g. 0.0825)
  taxAmountCents: number
  totalCents: number
  breakdown: {
    state: number
    county: number
    city: number
  }
}

function getApiKey(): string {
  const key = process.env.API_NINJAS_KEY
  if (!key) throw new Error('API_NINJAS_KEY not set in .env.local')
  return key
}

/**
 * Get sales tax rate for a US ZIP code.
 * Uses a three-layer cache: in-memory Map (24h) + Upstash Redis (30 days) + Next.js fetch cache (7 days).
 */
export async function getSalesTaxRate(zipCode: string): Promise<SalesTaxResult | null> {
  // Layer 1: in-memory cache
  const memCached = rateCache.get(zipCode)
  if (memCached && memCached.expiresAt > Date.now()) {
    return memCached.result
  }

  // Layer 2: Upstash Redis cache (30 days)
  const upstashKey = `tax:${zipCode}`
  try {
    const redisCached = await cacheGet<SalesTaxResult>(upstashKey)
    if (redisCached !== null) {
      // Backfill in-memory cache
      rateCache.set(zipCode, { result: redisCached, expiresAt: Date.now() + CACHE_TTL_MS })
      return redisCached
    }
  } catch {
    // Redis down — fall through to API
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5_000)

    // Layer 3: Next.js fetch cache (7 days) + external API
    const res = await fetch(`${API_NINJAS_BASE}/salestax?zip_code=${zipCode}`, {
      headers: { 'X-Api-Key': getApiKey() },
      next: { revalidate: 86400 * 7 },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))
    if (!res.ok) return null
    const data = await res.json()
    const result = Array.isArray(data) ? data[0] : data
    if (!result) return null

    const parsed: SalesTaxResult = {
      zip_code: result.zip_code ?? zipCode,
      federal_rate: parseFloat(result.federal_rate) || 0,
      state_rate: parseFloat(result.state_rate) || 0,
      county_rate: parseFloat(result.county_rate) || 0,
      city_rate: parseFloat(result.city_rate) || 0,
      combined_rate: parseFloat(result.combined_rate) || 0,
      state: result.state ?? '',
    }

    // Store in both caches
    rateCache.set(zipCode, { result: parsed, expiresAt: Date.now() + CACHE_TTL_MS })
    cacheSet(upstashKey, parsed, UPSTASH_TTL).catch(() => {})

    return parsed
  } catch {
    return null
  }
}

/**
 * Calculate tax on an amount (in cents) for a given ZIP code.
 * Returns the full breakdown — state, county, city.
 */
export async function calculateSalesTax(
  subtotalCents: number,
  zipCode: string
): Promise<TaxCalculation | null> {
  const rates = await getSalesTaxRate(zipCode)
  if (!rates) return null

  const taxRate = rates.combined_rate
  const taxAmountCents = Math.round(subtotalCents * taxRate)

  return {
    subtotalCents,
    taxRate,
    taxAmountCents,
    totalCents: subtotalCents + taxAmountCents,
    breakdown: {
      state: rates.state_rate,
      county: rates.county_rate,
      city: rates.city_rate,
    },
  }
}

/**
 * Format a tax rate as a percentage string.
 * e.g. 0.0825 → "8.25%"
 */
export function formatTaxRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}
