/**
 * Twilio Webhook Signature Validation
 *
 * Validates X-Twilio-Signature using HMAC-SHA1. Must be called on every
 * Twilio webhook endpoint (gather, status, inbound).
 *
 * Algorithm:
 *  1. Build string: URL + sorted POST params (key+value concatenated)
 *  2. HMAC-SHA1 with TWILIO_AUTH_TOKEN
 *  3. Base64 encode
 *  4. Constant-time compare with X-Twilio-Signature header
 *
 * In development, validation is skipped when no signature is present.
 * In production, missing or invalid signatures return false.
 */

import { createHmac } from 'crypto'
import type { NextRequest } from 'next/server'

const APP_URL = process.env.NEXTAUTH_URL || 'https://app.cheflowhq.com'

export async function validateTwilioWebhook(
  req: NextRequest,
  formData: FormData
): Promise<boolean> {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return process.env.NODE_ENV === 'development'

  const signature = req.headers.get('x-twilio-signature')
  if (!signature) return process.env.NODE_ENV === 'development'

  // Full URL including query string (Twilio signs the complete URL)
  const url = `${APP_URL}${req.nextUrl.pathname}${req.nextUrl.search}`

  // Sort POST params alphabetically and concatenate key+value pairs
  const entries = Array.from(formData.entries()) as [string, string][]
  entries.sort(([a], [b]) => a.localeCompare(b))
  const signingStr = url + entries.map(([k, v]) => `${k}${v}`).join('')

  const expected = createHmac('sha1', authToken).update(signingStr).digest('base64')

  // Constant-time compare to prevent timing attacks
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return diff === 0
}
