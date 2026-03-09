'use server'

import { revalidatePath } from 'next/cache'
import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { createClientNotification } from '@/lib/notifications/client-actions'
import { DEFAULT_DIETARY_CONFIRMATION_MESSAGE } from '@/lib/events/dietary-confirmation-constants'

type DietaryConfirmationRecord = {
  id: string
  event_id: string
  tenant_id: string
  client_id: string
  confirmed_at: string
  confirmed_by_chef_id: string
  dietary_snapshot: {
    allergies: string[]
    dietary_restrictions: string[]
    dietary_protocols: string[]
    updated_at?: string | null
  }
  chef_notes: string | null
  client_message: string | null
  created_at: string
}

function revalidateDietaryPaths(eventId: string) {
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/my-events/${eventId}`)
}

async function getChefDietaryVisibilityForTenant(tenantId: string) {
  const supabase: any = createServerClient()
  const { data: chef } = await supabase
    .from('chefs')
    .select('show_dietary_confirmation')
    .eq('id', tenantId)
    .single()

  return chef?.show_dietary_confirmation !== false
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

function buildDietarySnapshot(client: any) {
  return {
    allergies: (client?.allergies ?? []) as string[],
    dietary_restrictions: (client?.dietary_restrictions ?? []) as string[],
    dietary_protocols: (client?.dietary_protocols ?? []) as string[],
    updated_at: client?.updated_at ?? null,
  }
}

export async function confirmDietaryRequirements(
  eventId: string,
  clientId: string,
  clientMessage?: string,
  chefNotes?: string
) {
  const user = await requireChef()
  const event = await assertChefEventAccess(eventId, user.tenantId!)
  if (event.client_id !== clientId) {
    throw new Error('Client does not match this event')
  }

  const supabase: any = createServerClient()
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, full_name, allergies, dietary_restrictions, dietary_protocols, updated_at')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (clientError || !client) {
    console.error('[confirmDietaryRequirements] Client error:', clientError)
    throw new Error('Client not found')
  }

  const payload = {
    event_id: eventId,
    tenant_id: user.tenantId!,
    client_id: clientId,
    confirmed_at: new Date().toISOString(),
    confirmed_by_chef_id: user.entityId,
    dietary_snapshot: buildDietarySnapshot(client),
    chef_notes: chefNotes?.trim() || null,
    client_message: clientMessage?.trim() || DEFAULT_DIETARY_CONFIRMATION_MESSAGE,
  }

  const { error } = await supabase.from('dietary_confirmations').upsert(payload, {
    onConflict: 'event_id,client_id',
  })

  if (error) {
    console.error('[confirmDietaryRequirements] Error:', error)
    throw new Error('Failed to confirm dietary requirements')
  }

  revalidateDietaryPaths(eventId)

  try {
    await createClientNotification({
      tenantId: user.tenantId!,
      clientId,
      category: 'system',
      action: 'system_alert',
      title: 'Dietary needs confirmed',
      body: payload.client_message ?? DEFAULT_DIETARY_CONFIRMATION_MESSAGE,
      actionUrl: `/my-events/${eventId}`,
      eventId,
      metadata: {
        type: 'dietary_confirmation',
        snapshot: payload.dietary_snapshot,
      },
    })
  } catch (notificationError) {
    console.error('[confirmDietaryRequirements] Notification failed:', notificationError)
  }

  return getDietaryConfirmation(eventId)
}

export async function getDietaryConfirmation(eventId: string) {
  const user = await requireChef()
  const event = await assertChefEventAccess(eventId, user.tenantId!)
  const supabase: any = createServerClient()

  const [{ data: client }, { data: confirmation }, showToClient] = await Promise.all([
    supabase
      .from('clients')
      .select('id, full_name, allergies, dietary_restrictions, dietary_protocols')
      .eq('id', event.client_id)
      .single(),
    supabase
      .from('dietary_confirmations')
      .select('*')
      .eq('event_id', eventId)
      .eq('client_id', event.client_id)
      .maybeSingle(),
    getChefDietaryVisibilityForTenant(user.tenantId!),
  ])

  return {
    client: {
      id: client?.id ?? event.client_id,
      full_name: client?.full_name ?? 'Client',
      allergies: (client?.allergies ?? []) as string[],
      dietary_restrictions: (client?.dietary_restrictions ?? []) as string[],
      dietary_protocols: (client?.dietary_protocols ?? []) as string[],
    },
    confirmation: (confirmation as DietaryConfirmationRecord | null) ?? null,
    showToClient,
  }
}

export async function getClientDietaryConfirmation(eventId: string) {
  const user = await requireClient()
  const event = await assertClientEventAccess(eventId, user.entityId)
  const supabase: any = createServerClient()
  const showToClient = await getChefDietaryVisibilityForTenant(event.tenant_id)

  if (!showToClient) {
    return null
  }

  const { data: confirmation, error } = await supabase
    .from('dietary_confirmations')
    .select('*')
    .eq('event_id', eventId)
    .eq('client_id', user.entityId)
    .maybeSingle()

  if (error) {
    console.error('[getClientDietaryConfirmation] Error:', error)
    throw new Error('Failed to fetch dietary confirmation')
  }

  return {
    confirmation: (confirmation as DietaryConfirmationRecord | null) ?? null,
    showToClient,
    eventDate: event.event_date,
  }
}

export async function toggleDietaryConfirmationVisibility(show: boolean) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('chefs')
    .update({ show_dietary_confirmation: show })
    .eq('id', user.tenantId!)

  if (error) {
    console.error('[toggleDietaryConfirmationVisibility] Error:', error)
    throw new Error('Failed to update dietary confirmation visibility')
  }

  revalidatePath('/settings/client-preview')
  return show
}

export async function getDietaryConfirmationVisibility(): Promise<boolean> {
  const user = await requireChef()
  return getChefDietaryVisibilityForTenant(user.tenantId!)
}
