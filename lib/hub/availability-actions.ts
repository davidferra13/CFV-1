'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import { dateToDateString } from '@/lib/utils/format'

// ---------------------------------------------------------------------------
// Hub Availability Scheduling
// ---------------------------------------------------------------------------

export interface HubAvailability {
  id: string
  group_id: string
  created_by_profile_id: string
  title: string
  description: string | null
  date_range_start: string
  date_range_end: string
  is_closed: boolean
  created_at: string
  created_by?: { display_name: string } | null
  responses?: HubAvailabilityResponse[]
}

export interface HubAvailabilityResponse {
  id: string
  availability_id: string
  profile_id: string
  response_date: string
  status: 'available' | 'maybe' | 'unavailable'
  created_at: string
  profile?: { display_name: string; avatar_url: string | null } | null
}

const CreateAvailabilitySchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  dateRangeStart: z.string(),
  dateRangeEnd: z.string(),
})

/**
 * Create an availability poll for a group.
 */
export async function createAvailability(
  input: z.infer<typeof CreateAvailabilitySchema>
): Promise<HubAvailability> {
  const validated = CreateAvailabilitySchema.parse(input)
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  // Verify membership
  const { data: membership } = await db
    .from('hub_group_members')
    .select('can_post')
    .eq('group_id', validated.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership || !membership.can_post) {
    throw new Error('No permission to create availability polls')
  }

  const { data, error } = await db
    .from('hub_availability')
    .insert({
      group_id: validated.groupId,
      created_by_profile_id: profile.id,
      title: validated.title,
      description: validated.description ?? null,
      date_range_start: validated.dateRangeStart,
      date_range_end: validated.dateRangeEnd,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create availability: ${error.message}`)

  // Post system message
  try {
    await db.from('hub_messages').insert({
      group_id: validated.groupId,
      author_profile_id: profile.id,
      message_type: 'system',
      system_event_type: 'availability_created',
      system_metadata: { title: validated.title },
    })
  } catch {
    // Non-blocking
  }

  return data as HubAvailability
}

/**
 * Get all availability polls for a group.
 */
export async function getGroupAvailability(groupId: string): Promise<HubAvailability[]> {
  const db = createServerClient({ admin: true })

  const { data, error } = await db
    .from('hub_availability')
    .select('*, hub_guest_profiles!created_by_profile_id(display_name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load availability: ${error.message}`)

  return (data ?? []).map((a: any) => ({
    ...a,
    date_range_start: dateToDateString(a.date_range_start as Date | string),
    date_range_end: dateToDateString(a.date_range_end as Date | string),
    created_by: a.hub_guest_profiles ?? null,
    hub_guest_profiles: undefined,
  })) as HubAvailability[]
}

/**
 * Get a single availability poll with all responses.
 */
export async function getAvailabilityWithResponses(
  availabilityId: string
): Promise<HubAvailability | null> {
  const db = createServerClient({ admin: true })

  const { data: avail, error } = await db
    .from('hub_availability')
    .select('*, hub_guest_profiles!created_by_profile_id(display_name)')
    .eq('id', availabilityId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load availability: ${error.message}`)
  }
  if (!avail) return null

  // Get responses
  const { data: responses } = await db
    .from('hub_availability_responses')
    .select('*, hub_guest_profiles!profile_id(display_name, avatar_url)')
    .eq('availability_id', availabilityId)
    .order('response_date', { ascending: true })

  const mappedResponses = (responses ?? []).map((r: any) => ({
    ...r,
    profile: r.hub_guest_profiles ?? null,
    hub_guest_profiles: undefined,
  })) as HubAvailabilityResponse[]

  return {
    ...avail,
    date_range_start: dateToDateString(avail.date_range_start as Date | string),
    date_range_end: dateToDateString(avail.date_range_end as Date | string),
    created_by: avail.hub_guest_profiles ?? null,
    hub_guest_profiles: undefined,
    responses: mappedResponses,
  } as HubAvailability
}

/**
 * Set availability response for a specific date.
 */
export async function setAvailabilityResponse(input: {
  availabilityId: string
  profileToken: string
  responseDate: string
  status: 'available' | 'maybe' | 'unavailable'
}): Promise<void> {
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  // Upsert response
  const { error } = await db.from('hub_availability_responses').upsert(
    {
      availability_id: input.availabilityId,
      profile_id: profile.id,
      response_date: input.responseDate,
      status: input.status,
    },
    { onConflict: 'availability_id,profile_id,response_date' }
  )

  if (error) throw new Error(`Failed to set response: ${error.message}`)
}

/**
 * Close an availability poll.
 */
export async function closeAvailability(input: {
  availabilityId: string
  profileToken: string
}): Promise<void> {
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  // Check permission (creator or admin)
  const { data: avail } = await db
    .from('hub_availability')
    .select('group_id, created_by_profile_id')
    .eq('id', input.availabilityId)
    .single()

  if (!avail) throw new Error('Availability not found')

  const isCreator = avail.created_by_profile_id === profile.id
  if (!isCreator) {
    const { data: membership } = await db
      .from('hub_group_members')
      .select('role')
      .eq('group_id', avail.group_id)
      .eq('profile_id', profile.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Only the creator or admins can close this')
    }
  }

  await db.from('hub_availability').update({ is_closed: true }).eq('id', input.availabilityId)
}
