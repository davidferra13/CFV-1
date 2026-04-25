// Budget Parser
// Converts form budget labels and free-text budget strings into cents-per-person.
// Used by open booking to populate confirmed_budget_cents on inquiries
// and budget_cents_per_person on the open_bookings parent record.

/** Known budget labels from the booking form mapped to midpoint cents per person */
const BUDGET_LABEL_CENTS: Record<string, number> = {
  casual: 3500, // ~$35/person
  elevated: 7500, // ~$75/person
  'fine-dining': 15000, // ~$150/person
  luxury: 30000, // ~$300/person
}

function parseDollarAmount(value: string): number | null {
  const amount = parseInt(value.replace(/,/g, ''), 10)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

/**
 * Parse a budget_range value into cents per person.
 * Handles:
 *  - Known labels: "casual", "elevated", "fine-dining", "luxury"
 *  - Dollar ranges: "$50-75/person", "$100 per person", "$75"
 *  - Bare numbers: "75", "100"
 * Returns null for "not-sure", empty strings, or unparseable input.
 */
export function parseBudgetToCents(budgetRange: string | null | undefined): number | null {
  if (!budgetRange?.trim()) return null

  const normalized = budgetRange.trim().toLowerCase()

  // Skip "not sure" or similar
  if (normalized === 'not-sure' || normalized === 'not sure') return null

  // Check known labels first
  if (BUDGET_LABEL_CENTS[normalized] != null) {
    return BUDGET_LABEL_CENTS[normalized]
  }

  // Try to extract dollar amounts from free text
  // Patterns: "$50-75", "$100/person", "$75 per person", "50-75", "$100"
  const rangeMatch = normalized.match(/\$?\s*(\d[\d,]*)\s*[-\u2013]\s*\$?\s*(\d[\d,]*)/)
  if (rangeMatch) {
    const low = parseDollarAmount(rangeMatch[1])
    const high = parseDollarAmount(rangeMatch[2])
    if (low != null && high != null) {
      return Math.round(((low + high) / 2) * 100)
    }
  }

  // Single dollar amount: "$100", "$75/person", "100"
  const singleMatch = normalized.match(/\$?\s*(\d[\d,]*)/)
  if (singleMatch) {
    const amount = parseDollarAmount(singleMatch[1])
    if (amount != null && amount < 10000) {
      return amount * 100
    }
  }

  return null
}
