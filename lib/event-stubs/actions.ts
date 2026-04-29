'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { z } from 'zod'
import type { Json } from '@/types/database'
import type { EventStub } from '@/lib/hub/types'

// ---------------------------------------------------------------------------
// Event Stubs - Client-initiated events (pre-chef)
// ---------------------------------------------------------------------------

const CreateStubSchema = z.object({
  profileToken: z.string().uuid(),
  title: z.string().min(1).max(200),
  occasion: z.string().max(100).optional().nullable(),
  event_date: z.string().optional().nullable(),
  guest_count: z.number().int().positive().optional().nullable(),
  location_text: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  createGroup: z.boolean().optional(),
})

/**
 * Create an event stub. Optionally creates a hub group for it.
 */
export async function createEventStub(input: z.infer<typeof CreateStubSchema>): Promise<EventStub> {
  const validated = CreateStubSchema.parse(input)
  const db = createServerClient({ admin: true })

  // Resolve profile
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id, display_name')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  // Create stub
  const { data: stub, error } = await db
    .from('event_stubs')
    .insert({
      created_by_profile_id: profile.id,
      title: validated.title,
      occasion: validated.occasion ?? null,
      event_date: validated.event_date ?? null,
      guest_count: validated.guest_count ?? null,
      location_text: validated.location_text ?? null,
      notes: validated.notes ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create event stub: ${error.message}`)

  // Optionally create a hub group for collaborative planning
  if (validated.createGroup !== false) {
    const { data: group } = await db
      .from('hub_groups')
      .insert({
        name: validated.title,
        event_stub_id: stub.id,
        created_by_profile_id: profile.id,
        emoji: '🍽️',
      })
      .select('id, group_token')
      .single()

    if (group) {
      // Link stub to group
      const { error: linkErr } = await db
        .from('event_stubs')
        .update({ hub_group_id: group.id })
        .eq('id', stub.id)
      if (linkErr) {
        console.error('[createEventStub] Failed to link stub to group:', linkErr.message)
      }

      // Add creator as owner of the group
      await db.from('hub_group_members').insert({
        group_id: group.id,
        profile_id: profile.id,
        role: 'owner',
        can_post: true,
        can_invite: true,
        can_pin: true,
      })

      // Post system message
      await db.from('hub_messages').insert({
        group_id: group.id,
        author_profile_id: profile.id,
        message_type: 'system',
        system_event_type: 'event_planning_started',
        system_metadata: {
          title: validated.title,
          creator_name: profile.display_name,
        } as Json,
      })

      stub.hub_group_id = group.id
      stub.hub_group_token = group.group_token
    }
  }

  return stub as EventStub
}

/**
 * Get an event stub by ID.
 */
export async function getEventStub(stubId: string): Promise<EventStub | null> {
  const db = createServerClient({ admin: true })

  const { data, error } = await db.from('event_stubs').select('*').eq('id', stubId).single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load event stub: ${error.message}`)
  }
  return (data as EventStub) ?? null
}

/**
 * Get all event stubs created by a profile.
 */
export async function getProfileEventStubs(profileToken: string): Promise<EventStub[]> {
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data, error } = await db
    .from('event_stubs')
    .select('*')
    .eq('created_by_profile_id', profile.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load stubs: ${error.message}`)
  return (data ?? []) as EventStub[]
}

const UpdateStubSchema = z.object({
  stubId: z.string().uuid(),
  profileToken: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  occasion: z.string().max(100).optional().nullable(),
  event_date: z.string().optional().nullable(),
  guest_count: z.number().int().positive().optional().nullable(),
  location_text: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

const AdoptStubSchema = z.object({
  stubId: z.string().uuid(),
  tenantId: z.string().uuid(),
})

/**
 * Update an event stub. Only the creator can update.
 */
export async function updateEventStub(input: z.infer<typeof UpdateStubSchema>): Promise<EventStub> {
  const validated = UpdateStubSchema.parse(input)
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  // Verify ownership
  const { data: stub } = await db
    .from('event_stubs')
    .select('created_by_profile_id, status')
    .eq('id', validated.stubId)
    .single()

  if (!stub) throw new Error('Event stub not found')
  if (stub.created_by_profile_id !== profile.id) {
    throw new Error('Only the creator can update this event')
  }
  if (stub.status === 'adopted' || stub.status === 'cancelled') {
    throw new Error('Cannot update an adopted or cancelled event')
  }

  const { stubId, profileToken, ...updates } = validated
  const { data, error } = await db
    .from('event_stubs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', stubId)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to update stub: ${error.message}`)
  return data as EventStub
}

/**
 * Mark a stub as seeking a chef.
 */
export async function seekChef(input: { stubId: string; profileToken: string }): Promise<void> {
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: stub } = await db
    .from('event_stubs')
    .select('created_by_profile_id, status, hub_group_id')
    .eq('id', input.stubId)
    .single()

  if (!stub) throw new Error('Event stub not found')
  if (stub.created_by_profile_id !== profile.id) {
    throw new Error('Only the creator can seek a chef')
  }

  await db
    .from('event_stubs')
    .update({ status: 'seeking_chef', updated_at: new Date().toISOString() })
    .eq('id', input.stubId)

  // Post system message if group exists
  if (stub.hub_group_id) {
    try {
      await db.from('hub_messages').insert({
        group_id: stub.hub_group_id,
        author_profile_id: profile.id,
        message_type: 'system',
        system_event_type: 'seeking_chef',
        system_metadata: {} as Json,
        body: 'Looking for a chef for this event!',
      })
    } catch {
      // Non-blocking
    }
  }
}

/**
 * Chef adopts an event stub. Creates a real event and links everything.
 */
export async function adoptEventStub(input: {
  stubId: string
  tenantId: string
}): Promise<{ eventId: string }> {
  const validated = AdoptStubSchema.parse(input)
  const user = await requireChef()
  // Tenant ID must come from session, never from client input
  if (validated.tenantId !== user.tenantId) {
    throw new Error('Unauthorized')
  }

  const db = createServerClient({ admin: true })

  // Get stub
  const { data: stub } = await db
    .from('event_stubs')
    .select('*')
    .eq('id', validated.stubId)
    .single()

  if (!stub) throw new Error('Event stub not found')
  if (stub.status === 'adopted') throw new Error('Stub already adopted')

  // Get chef name for system message
  const { data: chef } = await db
    .from('chefs')
    .select('business_name')
    .eq('id', validated.tenantId)
    .single()

  // Look up or create a client for the stub creator
  // Stubs are created by hub guest profiles - we need a client_id for the event
  const { data: creatorProfile } = await db
    .from('hub_guest_profiles')
    .select('email, display_name, client_id')
    .eq('id', stub.created_by_profile_id)
    .single()

  let clientId = creatorProfile?.client_id
  if (!clientId) {
    // Create a minimal client record for this guest
    const { data: newClient } = await db
      .from('clients')
      .insert({
        tenant_id: validated.tenantId,
        full_name: creatorProfile?.display_name ?? 'Guest',
        email: creatorProfile?.email ?? `hub-guest-${stub.created_by_profile_id}@placeholder.local`,
      })
      .select('id')
      .single()
    clientId = newClient?.id
  }
  if (!clientId) throw new Error('Could not resolve client for stub')

  // Create a real event from stub data
  const { data: event, error: eventError } = await db
    .from('events')
    .insert({
      tenant_id: validated.tenantId,
      client_id: clientId,
      occasion: stub.occasion ?? stub.title,
      event_date:
        stub.event_date ??
        ((_d) =>
          `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`)(
          new Date()
        ),
      serve_time: '18:00:00',
      guest_count: stub.guest_count ?? 2,
      location_address: stub.location_text ?? 'TBD',
      location_city: 'TBD',
      location_zip: '00000',
      special_requests: stub.notes,
      status: 'draft',
    })
    .select('id')
    .single()

  if (eventError) throw new Error(`Failed to create event: ${eventError.message}`)
  if (!event) throw new Error('Failed to create event')

  // Update stub with adoption info
  const { error: stubUpdateError } = await db
    .from('event_stubs')
    .update({
      adopted_event_id: event.id,
      adopted_tenant_id: validated.tenantId,
      adopted_at: new Date().toISOString(),
      status: 'adopted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.stubId)

  if (stubUpdateError) throw new Error(`Failed to adopt stub: ${stubUpdateError.message}`)

  // If there's a hub group, link it to the real event and add chef
  if (stub.hub_group_id) {
    const { error: groupUpdateError } = await db
      .from('hub_groups')
      .update({
        event_id: event.id,
        tenant_id: validated.tenantId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stub.hub_group_id)

    if (groupUpdateError) {
      throw new Error(`Failed to link dinner circle: ${groupUpdateError.message}`)
    }

    // Link event to group events
    const { error: groupEventError } = await db.from('hub_group_events').insert({
      group_id: stub.hub_group_id,
      event_id: event.id,
    })

    if (groupEventError) {
      throw new Error(`Failed to link dinner circle event: ${groupEventError.message}`)
    }

    // Post system message
    try {
      await db.from('hub_messages').insert({
        group_id: stub.hub_group_id,
        author_profile_id: stub.created_by_profile_id,
        message_type: 'system',
        system_event_type: 'chef_joined',
        system_metadata: {
          chef_name: chef?.business_name ?? 'A chef',
          tenant_id: validated.tenantId,
        } as Json,
        body: `${chef?.business_name ?? 'A chef'} has joined! Let's plan this dinner.`,
      })
    } catch {
      // Non-blocking
    }
  }

  revalidatePath('/social/hub-overview')
  revalidatePath('/events')
  revalidatePath(`/events/${event.id}`)

  return { eventId: event.id }
}
