// Signed Cookie Utility
// HMAC-signs cookie values to prevent client-side tampering.
// Uses Web Crypto API (works in both Edge Runtime and Node.js).
//
// The HMAC key is derived from CRON_SECRET (always available in production)
// or a fallback for dev. This avoids adding yet another env var.

const VALID_ROLES = ['chef', 'client', 'staff', 'partner'] as const

function getSigningKey(): string {
  // Use CRON_SECRET as the signing material — it's always set in production.
  // In dev, fall back to a static string (cookie signing in dev is nice-to-have, not critical).
  return process.env.CRON_SECRET || 'chefflow-dev-cookie-key'
}

async function hmacSign(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSigningKey()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Create a signed cookie value: `role.hmac_signature`
 */
export async function signRoleCookie(role: string): Promise<string> {
  const sig = await hmacSign(role)
  return `${role}.${sig}`
}

/**
 * Verify and extract the role from a signed cookie value.
 * Returns the role if valid, null if tampered or malformed.
 */
export async function verifyRoleCookie(cookieValue: string): Promise<string | null> {
  const dotIndex = cookieValue.lastIndexOf('.')
  if (dotIndex === -1) return null

  const role = cookieValue.slice(0, dotIndex)
  const providedSig = cookieValue.slice(dotIndex + 1)

  // Only accept known role values
  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) return null

  const expectedSig = await hmacSign(role)

  // Constant-time comparison (both are hex strings of equal length)
  if (providedSig.length !== expectedSig.length) return null

  let match = true
  for (let i = 0; i < expectedSig.length; i++) {
    if (providedSig[i] !== expectedSig[i]) match = false
  }

  return match ? role : null
}
