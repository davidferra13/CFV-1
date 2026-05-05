/**
 * Phone number normalization, formatting, and comparison utilities.
 * Uses libphonenumber-js for robust international phone parsing.
 * Default country: US.
 */

import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

export interface NormalizedPhone {
  e164: string
  display: string
  canText: boolean
}

/**
 * Normalize a raw phone string to E.164 format with display and SMS capability.
 * Returns null for invalid or unparseable numbers.
 */
export function normalizePhone(
  raw: string,
  defaultCountry: CountryCode = 'US'
): NormalizedPhone | null {
  if (!raw || !raw.trim()) return null

  const parsed = parsePhoneNumberFromString(raw.trim(), defaultCountry)
  if (!parsed || !parsed.isValid()) return null

  const phoneType = parsed.getType()

  // Mobile and VOIP can receive texts; fixed lines generally cannot
  const textCapableTypes = new Set(['MOBILE', 'FIXED_LINE_OR_MOBILE', 'VOIP', 'PERSONAL_NUMBER'])
  const noTextTypes = new Set(['FIXED_LINE', 'TOLL_FREE', 'PREMIUM_RATE', 'SHARED_COST'])

  let canText = true
  if (phoneType && noTextTypes.has(phoneType)) {
    canText = false
  } else if (phoneType && textCapableTypes.has(phoneType)) {
    canText = true
  }
  // Unknown type: default to true (most US numbers are mobile)

  return {
    e164: parsed.format('E.164'),
    display: parsed.formatNational(),
    canText,
  }
}

/**
 * Format an E.164 phone number for display.
 * Returns the input unchanged if parsing fails.
 */
export function formatPhoneDisplay(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164)
  if (!parsed) return e164
  return parsed.formatNational()
}

/**
 * Compare two phone numbers by normalizing both to E.164.
 * Returns true if they resolve to the same number.
 */
export function phonesMatch(a: string, b: string): boolean {
  const normA = normalizePhone(a)
  const normB = normalizePhone(b)
  if (!normA || !normB) return false
  return normA.e164 === normB.e164
}
