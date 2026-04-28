import { createServerClient } from '@/lib/db/server'
import { getGroupEvents, getGroupMembers } from '@/lib/hub/group-actions'

export type PublicHubMemberPreview = {
  memberId: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  role: string
  joinedAt: string
  knownAllergies: string[]
  knownDietary: string[]
}

export type PublicHubEventPreview = {
  eventId: string
  occasion: string | null
  eventDate: string | null
  locationCity: string | null
  status: string | null
  href: string | null
}

export type PublicHubMemberProfile = {
  member: PublicHubMemberPreview
  group: {
    id: string
    name: string
    groupToken: string
  }
  sharedEvents: PublicHubEventPreview[]
  eventHistory: {
    eventId: string
    occasion: string | null
    eventDate: string | null
    chefName: string | null
    rsvpStatus: string | null
  }[]
}

function toMemberPreview(member: any): PublicHubMemberPreview {
  return {
    memberId: member.profile_id,
    displayName: member.profile?.display_name ?? 'Guest',
    avatarUrl: member.profile?.avatar_url ?? null,
    bio: member.profile?.bio ?? null,
    role: member.role,
    joinedAt: member.joined_at,
    knownAllergies: Array.isArray(member.profile?.known_allergies)
      ? member.profile.known_allergies
      : [],
    knownDietary: Array.isArray(member.profile?.known_dietary) ? member.profile.known_dietary : [],
  }
}

export async function getPublicGroupJoinPreview(groupId: string): Promise<{
  members: PublicHubMemberPreview[]
  events: PublicHubEventPreview[]
  memberError: string | null
  eventError: string | null
}> {
  const [membersResult, eventsResult] = await Promise.all([
    getGroupMembers(groupId)
      .then((members) => ({ members: members.map(toMemberPreview), error: null as string | null }))
      .catch((error) => {
        console.error('[hub-public] Failed to load group members:', error)
        return { members: [] as PublicHubMemberPreview[], error: 'Could not load members' }
      }),
    getPublicGroupEventPreviews(groupId)
      .then((events) => ({ events, error: null as string | null }))
      .catch((error) => {
        console.error('[hub-public] Failed to load group events:', error)
        return { events: [] as PublicHubEventPreview[], error: 'Could not load events' }
      }),
  ])

  return {
    members: membersResult.members,
    events: eventsResult.events,
    memberError: membersResult.error,
    eventError: eventsResult.error,
  }
}

export async function getPublicGroupEventPreviews(
  groupId: string
): Promise<PublicHubEventPreview[]> {
  const db: any = createServerClient({ admin: true })
  const groupEvents = await getGroupEvents(groupId)
  const eventIds = groupEvents.map((event) => event.event_id)

  if (eventIds.length === 0) return []

  const [{ data: events, error: eventError }, { data: shares }] = await Promise.all([
    db
      .from('events')
      .select('id, occasion, event_date, location_city, status')
      .in('id', eventIds)
      .is('deleted_at', null),
    db
      .from('event_share_settings')
      .select('event_id, share_token, show_date, show_location, is_active')
      .in('event_id', eventIds),
  ])

  if (eventError) throw new Error(`Failed to load linked events: ${eventError.message}`)

  const shareByEventId = new Map<
    string,
    {
      event_id: string
      share_token: string | null
      show_date: boolean | null
      show_location: boolean | null
      is_active: boolean | null
    }
  >((shares ?? []).map((share: any) => [share.event_id, share]))
  const addedAtByEventId = new Map(groupEvents.map((event) => [event.event_id, event.added_at]))

  return (events ?? [])
    .map((event: any) => {
      const share = shareByEventId.get(event.id)
      const showDate = share?.show_date !== false
      const showLocation = share?.show_location !== false
      const href =
        share?.is_active !== false && share?.share_token ? `/e/${share.share_token}` : null

      return {
        eventId: event.id,
        occasion: event.occasion,
        eventDate: showDate ? event.event_date : null,
        locationCity: showLocation ? event.location_city : null,
        status: event.status,
        href,
      } satisfies PublicHubEventPreview
    })
    .sort((a: PublicHubEventPreview, b: PublicHubEventPreview) => {
      const aDate = a.eventDate ?? addedAtByEventId.get(a.eventId) ?? ''
      const bDate = b.eventDate ?? addedAtByEventId.get(b.eventId) ?? ''
      return aDate.localeCompare(bDate)
    })
}

export async function getPublicHubMemberProfile(input: {
  memberId: string
  groupToken: string
}): Promise<PublicHubMemberProfile | null> {
  const db: any = createServerClient({ admin: true })

  const { data: group, error: groupError } = await db
    .from('hub_groups')
    .select('id, name, group_token, is_active')
    .eq('group_token', input.groupToken)
    .eq('is_active', true)
    .single()

  if (groupError || !group) return null

  const { data: membership, error: memberError } = await db
    .from('hub_group_members')
    .select(
      'profile_id, role, joined_at, hub_guest_profiles(display_name, avatar_url, bio, known_allergies, known_dietary)'
    )
    .eq('group_id', group.id)
    .eq('profile_id', input.memberId)
    .single()

  if (memberError || !membership) return null

  const sharedEvents = await getPublicGroupEventPreviews(group.id)
  const sharedEventIds = sharedEvents.map((event) => event.eventId)
  let eventHistory: PublicHubMemberProfile['eventHistory'] = []

  if (sharedEventIds.length > 0) {
    const { data, error } = await db
      .from('hub_guest_event_history')
      .select('event_id, event_date, occasion, chef_name, rsvp_status')
      .eq('profile_id', input.memberId)
      .in('event_id', sharedEventIds)
      .order('event_date', { ascending: false, nullsFirst: false })

    if (error) throw new Error(`Failed to load member event history: ${error.message}`)

    eventHistory = (data ?? []).map((event: any) => ({
      eventId: event.event_id,
      occasion: event.occasion,
      eventDate: event.event_date,
      chefName: event.chef_name,
      rsvpStatus: event.rsvp_status,
    }))
  }

  return {
    member: toMemberPreview({
      ...membership,
      profile: (membership as any).hub_guest_profiles,
    }),
    group: {
      id: group.id,
      name: group.name,
      groupToken: group.group_token,
    },
    sharedEvents,
    eventHistory,
  }
}
