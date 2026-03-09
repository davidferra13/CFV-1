'use server'

import { revalidatePath } from 'next/cache'
import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { formatGuestListCSV } from '@/lib/sharing/guest-csv-export'

type ClientGuestDetail = {
  id: string
  name: string
  email: string | null
  phone: string | null
  rsvp_status: string
  dietary_notes: string | null
  plus_ones: number
  responded_at: string | null
}

async function assertClientEventAccess(eventId: string, clientId: string) {
  const supabase: any = createServerClient()
  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id, client_id')
    .eq('id', eventId)
    .eq('client_id', clientId)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  return event as { id: string; tenant_id: string; client_id: string }
}

export async function getClientGuestDetails(eventId: string): Promise<{
  guests: ClientGuestDetail[]
  showDetails: boolean
  summary: {
    total: number
    attending: number
    declined: number
    maybe: number
    pending: number
    waitlisted: number
  }
}> {
  const user = await requireClient()
  const event = await assertClientEventAccess(eventId, user.entityId)
  const supabase: any = createServerClient()

  const [{ data: chef }, { data: guests }, { data: summaryRow }] = await Promise.all([
    supabase
      .from('chefs')
      .select('show_guest_details_to_host')
      .eq('id', event.tenant_id)
      .single(),
    supabase
      .from('event_guests')
      .select(
        'id, full_name, email, phone, rsvp_status, dietary_notes, plus_one, plus_one_name, attendance_queue_status, updated_at, created_at'
      )
      .eq('event_id', eventId)
      .order('created_at', { ascending: true }),
    supabase.from('event_rsvp_summary').select('*').eq('event_id', eventId).maybeSingle(),
  ])

  const showDetails = chef?.show_guest_details_to_host !== false
  const guestRows = ((guests ?? []) as any[]).map((guest) => ({
    id: guest.id,
    name: guest.full_name,
    email: guest.email ?? null,
    phone: guest.phone ?? null,
    rsvp_status:
      guest.attendance_queue_status === 'waitlisted' ? 'waitlisted' : guest.rsvp_status ?? 'pending',
    dietary_notes: guest.dietary_notes ?? null,
    plus_ones: guest.plus_one || guest.plus_one_name ? 1 : 0,
    responded_at: guest.rsvp_status && guest.rsvp_status !== 'pending' ? guest.updated_at : null,
  }))

  return {
    guests: showDetails ? guestRows : [],
    showDetails,
    summary: {
      total: summaryRow?.total_guests ?? guestRows.length,
      attending: summaryRow?.attending_count ?? 0,
      declined: summaryRow?.declined_count ?? 0,
      maybe: summaryRow?.maybe_count ?? 0,
      pending: summaryRow?.pending_count ?? 0,
      waitlisted: summaryRow?.waitlisted_count ?? 0,
    },
  }
}

export async function removeGuest(eventId: string, guestId: string) {
  const user = await requireClient()
  await assertClientEventAccess(eventId, user.entityId)
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('event_guests')
    .delete()
    .eq('id', guestId)
    .eq('event_id', eventId)

  if (error) {
    console.error('[removeGuest] Error:', error)
    throw new Error('Failed to remove guest')
  }

  revalidatePath(`/my-events/${eventId}`)
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function resendGuestInvite(eventId: string, guestId: string) {
  const user = await requireClient()
  await assertClientEventAccess(eventId, user.entityId)
  const supabase: any = createServerClient()

  const [{ data: guest }, { data: share }] = await Promise.all([
    supabase
      .from('event_guests')
      .select('id, guest_token, event_id')
      .eq('id', guestId)
      .eq('event_id', eventId)
      .single(),
    supabase
      .from('event_shares')
      .select('id, token, is_active')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!guest || !share) {
    throw new Error('Guest invite is not available')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const directUrl = `${appUrl}/event/${eventId}/guest/${guest.guest_token}`

  return {
    success: true,
    directUrl,
  }
}

export async function exportGuestListCSV(eventId: string): Promise<string> {
  const data = await getClientGuestDetails(eventId)
  if (!data.showDetails) {
    throw new Error('Guest detail export is disabled by your chef')
  }

  return formatGuestListCSV(
    data.guests.map((guest) => ({
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      rsvp_status: guest.rsvp_status,
      dietary_notes: guest.dietary_notes,
      plus_ones: guest.plus_ones,
    }))
  )
}

export async function toggleGuestDetailVisibility(show: boolean) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('chefs')
    .update({ show_guest_details_to_host: show })
    .eq('id', user.tenantId!)

  if (error) {
    console.error('[toggleGuestDetailVisibility] Error:', error)
    throw new Error('Failed to update guest detail visibility')
  }

  revalidatePath('/settings/client-preview')
  return show
}

export async function getGuestDetailVisibility() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: chef, error } = await supabase
    .from('chefs')
    .select('show_guest_details_to_host')
    .eq('id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getGuestDetailVisibility] Error:', error)
    throw new Error('Failed to fetch guest detail visibility')
  }

  return chef?.show_guest_details_to_host !== false
}
