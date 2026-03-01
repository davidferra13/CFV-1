// Web Push Notification Sender
// Sends encrypted push messages to browser endpoints via the Web Push Protocol (RFC 8030).
// Uses raw fetch — no npm SDK dependency (web-push is a large package).
// Encryption follows RFC 8291 (message encryption for Web Push).

import { buildVapidAuthHeader } from './vapid'

export type PushPayload = {
  title: string
  body?: string
  icon?: string
  badge?: string
  action_url?: string
}

export type PushSubscriptionRecord = {
  id: string
  endpoint: string
  p256dh: string
  auth_key: string
}

type SendResult = 'sent' | 'failed' | 'gone'

/**
 * Send a push notification to a single subscription endpoint.
 *
 * Returns:
 *   'sent'   — successfully delivered to push service
 *   'gone'   — subscription is expired (410 Gone); caller should deactivate it
 *   'failed' — transient error; caller should increment failure count
 */
export async function sendPushNotification(
  subscription: PushSubscriptionRecord,
  payload: PushPayload
): Promise<SendResult> {
  try {
    const endpoint = subscription.endpoint
    const audience = new URL(endpoint).origin

    const vapidAuth = await buildVapidAuthHeader(audience)

    // Encrypt the payload per RFC 8291
    const encryptedBody = await encryptPayload(
      JSON.stringify(payload),
      subscription.p256dh,
      subscription.auth_key
    )

    // SECURITY: Validate push endpoint URL to prevent SSRF — blocks private IPs
    const parsedUrl = new URL(endpoint)
    if (
      parsedUrl.hostname === 'localhost' ||
      parsedUrl.hostname === '0.0.0.0' ||
      /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.)/.test(
        parsedUrl.hostname
      ) ||
      parsedUrl.hostname === '[::1]'
    ) {
      console.error('[sendPushNotification] Blocked SSRF attempt to private endpoint:', endpoint)
      return 'failed'
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: vapidAuth,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        TTL: '86400', // Message time-to-live: 24 hours
        Urgency: payload.action_url ? 'high' : 'normal',
      },
      body: encryptedBody,
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    })

    if (response.status === 410 || response.status === 404) {
      // Browser unsubscribed — subscription is stale
      return 'gone'
    }

    if (response.status === 201 || response.status === 200) {
      return 'sent'
    }

    console.error(
      `[sendPushNotification] Push service returned ${response.status} for endpoint ${endpoint}`
    )
    return 'failed'
  } catch (err) {
    console.error('[sendPushNotification] Error:', err)
    return 'failed'
  }
}

// ─── RFC 8291 Payload Encryption ─────────────────────────────────────────────
// aes128gcm content encoding (mandatory for modern browsers)

async function encryptPayload(
  plaintext: string,
  p256dhBase64url: string,
  authBase64url: string
): Promise<ArrayBuffer> {
  const { subtle } = globalThis.crypto

  // Decode recipient's public key and auth secret
  const recipientPublicKeyBytes = base64urlToBytes(p256dhBase64url)
  const authSecret = base64urlToBytes(authBase64url)

  // Generate ephemeral ECDH key pair
  const ephemeralKeyPair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])

  // Import recipient's public key
  const recipientPublicKey = await subtle.importKey(
    'raw',
    recipientPublicKeyBytes as unknown as Uint8Array<ArrayBuffer>,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Derive shared ECDH secret
  const ecdhSecret = await subtle.deriveBits(
    { name: 'ECDH', public: recipientPublicKey },
    ephemeralKeyPair.privateKey,
    256
  )

  // Export ephemeral public key (uncompressed, 65 bytes)
  const ephemeralPublicKeyRaw = await subtle.exportKey('raw', ephemeralKeyPair.publicKey)

  // Generate random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // RFC 8291 HKDF key derivation
  const prk = await hkdf(
    new Uint8Array(ecdhSecret),
    new Uint8Array(authSecret),
    concat(
      new TextEncoder().encode('WebPush: info\x00'),
      new Uint8Array(recipientPublicKeyBytes),
      new Uint8Array(ephemeralPublicKeyRaw)
    ),
    32
  )

  const contentEncryptionKey = await hkdf(
    prk,
    new Uint8Array(salt),
    new TextEncoder().encode('Content-Encoding: aes128gcm\x00'),
    16
  )
  const nonce = await hkdf(
    prk,
    new Uint8Array(salt),
    new TextEncoder().encode('Content-Encoding: nonce\x00'),
    12
  )

  // Import content encryption key
  const aesKey = await subtle.importKey(
    'raw',
    contentEncryptionKey,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt']
  )

  // Encrypt: plaintext + 0x02 padding delimiter
  const plaintextBytes = new TextEncoder().encode(plaintext)
  const paddedPlaintext = concat(plaintextBytes, new Uint8Array([0x02]))

  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, paddedPlaintext)

  // Build aes128gcm content encoding header (RFC 8188)
  const rs = 4096 // Record size
  const keyIdLen = new Uint8Array(ephemeralPublicKeyRaw).length

  const header = new Uint8Array(16 + 4 + 1 + keyIdLen)
  header.set(salt)
  new DataView(header.buffer).setUint32(16, rs, false)
  header[20] = keyIdLen
  header.set(new Uint8Array(ephemeralPublicKeyRaw), 21)

  return concat(header, new Uint8Array(ciphertext)).buffer
}

// ─── HKDF helper ─────────────────────────────────────────────────────────────

async function hkdf(
  ikm: Uint8Array<ArrayBuffer>,
  salt: Uint8Array<ArrayBuffer>,
  info: Uint8Array<ArrayBuffer>,
  length: number
): Promise<Uint8Array<ArrayBuffer>> {
  const { subtle } = globalThis.crypto

  const key = await subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits'])
  const bits = await subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  )
  return new Uint8Array(bits) as Uint8Array<ArrayBuffer>
}

function concat(...arrays: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = arrays.reduce((acc, a) => acc + a.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    result.set(a, offset)
    offset += a.length
  }
  return result as Uint8Array<ArrayBuffer>
}

function base64urlToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binaryString = atob(padded)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}
