/**
 * Phone number utilities for the calling system.
 * Shared between server actions, API routes, and inbound handlers.
 */

/**
 * Normalize a US phone number to E.164 format (+1XXXXXXXXXX).
 * Handles: 10-digit, 11-digit with leading 1, already-formatted +1XXXXXXXXXX.
 * Non-US numbers (not 10 or 11 digits starting with 1) are returned trimmed as-is.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.trim()
}

/**
 * Validate that a phone string looks like a valid E.164 number.
 * Accepts +[country_code][subscriber] with 7-15 total digits.
 * Use after normalizePhone() before passing to Twilio.
 */
export function isValidE164(phone: string): boolean {
  return /^\+\d{7,15}$/.test(phone)
}
