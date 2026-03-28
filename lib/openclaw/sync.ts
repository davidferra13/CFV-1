/**
 * OpenClaw Price Sync Service
 * Pulls price data from the Raspberry Pi's OpenClaw database
 * and updates ChefFlow's ingredient prices.
 *
 * Runs on-demand from the admin price catalog page or via cron.
 * Only updates ingredients that already exist in ChefFlow's database.
 */

'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { db } from '@/lib/db'
import { ingredients } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'

const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'

export interface OpenClawPrice {
  canonical_ingredient_id: string
  ingredient_name: string
  category: string
  source_name: string
  source_id: string
  price_cents: number
  price_unit: string
  pricing_tier: string
  confidence: string
  last_confirmed_at: string
}

export interface OpenClawStats {
  sources: number
  canonicalIngredients: number
  currentPrices: number
  priceChanges: number
  lastScrapeAt: string | null
  timestamp: string
}

export interface SyncResult {
  success: boolean
  error?: string
  matched: number
  updated: number
  skipped: number
  notFound: number
}

/**
 * Internal: fetch stats without auth check (for cron routes that already verified auth).
 */
export async function getOpenClawStatsInternal(): Promise<OpenClawStats | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${OPENCLAW_API}/api/stats`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Fetch current stats from the OpenClaw Pi.
 */
export async function getOpenClawStats(): Promise<OpenClawStats | null> {
  await requireAdmin()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${OPENCLAW_API}/api/stats`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Fetch all prices from OpenClaw, optionally filtered.
 */
export async function getOpenClawPrices(params?: {
  tier?: string
  ingredient?: string
  limit?: number
}): Promise<OpenClawPrice[]> {
  await requireAdmin()
  try {
    const searchParams = new URLSearchParams()
    if (params?.tier) searchParams.set('tier', params.tier)
    if (params?.ingredient) searchParams.set('ingredient', params.ingredient)
    if (params?.limit) searchParams.set('limit', String(params.limit))

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    const res = await fetch(`${OPENCLAW_API}/api/prices?${searchParams}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) return []
    const data = await res.json()
    return data.prices || []
  } catch {
    return []
  }
}

/**
 * Fetch price sources from OpenClaw.
 */
export async function getOpenClawSources(): Promise<any[]> {
  await requireAdmin()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${OPENCLAW_API}/api/sources`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) return []
    const data = await res.json()
    return data.sources || []
  } catch {
    return []
  }
}

/**
 * Fetch recent price changes from OpenClaw.
 */
export async function getOpenClawChanges(limit = 50): Promise<any[]> {
  await requireAdmin()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${OPENCLAW_API}/api/changes?limit=${limit}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) return []
    const data = await res.json()
    return data.changes || []
  } catch {
    return []
  }
}

/**
 * Sync prices from OpenClaw into ChefFlow's ingredients table.
 *
 * Strategy:
 *   1. Fetch all retail prices from OpenClaw
 *   2. For each OpenClaw ingredient, try to find a matching ChefFlow ingredient
 *   3. If found and price differs, update last_price_cents + last_price_date
 *   4. Only updates existing ingredients (never creates new ones)
 *
 * Matching logic: name-based fuzzy match using the canonical ingredient name.
 * OpenClaw ingredient IDs like "chicken-breast" match ChefFlow ingredients
 * by comparing against the ingredient name (case-insensitive, hyphen-to-space).
 */
/**
 * Internal price fetch (no auth check). Used by cron routes.
 */
async function fetchPricesInternal(params?: {
  tier?: string
  ingredient?: string
  limit?: number
}): Promise<OpenClawPrice[]> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.tier) searchParams.set('tier', params.tier)
    if (params?.ingredient) searchParams.set('ingredient', params.ingredient)
    if (params?.limit) searchParams.set('limit', String(params.limit))

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    const res = await fetch(`${OPENCLAW_API}/api/prices?${searchParams}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) return []
    const data = await res.json()
    return data.prices || []
  } catch {
    return []
  }
}

/**
 * Core sync logic shared between admin-triggered and cron-triggered syncs.
 */
async function syncCore(tier: string, dryRun: boolean): Promise<SyncResult> {
  try {
    const prices = await fetchPricesInternal({ tier, limit: 2000 })
    if (prices.length === 0) {
      return { success: true, matched: 0, updated: 0, skipped: 0, notFound: 0 }
    }

    const cfIngredients = await db
      .select({
        id: ingredients.id,
        name: ingredients.name,
        lastPriceCents: ingredients.lastPriceCents,
        priceUnit: ingredients.priceUnit,
        tenantId: ingredients.tenantId,
      })
      .from(ingredients)

    const cfLookup = new Map<string, (typeof cfIngredients)[0]>()
    for (const ing of cfIngredients) {
      if (!ing.name) continue
      const normalized = ing.name.toLowerCase().trim().replace(/\s+/g, '-')
      cfLookup.set(normalized, ing)
      const simple = normalized
        .replace(
          /-?(fresh|frozen|organic|conventional|large|medium|small|whole|boneless|skinless)$/g,
          ''
        )
        .replace(/-+$/, '')
      if (simple !== normalized) cfLookup.set(simple, ing)
    }

    let matched = 0
    let updated = 0
    let skipped = 0
    let notFound = 0

    const bestPrices = new Map<string, OpenClawPrice>()
    for (const price of prices) {
      const existing = bestPrices.get(price.canonical_ingredient_id)
      if (!existing || price.price_cents < existing.price_cents) {
        bestPrices.set(price.canonical_ingredient_id, price)
      }
    }

    for (const [ocIngId, price] of Array.from(bestPrices.entries())) {
      let cfIng = cfLookup.get(ocIngId)
      if (!cfIng && price.ingredient_name) {
        const altKey = price.ingredient_name.toLowerCase().trim().replace(/\s+/g, '-')
        cfIng = cfLookup.get(altKey)
      }

      if (!cfIng) {
        notFound++
        continue
      }

      matched++

      if (cfIng.lastPriceCents === price.price_cents) {
        skipped++
        continue
      }

      if (!dryRun) {
        await db
          .update(ingredients)
          .set({
            lastPriceCents: price.price_cents,
            lastPriceDate: new Date().toISOString().split('T')[0],
          })
          .where(eq(ingredients.id, cfIng.id))
        updated++
      } else {
        updated++
      }
    }

    if (updated > 0 && !dryRun) {
      revalidatePath('/recipes')
      revalidatePath('/events')
      revalidateTag('recipe-costs')
    }

    return { success: true, matched, updated, skipped, notFound }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: msg, matched: 0, updated: 0, skipped: 0, notFound: 0 }
  }
}

/**
 * Internal sync (no auth). Called by cron routes that already verified auth.
 */
export async function syncPricesToChefFlowInternal(options?: {
  tier?: string
  dryRun?: boolean
}): Promise<SyncResult> {
  return syncCore(options?.tier || 'retail', options?.dryRun ?? false)
}

export async function syncPricesToChefFlow(options?: {
  tier?: string
  dryRun?: boolean
}): Promise<SyncResult> {
  await requireAdmin()
  return syncCore(options?.tier || 'retail', options?.dryRun ?? false)
}
