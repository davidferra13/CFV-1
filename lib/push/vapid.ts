// VAPID Key Management and JWT Signing
// VAPID (Voluntary Application Server Identification) is required by Web Push.
// Keys are generated once and stored as environment variables. Never rotate unless
// the private key is compromised - rotation invalidates all existing subscriptions.
//
// Generate keys (run once in Node.js REPL or via npx web-push generate-vapid-keys):
//   const { subtle } = require('crypto').webcrypto
//   const key = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])
//   // Export and base64url-encode both keys
//
// Environment variables required:
//   VAPID_PUBLIC_KEY   - base64url-encoded P-256 public key (~88 chars)
//   VAPID_PRIVATE_KEY  - base64url-encoded P-256 private key (~43 chars)
//   VAPID_CONTACT_EMAIL - mailto: URI, e.g. mailto:admin@cheflowhq.com

/**
 * Returns the VAPID public key as a base64url string.
 * Safe to expose to the browser - used in PushManager.subscribe().
 */
export function getVapidPublicKey(): string {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) throw new Error('VAPID_PUBLIC_KEY environment variable is not set')
  return key
}

/**
 * Build the Authorization header value for a Web Push request.
 * Returns a JWT signed with the VAPID private key.
 * RFC 8292 §2.1 - claims: aud (push service origin), exp, sub (contact email)
 */
export async function buildVapidAuthHeader(audience: string): Promise<string> {
  const privateKeyBase64 = process.env.VAPID_PRIVATE_KEY
  const publicKeyBase64 = process.env.VAPID_PUBLIC_KEY
  const subject = process.env.VAPID_CONTACT_EMAIL || 'mailto:admin@cheflowhq.com'

  if (!privateKeyBase64 || !publicKeyBase64) {
    throw new Error('VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.')
  }

  const { subtle } = globalThis.crypto

  // Import the VAPID private key
  const privateKeyDer = base64urlToBuffer(privateKeyBase64)
  const privateKey = await subtle.importKey(
    'pkcs8',
    privateKeyDer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  // Build JWT header + payload
  const header = base64urlEncode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = base64urlEncode(
    JSON.stringify({
      aud: audience, // Push service origin (e.g. https://fcm.googleapis.com)
      exp: now + 12 * 3600, // 12 hours
      sub: subject,
    })
  )

  const signingInput = `${header}.${payload}`
  const signingInputBytes = new TextEncoder().encode(signingInput)

  const signatureBuffer = await subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    signingInputBytes
  )

  const signature = base64urlEncodeBuffer(new Uint8Array(signatureBuffer))
  const jwt = `${signingInput}.${signature}`

  return `vapid t=${jwt},k=${publicKeyBase64}`
}

// ─── Utility Functions ───────────────────────────────────────────────────────

function base64urlEncode(input: string): string {
  return base64urlEncodeBuffer(new TextEncoder().encode(input))
}

function base64urlEncodeBuffer(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binaryString = atob(padded)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}
