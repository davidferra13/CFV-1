// Email Validation - Rapid Email Verifier (free, open source, no key)
// https://rapid-email-verifier.fly.dev
// No signup, no storage, GDPR compliant
// Also includes local validation (no API call needed for obvious issues)

export interface EmailValidationResult {
  isValid: boolean
  email: string
  reason: string | null
  /** Whether we checked via API or just local validation */
  method: 'local' | 'api'
}

// Common typo domains → correct domain
const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outloo.com': 'outlook.com',
  'outlok.com': 'outlook.com',
  'iclod.com': 'icloud.com',
  'icloud.co': 'icloud.com',
}

// Disposable/temporary email domains to reject
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'grr.la',
  'dispostable.com',
  'maildrop.cc',
  'temp-mail.org',
  '10minutemail.com',
  'trashmail.com',
  'fakeinbox.com',
])

/**
 * Quick local email validation - no API call.
 * Catches format errors, typos, and disposable emails.
 */
export function validateEmailLocal(email: string): EmailValidationResult {
  const trimmed = email.trim().toLowerCase()

  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      email: trimmed,
      reason: 'Invalid email format',
      method: 'local',
    }
  }

  const domain = trimmed.split('@')[1]

  // Check for disposable email domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      isValid: false,
      email: trimmed,
      reason: 'Disposable email addresses are not accepted',
      method: 'local',
    }
  }

  return {
    isValid: true,
    email: trimmed,
    reason: null,
    method: 'local',
  }
}

/**
 * Check if the email domain looks like a typo.
 * Returns the suggested correction, or null if no typo detected.
 */
export function suggestEmailCorrection(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  const domain = trimmed.split('@')[1]
  if (!domain) return null

  const correction = DOMAIN_TYPOS[domain]
  if (correction) {
    return trimmed.replace(`@${domain}`, `@${correction}`)
  }
  return null
}

/**
 * Full email validation via API - checks MX records, SMTP, etc.
 * Use for important emails (new client signups, invoice recipients).
 * Falls back to local validation if API is unavailable.
 */
export async function validateEmail(email: string): Promise<EmailValidationResult> {
  // Always run local validation first
  const localResult = validateEmailLocal(email)
  if (!localResult.isValid) return localResult

  try {
    const res = await fetch(
      `https://rapid-email-verifier.fly.dev/verify?email=${encodeURIComponent(email)}`,
      { next: { revalidate: 86400 } } // cache 24h
    )
    if (!res.ok) return localResult // fall back to local

    const data = await res.json()

    return {
      isValid: data.is_valid ?? data.valid ?? true,
      email: email.trim().toLowerCase(),
      reason: data.reason ?? null,
      method: 'api',
    }
  } catch {
    // API unreachable - local validation is good enough
    return localResult
  }
}
