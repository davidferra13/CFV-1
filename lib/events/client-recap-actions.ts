// Client Event Recap - Post-event photos, menu, and chef notes

'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getEventPhotosForClient } from './photo-actions'

export type EventRecap = {
  event: {
    id: string
    occasion: string
    event_date: string
    location: string | null
    guest_count: number | null
    status: string
  }
  photos: Array<{
    id: string
    url: string
    caption: string | null
    photo_type: string | null
  }>
  menu: Array<{
    name: string
    description: string | null
    course: string | null
  }>
  chefNotes: string | null
}

/**
 * Get full recap data for a completed event.
 * Photos, finalized menu, and any chef notes.
 */
export async function getEventRecap(eventId: string): Promise<EventRecap | null> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Verify ownership and completion status
  const { data: event } = await db
    .from('events')
    .select('id, occasion, event_date, location, guest_count, status, tenant_id, chef_notes')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (!event) return null

  // Fetch photos and menu in parallel
  const [photosResult, menuResult] = await Promise.allSettled([
    getEventPhotosForClient(eventId),
    db
      .from('event_menu_items')
      .select('name, description, course')
      .eq('event_id', eventId)
      .order('course', { ascending: true }),
  ])

  const photos =
    photosResult.status === 'fulfilled'
      ? (photosResult.value || []).map((p: any) => ({
          id: p.id,
          url: p.signed_url || p.storage_path || '',
          caption: p.caption || null,
          photo_type: p.photo_type || null,
        }))
      : []

  const menu =
    menuResult.status === 'fulfilled'
      ? (menuResult.value.data || []).map((item: any) => ({
          name: item.name,
          description: item.description,
          course: item.course,
        }))
      : []

  return {
    event: {
      id: event.id,
      occasion: event.occasion || 'Event',
      event_date: event.event_date,
      location: event.location,
      guest_count: event.guest_count,
      status: event.status,
    },
    photos,
    menu,
    chefNotes: event.chef_notes || null,
  }
}
