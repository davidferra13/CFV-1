import { createServerClient } from '@/lib/db/server'
import { getCredential } from '@/lib/social/oauth/token-store'
import { getSyncRecord, saveSyncRecord } from './sync'
import type { FBEventResult } from './types'

const GRAPH = 'https://graph.facebook.com/v21.0'

async function graphPost(
  path: string,
  token: string,
  body: Record<string, string>
): Promise<unknown> {
  body.access_token = token
  const res = await fetch(`${GRAPH}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error((data as any)?.error?.message ?? `Graph POST ${path} -> ${res.status}`)
  }
  return data
}

async function graphDelete(path: string, token: string): Promise<void> {
  const res = await fetch(`${GRAPH}${path}?access_token=${token}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as any)?.error?.message ?? `Graph DELETE ${path} -> ${res.status}`)
  }
}

function buildEventInput(event: any, chefName?: string): Record<string, string> {
  const name = chefName
    ? `${chefName}: ${event.occasion ?? 'Private Dining Experience'}`
    : (event.occasion ?? 'Private Dining Experience')

  const descParts: string[] = []
  if (event.service_style) descParts.push(`Style: ${event.service_style}`)
  if (event.guest_count) descParts.push(`Guests: ${event.guest_count}`)
  if (event.course_count) descParts.push(`Courses: ${event.course_count}`)
  if (event.location_city) descParts.push(`Location: ${event.location_city}`)
  const description = descParts.length ? descParts.join('\n') : 'A private chef dining experience.'

  const startTime = event.event_date
    ? new Date(event.event_date).toISOString()
    : new Date().toISOString()

  const body: Record<string, string> = {
    name,
    description,
    start_time: startTime,
  }

  if (event.location_city) {
    body['place'] = JSON.stringify({
      name: event.location_city,
      location: { city: event.location_city },
    })
  }

  return body
}

export async function createFBEvent(tenantId: string, eventId: string): Promise<FBEventResult> {
  const existing = getSyncRecord(eventId, tenantId)
  if (existing?.status === 'active') {
    return {
      success: true,
      fbEventId: existing.fbEventId,
      fbEventUrl: `https://www.facebook.com/events/${existing.fbEventId}`,
    }
  }

  const credential = await getCredential(tenantId, 'facebook')
  if (!credential?.accessToken) {
    return { success: false, error: 'No Facebook credential found. Connect Facebook first.' }
  }

  const pageId = (credential as any).metaPageId
  if (!pageId) {
    return { success: false, error: 'No Facebook Page linked. Connect a Page in Social settings.' }
  }

  const db: any = createServerClient()
  const { data: event } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, service_style, location_city, course_count')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) return { success: false, error: 'Event not found' }

  const { data: profile } = await db
    .from('chef_profiles')
    .select('business_name')
    .eq('tenant_id', tenantId)
    .single()

  const body = buildEventInput(event, profile?.business_name)

  try {
    const result = (await graphPost(`/${pageId}/events`, credential.accessToken, body)) as {
      id: string
    }

    const now = new Date().toISOString()
    saveSyncRecord({
      eventId,
      tenantId,
      fbEventId: result.id,
      fbPageId: pageId,
      syncedAt: now,
      lastUpdatedAt: now,
      status: 'active',
    })

    return {
      success: true,
      fbEventId: result.id,
      fbEventUrl: `https://www.facebook.com/events/${result.id}`,
    }
  } catch (err) {
    const msg = (err as Error).message
    const retriable = /rate limit|timeout|temporarily/i.test(msg)
    return { success: false, error: msg, retriable }
  }
}

export async function updateFBEvent(
  tenantId: string,
  eventId: string,
  fbEventId: string
): Promise<FBEventResult> {
  const credential = await getCredential(tenantId, 'facebook')
  if (!credential?.accessToken) {
    return { success: false, error: 'No Facebook credential found' }
  }

  const db: any = createServerClient()
  const { data: event } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, service_style, location_city, course_count')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) return { success: false, error: 'Event not found' }

  const { data: profile } = await db
    .from('chef_profiles')
    .select('business_name')
    .eq('tenant_id', tenantId)
    .single()

  const body = buildEventInput(event, profile?.business_name)

  try {
    await graphPost(`/${fbEventId}`, credential.accessToken, body)

    const existing = getSyncRecord(eventId, tenantId)
    if (existing) {
      saveSyncRecord({
        ...existing,
        lastUpdatedAt: new Date().toISOString(),
        status: 'updated',
      })
    }

    return {
      success: true,
      fbEventId,
      fbEventUrl: `https://www.facebook.com/events/${fbEventId}`,
    }
  } catch (err) {
    const msg = (err as Error).message
    const retriable = /rate limit|timeout|temporarily/i.test(msg)
    return { success: false, error: msg, retriable }
  }
}

export async function cancelFBEvent(
  fbEventId: string,
  pageAccessToken: string
): Promise<FBEventResult> {
  try {
    await graphDelete(`/${fbEventId}`, pageAccessToken)
    return { success: true, fbEventId }
  } catch (err) {
    const msg = (err as Error).message
    const retriable = /rate limit|timeout|temporarily/i.test(msg)
    return { success: false, error: msg, retriable }
  }
}
