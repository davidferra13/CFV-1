// Server-side Cloudflare Turnstile token verification
// Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
//
// Graceful degradation:
//   - If TURNSTILE_SECRET_KEY is not set → bypass (returns success)
//   - If Cloudflare API is unreachable → log warning and allow through (non-blocking)

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface TurnstileVerifyResult {
  success: boolean
  error?: string
}

/**
 * Verify a Cloudflare Turnstile token server-side.
 *
 * @param token - The Turnstile response token from the client widget
 * @param ip - Optional client IP for additional verification
 * @returns { success: boolean, error?: string }
 */
export async function verifyTurnstileToken(
  token: string,
  ip?: string
): Promise<TurnstileVerifyResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // In production, missing secret key = reject (fail-closed).
  // In dev/test, missing key = bypass (allows local development without Turnstile).
  if (!secretKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[turnstile] TURNSTILE_SECRET_KEY not set in production — rejecting request')
      return { success: false, error: 'CAPTCHA service is not configured. Please contact support.' }
    }
    return { success: true }
  }

  // Missing token when Turnstile IS configured = reject
  if (!token) {
    return { success: false, error: 'Missing CAPTCHA verification. Please try again.' }
  }

  try {
    const body: Record<string, string> = {
      secret: secretKey,
      response: token,
    }
    if (ip) {
      body.remoteip = ip
    }

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
      signal: AbortSignal.timeout(5000), // 5s timeout — don't hang on Cloudflare issues
    })

    if (!res.ok) {
      console.error(`[turnstile] Cloudflare API returned HTTP ${res.status}`)
      // In production, fail closed — don't let requests through without verification
      if (process.env.NODE_ENV === 'production') {
        return { success: false, error: 'CAPTCHA verification unavailable. Please try again.' }
      }
      return { success: true }
    }

    const result = await res.json()

    if (result.success) {
      return { success: true }
    }

    // Cloudflare returns error codes — map to a human-readable message
    const errorCodes: string[] = result['error-codes'] || []
    console.warn('[turnstile] Verification failed:', errorCodes)

    return {
      success: false,
      error: 'CAPTCHA verification failed. Please refresh and try again.',
    }
  } catch (err) {
    console.error('[turnstile] Verification network error:', err)
    // In production, fail closed — attackers can't bypass CAPTCHA by disrupting DNS
    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'CAPTCHA verification unavailable. Please try again.' }
    }
    // In dev, allow through — don't block local development
    return { success: true }
  }
}
