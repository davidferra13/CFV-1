/**
 * OpenClaw Price Data Validation Gate
 *
 * Pure validation module for price data flowing from Pi into ChefFlow's
 * PostgreSQL database. Catches scraper errors, parsing bugs, and bad
 * ingredient matches before they reach production tables.
 *
 * NOT a 'use server' file. This is a pure utility with no side effects.
 */

// --- Types ---

export interface ValidationResult {
  valid: boolean
  reason?: string
}

// --- Price Validation ---

/**
 * Validates a single price value before insertion.
 *
 * Rejects:
 *  - Negative or zero prices
 *  - Prices >= $1000 (likely cent/dollar confusion)
 *  - Exactly 1 cent (common scraper placeholder for "price unavailable")
 */
export function validatePrice(
  priceCents: number | null | undefined,
  ingredientName: string
): ValidationResult {
  if (priceCents == null) {
    return { valid: false, reason: `Null price for "${ingredientName}"` }
  }

  if (!Number.isFinite(priceCents)) {
    return { valid: false, reason: `Non-finite price (${priceCents}) for "${ingredientName}"` }
  }

  if (priceCents <= 0) {
    return {
      valid: false,
      reason: `Price must be > 0, got ${priceCents} cents for "${ingredientName}"`,
    }
  }

  if (priceCents === 1) {
    return {
      valid: false,
      reason: `Price is exactly 1 cent for "${ingredientName}" (likely scraper placeholder)`,
    }
  }

  if (priceCents >= 50_000) {
    return {
      valid: false,
      reason: `Price ${priceCents} cents ($${(priceCents / 100).toFixed(2)}) exceeds $500 limit for "${ingredientName}" (likely normalization inflation)`,
    }
  }

  return { valid: true }
}

// --- Price Change Validation ---

/**
 * Validates a price change between two observations.
 *
 * Spike threshold is 200x (generous) because the same ingredient name can map
 * to very different products at the same store across runs (a single lemon vs
 * a bag of lemons). The $1000 absolute cap in validatePrice() is the real
 * safety net for scraper errors. The 0.1x crash threshold stays tight because
 * suspiciously low prices (likely scraper bugs) are more dangerous than high
 * ones (best-price selection picks the cheapest anyway).
 *
 * If the old price was 0 or null, any new price is accepted (first observation).
 */
export function validatePriceChange(
  oldPriceCents: number | null | undefined,
  newPriceCents: number,
  ingredientName: string
): ValidationResult {
  // First observation: any valid price is fine
  if (oldPriceCents == null || oldPriceCents <= 0) {
    return { valid: true }
  }

  // Skip ratio check when prices look like different unit sizes.
  // Old per-unit ($0.14/lemon) vs new per-lb ($5/lb) and vice versa are both valid.
  if (oldPriceCents < 150 && newPriceCents > 200) {
    return { valid: true }
  }
  if (oldPriceCents > 200 && newPriceCents < 150) {
    return { valid: true }
  }

  const ratio = newPriceCents / oldPriceCents

  if (ratio > 200) {
    return {
      valid: false,
      reason: `Price spike: ${oldPriceCents}c -> ${newPriceCents}c (${ratio.toFixed(1)}x) for "${ingredientName}" exceeds 200x threshold`,
    }
  }

  if (ratio < 0.1) {
    return {
      valid: false,
      reason: `Price crash: ${oldPriceCents}c -> ${newPriceCents}c (${ratio.toFixed(2)}x) for "${ingredientName}" below 0.1x threshold`,
    }
  }

  return { valid: true }
}

// --- Alias Match Validation ---

/**
 * Validates an ingredient alias match quality.
 *
 * Enforces minimum similarity thresholds per match method and rejects
 * matches where the name lengths differ by more than 5x (prevents
 * "a" matching "artichoke hearts organic").
 */
export function validateAliasMatch(
  similarity: number,
  rawName: string,
  matchedName: string,
  method: 'trigram' | 'semantic' | 'exact' = 'trigram'
): ValidationResult {
  // Length ratio check: prevents wildly different-length matches
  const rawLen = rawName.trim().length
  const matchLen = matchedName.trim().length

  if (rawLen === 0 || matchLen === 0) {
    return {
      valid: false,
      reason: `Empty name in alias match: raw="${rawName}", matched="${matchedName}"`,
    }
  }

  const lengthRatio = Math.max(rawLen, matchLen) / Math.min(rawLen, matchLen)
  if (lengthRatio > 5) {
    return {
      valid: false,
      reason: `Name length ratio ${lengthRatio.toFixed(1)}x exceeds 5x limit: "${rawName}" (${rawLen} chars) vs "${matchedName}" (${matchLen} chars)`,
    }
  }

  // Similarity threshold per method
  if (method === 'semantic' || method === 'exact') {
    if (similarity < 0.75) {
      return {
        valid: false,
        reason: `${method} similarity ${similarity.toFixed(2)} below 0.75 threshold: "${rawName}" -> "${matchedName}"`,
      }
    }
  } else {
    // trigram
    if (similarity < 0.5) {
      return {
        valid: false,
        reason: `Trigram similarity ${similarity.toFixed(2)} below 0.5 threshold: "${rawName}" -> "${matchedName}"`,
      }
    }
  }

  return { valid: true }
}

// --- Batch Summary ---

export interface ValidationSummary {
  accepted: number
  quarantined: number
  skipped: number
}

export function createSummary(): ValidationSummary {
  return { accepted: 0, quarantined: 0, skipped: 0 }
}

export function formatSummary(summary: ValidationSummary): string {
  const total = summary.accepted + summary.quarantined + summary.skipped
  return `${summary.accepted} accepted, ${summary.quarantined} quarantined, ${summary.skipped} skipped (${total} total)`
}
