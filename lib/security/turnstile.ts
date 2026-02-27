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

  // Graceful bypass: if no secret key configured, skip verification
  // This allows dev/testing environments to work without Turnstile
  if (!secretKey) {
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
      console.warn(`[turnstile] Cloudflare API returned HTTP ${res.status} — allowing through`)
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
    // Non-blocking: if the network call itself fails (DNS, timeout, etc.),
    // log and allow through — don't block real users because Cloudflare is down
    console.warn('[turnstile] Verification network error (allowing through):', err)
    return { success: true }
  }
}
