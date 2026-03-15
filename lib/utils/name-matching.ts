/**
 * Shared name matching utilities for cross-platform client deduplication.
 * Used by: platform-dedup.ts (inquiry matching), cross-platform-matching.ts (client matching)
 */

/**
 * Normalize a name for comparison: lowercase, collapse whitespace, strip accents.
 */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Case-insensitive name comparison with fuzzy matching.
 * Handles: extra spaces, different casing, accents, first/last swap,
 * and partial matches (one name is a subset of the other's parts).
 */
export function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)

  // Exact match after normalization
  if (na === nb) return true

  const partsA = na.split(' ').filter(Boolean)
  const partsB = nb.split(' ').filter(Boolean)

  // First/last name swap: "John Smith" vs "Smith John"
  if (
    partsA.length >= 2 &&
    partsB.length >= 2 &&
    partsA[0] === partsB[partsB.length - 1] &&
    partsA[partsA.length - 1] === partsB[0]
  ) {
    return true
  }

  // One name contains all parts of the other (handles middle names, titles, suffixes)
  // e.g., "Maria Garcia" matches "Maria Elena Garcia" or "Dr. Maria Garcia"
  if (partsA.length >= 2 && partsB.length >= 2) {
    const smaller = partsA.length <= partsB.length ? partsA : partsB
    const larger = partsA.length <= partsB.length ? partsB : partsA
    const allSmallerInLarger = smaller.every((part) => larger.includes(part))
    if (allSmallerInLarger) return true
  }

  return false
}

/**
 * Normalize a phone number for comparison: strip all non-digit characters.
 * Returns null if the result has fewer than 7 digits (not a valid phone).
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  // Need at least 7 digits for a valid phone comparison
  if (digits.length < 7) return null
  // Use last 10 digits for comparison (strips country code)
  return digits.length > 10 ? digits.slice(-10) : digits
}
