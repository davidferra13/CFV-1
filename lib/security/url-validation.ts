// Centralized webhook/callback URL validation
// All external URL validation (Zapier, integrations, callbacks) must go through this module.
// Rejects: localhost, private IPs, metadata hosts, HTTP (non-TLS), credentialed URLs.

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./, // link-local / cloud metadata
]

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  '[::1]',
  'metadata.google.internal',
  'metadata.google',
  '169.254.169.254', // AWS/GCP metadata endpoint
])

export type UrlValidationResult =
  | { valid: true; url: URL }
  | { valid: false; reason: string }

/**
 * Validate a URL intended for webhook delivery or external callbacks.
 *
 * Rules enforced:
 *  1. Must be a valid URL
 *  2. Must use HTTPS (no plain HTTP)
 *  3. Must not contain credentials (user:pass@)
 *  4. Must not target localhost, private IPs, or cloud metadata endpoints
 *  5. Must have a hostname (no bare IPs in blocked ranges)
 */
export function validateWebhookUrl(raw: string): UrlValidationResult {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { valid: false, reason: 'Invalid URL format' }
  }

  // Protocol check: HTTPS only
  if (url.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTPS URLs are allowed' }
  }

  // Credential check
  if (url.username || url.password) {
    return { valid: false, reason: 'URLs with embedded credentials are not allowed' }
  }

  // Hostname blocklist
  const hostname = url.hostname.toLowerCase()
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, reason: `Blocked hostname: ${hostname}` }
  }

  // Private IP range check
  for (const pattern of PRIVATE_IP_RANGES) {
    if (pattern.test(hostname)) {
      return { valid: false, reason: 'Private/internal IP addresses are not allowed' }
    }
  }

  return { valid: true, url }
}
