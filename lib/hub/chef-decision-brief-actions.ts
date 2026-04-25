'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

export type ChefDecisionBrief = {
  eventId: string
  circleId: string | null
  circleName: string | null
  guestCount: number
  confirmedCount: number
  dietarySummary: {
    allergies: string[]
    restrictions: string[]
    guestsWithRestrictions: number
    guestsNoData: number
  }
  menuDecisions: {
    courseName: string
    courseNumber: number
    lockedDish: string | null
    voteCount: number
    topChoice: string | null
  }[]
  lastCircleActivity: string | null
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item ?? '').trim()).filter(Boolean)
}

export async function getChefDecisionBrief(
  eventId: string,
  tenantId: string
): Promise<ChefDecisionBrief | null> {
  try {
    const chef = await requireChef()
    if (chef.tenantId !== tenantId) return null

    const db: any = createServerClient({ admin: true })

    const { data: linkedCircle, error: linkError } = await db
      .from('hub_group_events')
      .select('group_id')
      .eq('event_id', eventId)
      .single()

    if (linkError || !linkedCircle?.group_id) return null

    const groupId = linkedCircle.group_id

    const { data: circle, error: circleError } = await db
      .from('hub_groups')
      .select('id, name')
      .eq('id', groupId)
      .single()

    if (circleError || !circle) return null

    const { data: members, error: membersError } = await db
      .from('hub_group_members')
      .select('profile_id')
      .eq('group_id', groupId)

    if (membersError) throw new Error(membersError.message)

    const allergies = new Set<string>()
    const restrictions = new Set<string>()
    let guestsWithRestrictions = 0
    let guestsNoData = 0

    for (const member of members ?? []) {
      const { data: profile, error: profileError } = await db
        .from('hub_guest_profiles')
        .select('known_allergies, known_dietary')
        .eq('id', member.profile_id)
        .single()

      if (profileError || !profile) {
        guestsNoData++
        continue
      }

      const profileAllergies = toStringArray(profile.known_allergies)
      const profileRestrictions = toStringArray(profile.known_dietary)

      for (const allergy of profileAllergies) allergies.add(allergy)
      for (const restriction of profileRestrictions) restrictions.add(restriction)

      if (profileAllergies.length > 0 || profileRestrictions.length > 0) {
        guestsWithRestrictions++
      } else {
        guestsNoData++
      }
    }

    const { data: confirmedGuests, error: confirmedError } = await db
      .from('event_guests')
      .select('id')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .eq('rsvp_status', 'attending')

    if (confirmedError) throw new Error(confirmedError.message)

    const { data: polls, error: pollsError } = await db
      .from('hub_polls')
      .select('id, course_name, course_number, locked_option_id, poll_scope')
      .eq('event_id', eventId)
      .eq('group_id', groupId)
      .order('course_number', { ascending: true })

    if (pollsError) throw new Error(pollsError.message)

    const menuDecisions: ChefDecisionBrief['menuDecisions'] = []

    for (const poll of polls ?? []) {
      const { data: votes, error: votesError } = await db
        .from('hub_poll_votes')
        .select('id, option_id')
        .eq('poll_id', poll.id)

      if (votesError) throw new Error(votesError.message)

      let lockedDish: string | null = null
      let topChoice: string | null = null
      const voteCount = votes?.length ?? 0

      if (poll.locked_option_id) {
        const { data: lockedOption, error: lockedOptionError } = await db
          .from('hub_poll_options')
          .select('label')
          .eq('id', poll.locked_option_id)
          .single()

        if (lockedOptionError) throw new Error(lockedOptionError.message)
        lockedDish = lockedOption?.label ?? null
      } else if (voteCount > 0) {
        const voteCounts = new Map<string, number>()
        for (const vote of votes ?? []) {
          if (!vote.option_id) continue
          voteCounts.set(vote.option_id, (voteCounts.get(vote.option_id) ?? 0) + 1)
        }

        let leadingOptionId: string | null = null
        let leadingVotes = 0
        for (const [optionId, count] of voteCounts.entries()) {
          if (count > leadingVotes) {
            leadingOptionId = optionId
            leadingVotes = count
          }
        }

        if (leadingOptionId) {
          const { data: leadingOption, error: leadingOptionError } = await db
            .from('hub_poll_options')
            .select('label')
            .eq('id', leadingOptionId)
            .single()

          if (leadingOptionError) throw new Error(leadingOptionError.message)
          topChoice = leadingOption?.label ?? null
        }
      }

      menuDecisions.push({
        courseName: poll.course_name ?? 'Course',
        courseNumber: poll.course_number ?? menuDecisions.length + 1,
        lockedDish,
        voteCount,
        topChoice,
      })
    }

    const { data: lastActivity, error: lastActivityError } = await db
      .from('hub_group_members')
      .select('last_read_at')
      .eq('group_id', groupId)
      .order('last_read_at', { ascending: false })
      .limit(1)
      .single()

    if (lastActivityError) throw new Error(lastActivityError.message)

    return {
      eventId,
      circleId: circle.id,
      circleName: circle.name,
      guestCount: members?.length ?? 0,
      confirmedCount: confirmedGuests?.length ?? 0,
      dietarySummary: {
        allergies: [...allergies].sort(),
        restrictions: [...restrictions].sort(),
        guestsWithRestrictions,
        guestsNoData,
      },
      menuDecisions,
      lastCircleActivity: lastActivity?.last_read_at ?? null,
    }
  } catch {
    return null
  }
}
