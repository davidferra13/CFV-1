'use server'

import { createServerClient } from '@/lib/db/server'

export type GuestCompletionRow = {
  profileId: string
  displayName: string
  avatarUrl: string | null
  joinedAt: string
  dietary: 'complete' | 'empty' | 'partial'
  rsvp: 'confirmed' | 'maybe' | 'declined' | 'pending'
  menuVoted: boolean
  lastActive: string | null
}

export type CompletionSummary = {
  total: number
  dietaryComplete: number
  rsvpConfirmed: number
  menuVoted: number
  guests: GuestCompletionRow[]
}

const EMPTY_SUMMARY: CompletionSummary = {
  total: 0,
  dietaryComplete: 0,
  rsvpConfirmed: 0,
  menuVoted: 0,
  guests: [],
}

function hasContent(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => String(item ?? '').trim().length > 0)
  }
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  return value !== null && value !== undefined
}

function getDietaryStatus(input: {
  known_allergies: unknown
  known_dietary: unknown
}): GuestCompletionRow['dietary'] {
  if (hasContent(input.known_allergies) || hasContent(input.known_dietary)) {
    return 'complete'
  }
  if (input.known_allergies == null && input.known_dietary == null) {
    return 'empty'
  }
  return 'partial'
}

function getRsvpStatus(
  rows: Array<{ status: string | null | undefined }>
): GuestCompletionRow['rsvp'] {
  const statuses = rows.map((row) => row.status)
  if (statuses.includes('in') || statuses.includes('confirmed') || statuses.includes('attending')) {
    return 'confirmed'
  }
  if (statuses.includes('maybe')) {
    return 'maybe'
  }
  if (statuses.includes('out') || statuses.includes('declined')) {
    return 'declined'
  }
  return 'pending'
}

function sortScore(guest: GuestCompletionRow): number {
  let score = 0
  if (guest.dietary === 'empty') score += 100
  if (guest.rsvp === 'pending') score += 100
  if (!guest.menuVoted) score += 100
  if (guest.dietary === 'partial') score += 10
  if (guest.rsvp === 'maybe' || guest.rsvp === 'declined') score += 10
  return score
}

export async function getGuestCompletionStatus(
  groupId: string,
  groupToken: string,
  eventId?: string | null
): Promise<CompletionSummary> {
  try {
    const db: any = createServerClient({ admin: true })

    const { data: group, error: groupError } = await db
      .from('hub_groups')
      .select('id')
      .eq('id', groupId)
      .eq('group_token', groupToken)
      .single()

    if (groupError || !group) {
      throw new Error('Circle not found')
    }

    const { data: members, error: membersError } = await db
      .from('hub_group_members')
      .select('id, profile_id, role, joined_at, last_read_at')
      .eq('group_id', groupId)

    if (membersError) {
      throw new Error(membersError.message)
    }

    const scopedPollIds = new Set<string>()
    const groupMealEntryIds = new Set<string>()

    if (eventId) {
      const { data: polls, error: pollsError } = await db
        .from('hub_polls')
        .select('id')
        .eq('event_id', eventId)
        .eq('group_id', groupId)

      if (pollsError) {
        throw new Error(pollsError.message)
      }

      for (const poll of polls ?? []) {
        scopedPollIds.add(poll.id)
      }

      const { data: mealEntries, error: mealEntriesError } = await db
        .from('hub_meal_board')
        .select('id')
        .eq('group_id', groupId)

      if (mealEntriesError) {
        throw new Error(mealEntriesError.message)
      }

      for (const mealEntry of mealEntries ?? []) {
        groupMealEntryIds.add(mealEntry.id)
      }
    }

    const guests: GuestCompletionRow[] = []

    for (const member of members ?? []) {
      const { data: profile, error: profileError } = await db
        .from('hub_guest_profiles')
        .select('id, display_name, avatar_url, known_allergies, known_dietary')
        .eq('id', member.profile_id)
        .single()

      if (profileError || !profile) {
        continue
      }

      let menuVoted = false
      if (eventId && scopedPollIds.size > 0) {
        const { data: votes, error: votesError } = await db
          .from('hub_poll_votes')
          .select('profile_id, poll_id')
          .eq('profile_id', member.profile_id)

        if (votesError) {
          throw new Error(votesError.message)
        }

        menuVoted = (votes ?? []).some((vote: any) => scopedPollIds.has(vote.poll_id))
      }

      let rsvp: GuestCompletionRow['rsvp'] = 'pending'
      if (eventId && groupMealEntryIds.size > 0) {
        const { data: householdMembers, error: householdMembersError } = await db
          .from('hub_household_members')
          .select('id')
          .eq('profile_id', member.profile_id)

        if (householdMembersError) {
          throw new Error(householdMembersError.message)
        }

        const attendanceRows: Array<{ status: string | null | undefined }> = []

        for (const householdMember of householdMembers ?? []) {
          const { data: attendance, error: attendanceError } = await db
            .from('hub_meal_attendance')
            .select('status, meal_entry_id')
            .eq('household_member_id', householdMember.id)

          if (attendanceError) {
            throw new Error(attendanceError.message)
          }

          for (const row of attendance ?? []) {
            if (groupMealEntryIds.has(row.meal_entry_id)) {
              attendanceRows.push(row)
            }
          }
        }

        rsvp = getRsvpStatus(attendanceRows)
      }

      guests.push({
        profileId: profile.id,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url ?? null,
        joinedAt: member.joined_at,
        dietary: getDietaryStatus(profile),
        rsvp,
        menuVoted,
        lastActive: member.last_read_at ?? null,
      })
    }

    guests.sort((left, right) => {
      const scoreDiff = sortScore(right) - sortScore(left)
      if (scoreDiff !== 0) return scoreDiff
      return left.displayName.localeCompare(right.displayName)
    })

    return {
      total: guests.length,
      dietaryComplete: guests.filter((guest) => guest.dietary === 'complete').length,
      rsvpConfirmed: guests.filter((guest) => guest.rsvp === 'confirmed').length,
      menuVoted: guests.filter((guest) => guest.menuVoted).length,
      guests,
    }
  } catch {
    return EMPTY_SUMMARY
  }
}
