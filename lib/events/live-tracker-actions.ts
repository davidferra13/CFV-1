'use server'

import { revalidatePath } from 'next/cache'
import { requireChef, requireClient, getCurrentUser } from '@/lib/auth/get-user'
import {
  LIVE_TRACKER_STATUS_KEYS,
  LIVE_TRACKER_STATUS_LABELS,
  type LiveTrackerStatusKey,
} from '@/lib/events/live-tracker-constants'
import { createServerClient } from '@/lib/supabase/server'
import { createClientNotification } from '@/lib/notifications/client-actions'

const DEFAULT_LIVE_TRACKER_VISIBILITY: Record<LiveTrackerStatusKey, boolean> = {
  en_route: true,
  arrived: true,
  setting_up: false,
  prep_underway: false,
  first_course: true,
  main_course: true,
  dessert: true,
  cleanup: false,
  complete: true,
}

type EventLiveStatusRow = {
  id: string
  event_id: string
  tenant_id: string
  status_key: LiveTrackerStatusKey
  timestamp: string
  chef_note: string | null
  client_visible: boolean
  created_at: string
}

function normalizeLiveTrackerVisibility(value: unknown): Record<LiveTrackerStatusKey, boolean> {
  const raw = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  return LIVE_TRACKER_STATUS_KEYS.reduce(
    (acc, key) => {
      acc[key] =
        typeof raw[key] === 'boolean'
          ? (raw[key] as boolean)
          : DEFAULT_LIVE_TRACKER_VISIBILITY[key]
      return acc
    },
    {} as Record<LiveTrackerStatusKey, boolean>
  )
}

function validateLiveStatusKey(statusKey: string): LiveTrackerStatusKey {
  if (!LIVE_TRACKER_STATUS_KEYS.includes(statusKey as LiveTrackerStatusKey)) {
    throw new Error('Invalid live tracker status')
  }
  return statusKey as LiveTrackerStatusKey
}

function sortLiveStatuses(rows: EventLiveStatusRow[]) {
  return [...rows].sort(
    (a, b) =>
      LIVE_TRACKER_STATUS_KEYS.indexOf(a.status_key) - LIVE_TRACKER_STATUS_KEYS.indexOf(b.status_key)
  )
}

function revalidateLiveTrackerPaths(eventId: string) {
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/my-events/${eventId}`)
}

async function assertChefEventAccess(eventId: string, tenantId: string) {
  const supabase: any = createServerClient()
  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id, client_id, event_date')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  return event as { id: string; tenant_id: string; client_id: string; event_date: string }
}

async function assertClientEventAccess(eventId: string, clientId: string) {
  const supabase: any = createServerClient()
  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id, client_id, event_date')
    .eq('id', eventId)
    .eq('client_id', clientId)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  return event as { id: string; tenant_id: string; client_id: string; event_date: string }
}

async function getLiveTrackerVisibilityForTenant(tenantId: string) {
  const supabase: any = createServerClient()
  const { data: chef } = await supabase
    .from('chefs')
    .select('live_tracker_visibility')
    .eq('id', tenantId)
    .single()

  return normalizeLiveTrackerVisibility(chef?.live_tracker_visibility)
}

export async function setEventLiveStatus(eventId: string, statusKey: string, chefNote?: string) {
  const user = await requireChef()
  const normalizedStatusKey = validateLiveStatusKey(statusKey)
  const event = await assertChefEventAccess(eventId, user.tenantId!)
  const supabase: any = createServerClient()
  const visibility = await getLiveTrackerVisibilityForTenant(user.tenantId!)
  const timestamp = new Date().toISOString()

  const { error } = await supabase.from('event_live_status').upsert(
    {
      event_id: eventId,
      tenant_id: user.tenantId!,
      status_key: normalizedStatusKey,
      timestamp,
      chef_note: chefNote?.trim() || null,
      client_visible: visibility[normalizedStatusKey] ?? true,
    },
    { onConflict: 'event_id,status_key' }
  )

  if (error) {
    console.error('[setEventLiveStatus] Error:', error)
    throw new Error('Failed to update live tracker status')
  }

  revalidateLiveTrackerPaths(eventId)

  if (visibility[normalizedStatusKey]) {
    try {
      await createClientNotification({
        tenantId: user.tenantId!,
        clientId: event.client_id,
        category: 'system',
        action: 'system_alert',
        title: LIVE_TRACKER_STATUS_LABELS[normalizedStatusKey],
        body: chefNote?.trim() || undefined,
        actionUrl: `/my-events/${eventId}`,
        eventId,
        metadata: {
          type: 'event_live_tracker',
          status_key: normalizedStatusKey,
          status_label: LIVE_TRACKER_STATUS_LABELS[normalizedStatusKey],
          timestamp,
        },
      })
    } catch (notificationError) {
      console.error('[setEventLiveStatus] Notification failed:', notificationError)
    }
  }

  return getChefLiveStatuses(eventId)
}

export async function getChefLiveStatuses(eventId: string) {
  const user = await requireChef()
  await assertChefEventAccess(eventId, user.tenantId!)
  const supabase: any = createServerClient()
  const [{ data: rows }, visibility] = await Promise.all([
    supabase.from('event_live_status').select('*').eq('event_id', eventId),
    getLiveTrackerVisibilityForTenant(user.tenantId!),
  ])

  return {
    statuses: sortLiveStatuses(((rows ?? []) as EventLiveStatusRow[]) || []),
    visibility,
  }
}

export async function getClientLiveStatuses(eventId: string) {
  const user = await requireClient()
  const event = await assertClientEventAccess(eventId, user.entityId)
  const supabase: any = createServerClient()
  const visibility = await getLiveTrackerVisibilityForTenant(event.tenant_id)

  const { data: rows, error } = await supabase
    .from('event_live_status')
    .select('*')
    .eq('event_id', eventId)

  if (error) {
    console.error('[getClientLiveStatuses] Error:', error)
    throw new Error('Failed to fetch live event updates')
  }

  const filtered = sortLiveStatuses(((rows ?? []) as EventLiveStatusRow[]) || []).filter(
    (row) => row.client_visible && visibility[row.status_key]
  )

  return {
    statuses: filtered,
    visibility,
  }
}

export async function clearLiveStatuses(eventId: string) {
  const user = await requireChef()
  await assertChefEventAccess(eventId, user.tenantId!)
  const supabase: any = createServerClient()

  const { error } = await supabase.from('event_live_status').delete().eq('event_id', eventId)
  if (error) {
    console.error('[clearLiveStatuses] Error:', error)
    throw new Error('Failed to reset live tracker')
  }

  revalidateLiveTrackerPaths(eventId)
  return { success: true }
}

export async function updateLiveTrackerVisibility(visibility: Record<string, boolean>) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const nextVisibility = normalizeLiveTrackerVisibility(visibility)

  const { error } = await supabase
    .from('chefs')
    .update({ live_tracker_visibility: nextVisibility })
    .eq('id', user.tenantId!)

  if (error) {
    console.error('[updateLiveTrackerVisibility] Error:', error)
    throw new Error('Failed to update live tracker visibility')
  }

  revalidatePath('/settings/client-preview')
  return nextVisibility
}

export async function getLiveTrackerVisibility() {
  const user = await requireChef()
  return getLiveTrackerVisibilityForTenant(user.tenantId!)
}

export async function getCurrentEventStatus(eventId: string) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }

  const result =
    user.role === 'chef'
      ? await getChefLiveStatuses(eventId)
      : await getClientLiveStatuses(eventId)

  if (!result.statuses.length) {
    return null
  }

  return [...result.statuses].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0]
}
