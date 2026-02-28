'use server'

import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { EventStub } from '@/lib/hub/types'

// ---------------------------------------------------------------------------
// Event Stubs — Client-initiated events (pre-chef)
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
  const supabase = createServerClient({ admin: true })

  // Resolve profile
  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id, display_name')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  // Create stub
  const { data: stub, error } = await supabase
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
    const { data: group } = await supabase
      .from('hub_groups')
      .insert({
        name: validated.title,
        event_stub_id: stub.id,
        created_by_profile_id: profile.id,
        emoji: '🍽️',
      })
      .select('id')
      .single()

    if (group) {
      // Link stub to group
      await supabase.from('event_stubs').update({ hub_group_id: group.id }).eq('id', stub.id)

      // Add creator as owner of the group
      await supabase.from('hub_group_members').insert({
        group_id: group.id,
        profile_id: profile.id,
        role: 'owner',
        can_post: true,
        can_invite: true,
        can_pin: true,
      })

      // Post system message
      await supabase.from('hub_messages').insert({
        group_id: group.id,
        author_profile_id: profile.id,
        message_type: 'system',
        system_event_type: 'event_planning_started',
        system_metadata: {
          title: validated.title,
          creator_name: profile.display_name,
        },
      })

      stub.hub_group_id = group.id
    }
  }

  return stub as EventStub
}

/**
 * Get an event stub by ID.
 */
export async function getEventStub(stubId: string): Promise<EventStub | null> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase.from('event_stubs').select('*').eq('id', stubId).single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load event stub: ${error.message}`)
  }
  return (data as EventStub) ?? null
}

/**
 * Get all event stubs created by a profile.
 */
export async function getProfileEventStubs(profileToken: string): Promise<EventStub[]> {
  const supabase = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data, error } = await supabase
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

/**
 * Update an event stub. Only the creator can update.
 */
export async function updateEventStub(input: z.infer<typeof UpdateStubSchema>): Promise<EventStub> {
  const validated = UpdateStubSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  // Verify ownership
  const { data: stub } = await supabase
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
  const { data, error } = await supabase
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
  const supabase = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: stub } = await supabase
    .from('event_stubs')
    .select('created_by_profile_id, status, hub_group_id')
    .eq('id', input.stubId)
    .single()

  if (!stub) throw new Error('Event stub not found')
  if (stub.created_by_profile_id !== profile.id) {
    throw new Error('Only the creator can seek a chef')
  }

  await supabase
    .from('event_stubs')
    .update({ status: 'seeking_chef', updated_at: new Date().toISOString() })
    .eq('id', input.stubId)

  // Post system message if group exists
  if (stub.hub_group_id) {
    try {
      await supabase.from('hub_messages').insert({
        group_id: stub.hub_group_id,
        author_profile_id: profile.id,
        message_type: 'system',
        system_event_type: 'seeking_chef',
        system_metadata: {},
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
  const supabase = createServerClient({ admin: true })

  // Get stub
  const { data: stub } = await supabase
    .from('event_stubs')
    .select('*')
    .eq('id', input.stubId)
    .single()

  if (!stub) throw new Error('Event stub not found')
  if (stub.status === 'adopted') throw new Error('Stub already adopted')

  // Get chef name for system message
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name')
    .eq('id', input.tenantId)
    .single()

  // Create a real event from stub data
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      tenant_id: input.tenantId,
      occasion: stub.occasion ?? stub.title,
      event_date: stub.event_date,
      serve_time: stub.serve_time,
      guest_count: stub.guest_count,
      location_address: stub.location_text,
      special_requests: stub.notes,
      status: 'draft',
    })
    .select('id')
    .single()

  if (eventError) throw new Error(`Failed to create event: ${eventError.message}`)

  // Update stub with adoption info
  await supabase
    .from('event_stubs')
    .update({
      adopted_event_id: event.id,
      adopted_tenant_id: input.tenantId,
      adopted_at: new Date().toISOString(),
      status: 'adopted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.stubId)

  // If there's a hub group, link it to the real event and add chef
  if (stub.hub_group_id) {
    await supabase
      .from('hub_groups')
      .update({
        event_id: event.id,
        tenant_id: input.tenantId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stub.hub_group_id)

    // Link event to group events
    await supabase.from('hub_group_events').insert({
      group_id: stub.hub_group_id,
      event_id: event.id,
    })

    // Post system message
    try {
      await supabase.from('hub_messages').insert({
        group_id: stub.hub_group_id,
        author_profile_id: stub.created_by_profile_id,
        message_type: 'system',
        system_event_type: 'chef_joined',
        system_metadata: {
          chef_name: chef?.business_name ?? 'A chef',
          tenant_id: input.tenantId,
        },
        body: `${chef?.business_name ?? 'A chef'} has joined! Let's plan this dinner.`,
      })
    } catch {
      // Non-blocking
    }
  }

  return { eventId: event.id }
}
