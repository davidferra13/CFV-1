// Twilio SMS/WhatsApp Client - Infrastructure for multi-channel messaging
// Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env.local
// WhatsApp: TWILIO_WHATSAPP_NUMBER (format: whatsapp:+1234567890)
//
// This module provides send + receive for both SMS and WhatsApp via Twilio.
// Messages land in the same unified inbox (messages table) as Gmail.

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER

export function isTwilioConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER)
}

export function isWhatsAppConfigured(): boolean {
  return isTwilioConfigured() && !!TWILIO_WHATSAPP_NUMBER
}

interface SendResult {
  success: boolean
  sid?: string
  error?: string
}

/**
 * Send an SMS via Twilio REST API (no SDK dependency - just fetch)
 */
export async function sendSMS(to: string, body: string): Promise<SendResult> {
  if (!isTwilioConfigured()) {
    return {
      success: false,
      error:
        'Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.',
    }
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_PHONE_NUMBER!,
        Body: body,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return { success: false, error: result.message || `Twilio error: ${response.status}` }
    }

    return { success: true, sid: result.sid }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'SMS send failed' }
  }
}

/**
 * Send a WhatsApp message via Twilio REST API
 * Uses the Twilio WhatsApp Business API (requires approved sender)
 */
export async function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  if (!isWhatsAppConfigured()) {
    return { success: false, error: 'WhatsApp not configured. Set TWILIO_WHATSAPP_NUMBER.' }
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')

    // Twilio WhatsApp uses whatsapp: prefix on both To and From
    const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: whatsappTo,
        From: TWILIO_WHATSAPP_NUMBER!,
        Body: body,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return { success: false, error: result.message || `Twilio error: ${response.status}` }
    }

    return { success: true, sid: result.sid }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'WhatsApp send failed' }
  }
}

/**
 * Parse an inbound Twilio webhook payload (SMS or WhatsApp)
 */
export interface InboundMessage {
  from: string
  to: string
  body: string
  messageSid: string
  channel: 'sms' | 'whatsapp'
  mediaUrls: string[]
  numMedia: number
}

export function parseInboundWebhook(body: Record<string, string>): InboundMessage {
  const from = body.From || ''
  const isWhatsApp = from.startsWith('whatsapp:')

  return {
    from: isWhatsApp ? from.replace('whatsapp:', '') : from,
    to: (body.To || '').replace('whatsapp:', ''),
    body: body.Body || '',
    messageSid: body.MessageSid || '',
    channel: isWhatsApp ? 'whatsapp' : 'sms',
    mediaUrls: Array.from(
      { length: parseInt(body.NumMedia || '0', 10) },
      (_, i) => body[`MediaUrl${i}`] || ''
    ).filter(Boolean),
    numMedia: parseInt(body.NumMedia || '0', 10),
  }
}
