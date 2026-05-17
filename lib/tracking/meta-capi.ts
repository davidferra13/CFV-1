import { createHash, randomUUID } from 'crypto'

const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN
const PIXEL_ID = process.env.META_PIXEL_ID
const API_VERSION = 'v19.0'

// Basic in-memory dedup (event_id based, TTL 5 min)
const recentEvents = new Map<string, number>()
const DEDUP_TTL_MS = 5 * 60 * 1000

function pruneStaleEvents() {
  const now = Date.now()
  for (const [id, ts] of recentEvents) {
    if (now - ts > DEDUP_TTL_MS) recentEvents.delete(id)
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

export interface CAPIUserData {
  email?: string
  ip?: string
  userAgent?: string
  fbc?: string
  fbp?: string
}

export interface CAPICustomData {
  currency?: string
  value?: number
  content_name?: string
  content_category?: string
  [key: string]: unknown
}

export interface CAPIEvent {
  event_name: string
  event_time?: number
  event_id?: string
  event_source_url?: string
  user_data?: CAPIUserData
  custom_data?: CAPICustomData
}

export interface CAPIResult {
  success: boolean
  skipped?: boolean
  deduplicated?: boolean
  error?: string
}

/**
 * Send a server-side conversion event to Meta Conversions API.
 * Returns { skipped: true } if env vars are missing (safe in dev).
 */
export async function sendConversionEvent(event: CAPIEvent): Promise<CAPIResult> {
  if (!ACCESS_TOKEN || !PIXEL_ID) {
    return { success: true, skipped: true }
  }

  const eventId = event.event_id ?? randomUUID()
  const eventTime = event.event_time ?? Math.floor(Date.now() / 1000)

  // Dedup check
  pruneStaleEvents()
  if (recentEvents.has(eventId)) {
    return { success: true, deduplicated: true }
  }
  recentEvents.set(eventId, Date.now())

  // Hash PII
  const userData: Record<string, string> = {}
  if (event.user_data?.email) {
    userData.em = sha256(event.user_data.email)
  }
  if (event.user_data?.ip) {
    userData.client_ip_address = event.user_data.ip
  }
  if (event.user_data?.userAgent) {
    userData.client_user_agent = event.user_data.userAgent
  }
  if (event.user_data?.fbc) {
    userData.fbc = event.user_data.fbc
  }
  if (event.user_data?.fbp) {
    userData.fbp = event.user_data.fbp
  }

  const payload = {
    data: [
      {
        event_name: event.event_name,
        event_time: eventTime,
        event_id: eventId,
        event_source_url: event.event_source_url,
        action_source: 'website',
        user_data: userData,
        custom_data: event.custom_data,
      },
    ],
  }

  try {
    const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `Meta CAPI ${res.status}: ${text}` }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown CAPI error',
    }
  }
}
