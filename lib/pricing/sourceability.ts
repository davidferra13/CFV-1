/**
 * Ingredient Sourceability Classification
 *
 * Determines if an ingredient is realistically obtainable using the signals
 * already present in the price catalog:
 *   - Number of stores carrying it (source breadth)
 *   - In-stock vs out-of-stock ratio
 *   - Recency of the most recent price observation (data freshness)
 *
 * Pure computation: no DB calls, no AI. Feed it existing CatalogDetailResult data.
 */

import type { CatalogDetailResult } from '@/lib/openclaw/catalog-types'

export type SourceabilityClass = 'readily_available' | 'limited_seasonal' | 'hard_to_source'

export interface SourceabilitySignal {
  storeCount: number
  inStockCount: number
  outOfStockCount: number
  daysSinceLastSeen: number | null
  inStockRatio: number // 0-1
}

export interface SourceabilityReport {
  classification: SourceabilityClass
  confidence: number // 0-1
  label: string // human-readable
  description: string // one-sentence explanation
  signals: SourceabilitySignal
}

// ---------------------------------------------------------------------------
// Signal extraction
// ---------------------------------------------------------------------------

function extractSignals(detail: CatalogDetailResult): SourceabilitySignal {
  const { summary, prices } = detail

  // Most recent price observation across all stores
  const mostRecentMs = prices.reduce((best, p) => {
    if (!p.lastConfirmedAt) return best
    const t = new Date(p.lastConfirmedAt).getTime()
    return isNaN(t) ? best : Math.max(best, t)
  }, 0)

  const daysSinceLastSeen =
    mostRecentMs > 0 ? Math.floor((Date.now() - mostRecentMs) / 86_400_000) : null

  return {
    storeCount: summary.storeCount,
    inStockCount: summary.inStockCount,
    outOfStockCount: summary.outOfStockCount,
    daysSinceLastSeen,
    inStockRatio: summary.storeCount > 0 ? summary.inStockCount / summary.storeCount : 0,
  }
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export function classifyFromCatalogDetail(detail: CatalogDetailResult): SourceabilityReport {
  const signals = extractSignals(detail)
  const { storeCount, inStockCount, inStockRatio, daysSinceLastSeen } = signals

  // --- No data at all ---
  if (storeCount === 0 || detail.prices.length === 0) {
    return {
      classification: 'hard_to_source',
      confidence: 0.1,
      label: 'Hard to Source',
      description: 'No current price data found. Specialty sourcing may be required.',
      signals,
    }
  }

  // --- Data too old to trust (> 90 days) ---
  if (daysSinceLastSeen !== null && daysSinceLastSeen > 90) {
    return {
      classification: 'hard_to_source',
      confidence: 0.15,
      label: 'Hard to Source',
      description: `Last seen ${daysSinceLastSeen} days ago across ${storeCount} ${storeCount === 1 ? 'store' : 'stores'}. Data is too stale to confirm availability.`,
      signals,
    }
  }

  // --- Readily available: multiple stores, in-stock, recent data ---
  const isRecent = daysSinceLastSeen === null || daysSinceLastSeen <= 30
  if (storeCount >= 3 && inStockCount >= 2 && isRecent) {
    const freshBonus = daysSinceLastSeen !== null && daysSinceLastSeen <= 7 ? 0.12 : 0
    const breadthBonus = Math.min(storeCount / 20, 0.15)
    const confidence = Math.min(0.95, 0.65 + freshBonus + breadthBonus + inStockRatio * 0.08)

    return {
      classification: 'readily_available',
      confidence,
      label: 'Readily Available',
      description: `Found at ${storeCount} stores, ${inStockCount} in stock${daysSinceLastSeen !== null ? `, last seen ${daysSinceLastSeen}d ago` : ''}.`,
      signals,
    }
  }

  // --- Limited / seasonal: some data but not strong coverage ---
  const recencyBonus = daysSinceLastSeen !== null && daysSinceLastSeen <= 30 ? 0.12 : 0
  const confidence = Math.min(
    0.65,
    0.28 + (storeCount / 10) * 0.25 + inStockRatio * 0.15 + recencyBonus
  )

  let description: string
  if (storeCount === 1) {
    description = `Found at 1 store${daysSinceLastSeen !== null ? `, ${daysSinceLastSeen}d ago` : ''}. Limited availability - may be seasonal or regional.`
  } else if (inStockRatio < 0.5) {
    description = `Found at ${storeCount} stores but only ${inStockCount} in stock. May be seasonal or in limited supply.`
  } else {
    description = `Found at ${storeCount} stores${daysSinceLastSeen !== null ? `, last seen ${daysSinceLastSeen}d ago` : ''}. Availability may vary by location or season.`
  }

  return {
    classification: 'limited_seasonal',
    confidence,
    label: 'Limited / Seasonal',
    description,
    signals,
  }
}

// ---------------------------------------------------------------------------
// Lightweight classification from CatalogItemV2 summary fields
// (used in table rows where full CatalogDetailResult is not loaded)
// ---------------------------------------------------------------------------

export function classifyFromItemData(
  storeCount: number,
  inStockCount: number,
  outOfStockCount: number,
  lastUpdated: string | null
): SourceabilityReport {
  const daysSinceLastSeen = lastUpdated
    ? Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 86_400_000)
    : null

  const signals: SourceabilitySignal = {
    storeCount,
    inStockCount,
    outOfStockCount,
    daysSinceLastSeen,
    inStockRatio: storeCount > 0 ? inStockCount / storeCount : 0,
  }

  // Synthesize a fake detail object and reuse the main classifier
  // by mirroring its logic directly (avoids importing CatalogDetailResult type)
  const { inStockRatio } = signals

  if (storeCount === 0) {
    return {
      classification: 'hard_to_source',
      confidence: 0.1,
      label: 'Hard to Source',
      description: 'No current price data found.',
      signals,
    }
  }

  if (daysSinceLastSeen !== null && daysSinceLastSeen > 90) {
    return {
      classification: 'hard_to_source',
      confidence: 0.15,
      label: 'Hard to Source',
      description: `Data is ${daysSinceLastSeen} days old. Availability unconfirmed.`,
      signals,
    }
  }

  const isRecent = daysSinceLastSeen === null || daysSinceLastSeen <= 30
  if (storeCount >= 3 && inStockCount >= 2 && isRecent) {
    const confidence = Math.min(0.95, 0.65 + Math.min(storeCount / 20, 0.15) + inStockRatio * 0.08)
    return {
      classification: 'readily_available',
      confidence,
      label: 'Readily Available',
      description: `Found at ${storeCount} stores, ${inStockCount} in stock.`,
      signals,
    }
  }

  const recencyBonus = isRecent ? 0.12 : 0
  const confidence = Math.min(
    0.65,
    0.28 + (storeCount / 10) * 0.25 + inStockRatio * 0.15 + recencyBonus
  )
  return {
    classification: 'limited_seasonal',
    confidence,
    label: 'Limited / Seasonal',
    description: `Found at ${storeCount} store${storeCount !== 1 ? 's' : ''}, availability may vary.`,
    signals,
  }
}

// ---------------------------------------------------------------------------
// Confidence label (for display)
// ---------------------------------------------------------------------------

export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High confidence'
  if (confidence >= 0.5) return 'Medium confidence'
  return 'Low confidence'
}

export function confidencePct(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}
