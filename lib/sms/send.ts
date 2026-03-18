// SMS Notification Sender - Twilio REST API
// Raw fetch to Twilio's Messages API. No SDK dependency.
// Reads TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER from env.
//
// Only called from lib/notifications/channel-router.ts after rate limit is checked.
// Never call directly from product code.

export type SmsResult = 'sent' | 'failed' | 'not_configured'

/**
 * Send an SMS via Twilio's REST API.
 * Returns 'not_configured' if env vars are absent (graceful degradation).
 */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    // Twilio not configured - silently degrade, log for ops awareness
    console.warn('[sendSms] Twilio env vars not configured - SMS skipped')
    return 'not_configured'
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  // Twilio uses basic auth + form-encoded body
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  const params = new URLSearchParams()
  params.set('To', to)
  params.set('From', fromNumber)
  params.set('Body', body)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (response.ok) {
      return 'sent'
    }

    const errorBody = await response.text()
    console.error(`[sendSms] Twilio API error ${response.status}: ${errorBody}`)
    return 'failed'
  } catch (err) {
    console.error('[sendSms] Fetch error:', err)
    return 'failed'
  }
}

/**
 * Format a notification for SMS delivery.
 * Keeps messages brief - SMS charges per segment (160 chars).
 */
export function formatSmsBody(title: string, body?: string): string {
  const app = 'ChefFlow'
  if (body) {
    const message = `${app}: ${title} - ${body}`
    return message.length <= 160 ? message : message.slice(0, 157) + '…'
  }
  return `${app}: ${title}`
}
