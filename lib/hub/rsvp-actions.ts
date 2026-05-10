'use server'

import { createServerClient } from '@/lib/db/server'
import { cookies } from 'next/headers'

export type RsvpStatus = 'going' | 'maybe' | 'not_going' | 'no_response'

export type RsvpSummary = {
  going: number
  maybe: number
  notGoing: number
  noResponse: number
  total: number
}

export async function updateRsvpStatus(input: {
  groupId: string
  status: RsvpStatus
}): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies()
  const profileToken = cookieStore.get('hub_profile_token')?.value
  if (!profileToken) return { success: false, error: 'Not authenticated' }

  const db: any = createServerClient({ admin: true })

  // Resolve profile
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) return { success: false, error: 'Profile not found' }

  // Update RSVP
  const { error } = await db
    .from('hub_group_members')
    .update({ rsvp_status: input.status })
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getRsvpSummary(groupId: string): Promise<RsvpSummary> {
  const db: any = createServerClient({ admin: true })

  const { data: members } = await db
    .from('hub_group_members')
    .select('rsvp_status')
    .eq('group_id', groupId)

  const statuses = (members ?? []).map((m: any) => m.rsvp_status ?? 'no_response')
  return {
    going: statuses.filter((s: string) => s === 'going').length,
    maybe: statuses.filter((s: string) => s === 'maybe').length,
    notGoing: statuses.filter((s: string) => s === 'not_going').length,
    noResponse: statuses.filter((s: string) => s === 'no_response').length,
    total: statuses.length,
  }
}

export async function getMemberRsvpStatus(
  groupId: string,
  profileToken: string
): Promise<RsvpStatus> {
  const db: any = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) return 'no_response'

  const { data: member } = await db
    .from('hub_group_members')
    .select('rsvp_status')
    .eq('group_id', groupId)
    .eq('profile_id', profile.id)
    .single()

  return (member?.rsvp_status as RsvpStatus) ?? 'no_response'
}
