// Webhook URL Validation - SSRF Protection
// Prevents server-side request forgery by blocking private/internal IPs
// and enforcing HTTPS on all user-configured webhook URLs.

/**
 * Regular expressions matching private, loopback, and link-local IPv4 ranges.
 * These must never be targets of outbound requests triggered by user input.
 */
const PRIVATE_IPV4_RANGES = [
  /^127\./, // 127.0.0.0/8 - loopback
  /^10\./, // 10.0.0.0/8 - Class A private
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12 - Class B private
  /^192\.168\./, // 192.168.0.0/16 - Class C private
  /^169\.254\./, // 169.254.0.0/16 - link-local (AWS/GCP/Azure metadata)
  /^0\./, // 0.0.0.0/8
]

/** Hostnames that resolve to local/internal addresses */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '[::]',
  '[::1]',
  'metadata.google.internal', // GCP metadata
  'metadata', // Short alias sometimes used
])

/**
 * Check if a hostname looks like a private/internal IPv4 address.
 */
function isPrivateIPv4(hostname: string): boolean {
  return PRIVATE_IPV4_RANGES.some((range) => range.test(hostname))
}

/**
 * Check if a hostname is a private/internal IPv6 address.
 * Strips brackets for raw comparison.
 */
function isPrivateIPv6(hostname: string): boolean {
  const raw = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (raw === '::1' || raw === '::') return true
  // fc00::/7 - unique local addresses
  if (/^fc[0-9a-f]{2}:/.test(raw)) return true
  // fd00::/8 - unique local addresses
  if (/^fd[0-9a-f]{2}:/.test(raw)) return true
  // fe80::/10 - link-local
  if (/^fe80:/.test(raw)) return true
  // IPv4-mapped IPv6 (::ffff:127.0.0.1, ::ffff:10.0.0.1, etc.)
  const v4MappedMatch = raw.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (v4MappedMatch && isPrivateIPv4(v4MappedMatch[1])) return true
  return false
}

/**
 * Validate a webhook URL for SSRF safety.
 * Throws a descriptive error if the URL is invalid or targets a private address.
 *
 * Checks:
 * 1. Valid URL syntax
 * 2. HTTPS only (HTTP rejected)
 * 3. No private/internal IPv4 ranges (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x)
 * 4. No private IPv6 (::1, fc00::/7, fe80::/10)
 * 5. No localhost or metadata hostnames
 * 6. No userinfo in URL (prevents auth smuggling)
 */
export function validateWebhookUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid webhook URL')
  }

  // 1. Require HTTPS
  if (parsed.protocol !== 'https:') {
    throw new Error('Webhook URLs must use HTTPS')
  }

  // 2. Block userinfo (user:pass@host) - prevents auth credential smuggling
  if (parsed.username || parsed.password) {
    throw new Error('Webhook URLs must not contain credentials')
  }

  const hostname = parsed.hostname.toLowerCase()

  // 3. Block known internal hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error('Webhook URLs cannot target internal addresses')
  }

  // 4. Block private IPv4
  if (isPrivateIPv4(hostname)) {
    throw new Error('Webhook URLs cannot target private IP addresses')
  }

  // 5. Block private IPv6
  if (isPrivateIPv6(hostname)) {
    throw new Error('Webhook URLs cannot target private IP addresses')
  }
}
