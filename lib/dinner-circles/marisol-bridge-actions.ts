'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  CircleSchedulingContext,
  CircleSuggestion,
  CircleCoordinationOverview,
  CircleCoordinationEntry,
  CircleDietaryBrief,
  CircleMemberProfile,
  CirclePastEvent,
} from './marisol-bridge-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEASONS: Record<string, string[]> = {
  spring: ['March', 'April', 'May'],
  summer: ['June', 'July', 'August'],
  fall: ['September', 'October', 'November'],
  winter: ['December', 'January', 'February'],
}

function getSeason(date: Date): string {
  const month = date.toLocaleString('en-US', { month: 'long' })
  for (const [season, months] of Object.entries(SEASONS)) {
    if (months.includes(month)) return season
  }
  return 'unknown'
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)))
}

function computeAverageFrequency(dates: string[]): number | null {
  if (dates.length < 2) return null
  const sorted = dates
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b)
  let totalGap = 0
  for (let i = 1; i < sorted.length; i++) {
    totalGap += sorted[i] - sorted[i - 1]
  }
  return Math.round(totalGap / ((sorted.length - 1) * 1000 * 60 * 60 * 24))
}

async function fetchCircleEvents(
  db: any,
  circleId: string,
  tenantId: string
): Promise<any[]> {
  // Events linked via hub_groups.event_id
  const { data: directEvents } = await db
    .from('events')
    .select('id, event_date, status, guest_count, menu_id')
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .in('id', db.from('hub_groups').select('event_id').eq('id', circleId))
    .order('event_date', { ascending: false })

  // Events linked via event_shares.hub_group_id
  const { data: shareLinkedEvents } = await db
    .from('events')
    .select('id, event_date, status, guest_count, menu_id')
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .in(
      'id',
      db.from('event_shares').select('event_id').eq('hub_group_id', circleId)
    )

  // Deduplicate
  const map = new Map<string, any>()
  for (const e of directEvents ?? []) map.set(e.id, e)
  for (const e of shareLinkedEvents ?? []) map.set(e.id, e)
  return Array.from(map.values())
}

function buildDietaryBrief(members: CircleMemberProfile[]): CircleDietaryBrief {
  const allergyCounts: Record<string, number> = {}
  const restrictionCounts: Record<string, number> = {}
  let withData = 0

  for (const m of members) {
    const hasData = m.allergies.length > 0 || m.dietaryRestrictions.length > 0
    if (hasData) withData++

    for (const a of m.allergies) {
      const key = a.toLowerCase().trim()
      if (key) allergyCounts[key] = (allergyCounts[key] ?? 0) + 1
    }
    for (const r of m.dietaryRestrictions) {
      const key = r.toLowerCase().trim()
      if (key) restrictionCounts[key] = (restrictionCounts[key] ?? 0) + 1
    }
  }

  // Safe assumptions: things nobody is allergic to or restricted from
  const safeAssumptions: string[] = []
  if (!allergyCounts['dairy'] && !restrictionCounts['dairy-free']) {
    safeAssumptions.push('dairy is safe for all members')
  }
  if (!allergyCounts['gluten'] && !restrictionCounts['gluten-free'] && !restrictionCounts['celiac']) {
    safeAssumptions.push('gluten is safe for all members')
  }
  if (!allergyCounts['nuts'] && !allergyCounts['tree nuts'] && !allergyCounts['peanuts']) {
    safeAssumptions.push('nuts are safe for all members')
  }

  return {
    totalMembers: members.length,
    membersWithData: withData,
    allergySummary: allergyCounts,
    restrictionSummary: restrictionCounts,
    safeAssumptions,
  }
}

// ---------------------------------------------------------------------------
// getCircleSchedulingContext
// ---------------------------------------------------------------------------

/**
 * Assemble full scheduling context for a circle: members with dietary needs,
 * past event history, collaborator roles, and frequency patterns.
 */
export async function getCircleSchedulingContext(
  circleId: string
): Promise<CircleSchedulingContext | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Verify ownership
  const { data: circle } = await db
    .from('hub_groups')
    .select('id, name')
    .eq('id', circleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!circle) return null

  // Parallel: members, collaborators, events
  const [membersResult, collabResult, allEvents] = await Promise.all([
    db
      .from('hub_group_members')
      .select('profile_id')
      .eq('group_id', circleId),
    db
      .from('circle_collaborators')
      .select('user_id, role')
      .eq('circle_id', circleId)
      .eq('status', 'active'),
    fetchCircleEvents(db, circleId, tenantId),
  ])

  const memberRows = membersResult.data ?? []
  const collabRows = collabResult.data ?? []

  // Build member profiles with dietary data from event_guests
  const eventIds = allEvents.map((e: any) => e.id)
  let guestDietaryMap = new Map<string, { restrictions: string[]; allergies: string[] }>()

  if (eventIds.length > 0) {
    try {
      const { data: guests } = await db
        .from('event_guests')
        .select('profile_id, dietary_restrictions, allergies')
        .in('event_id', eventIds)

      for (const g of guests ?? []) {
        if (!g.profile_id) continue
        const existing = guestDietaryMap.get(g.profile_id)
        const restrictions = g.dietary_restrictions ?? []
        const allergies = g.allergies ?? []
        if (!existing) {
          guestDietaryMap.set(g.profile_id, { restrictions, allergies })
        } else {
          // Merge (latest wins for simplicity, or union)
          const mergedR = [...new Set([...existing.restrictions, ...restrictions])]
          const mergedA = [...new Set([...existing.allergies, ...allergies])]
          guestDietaryMap.set(g.profile_id, { restrictions: mergedR, allergies: mergedA })
        }
      }
    } catch {
      // Non-blocking: dietary data is supplemental
    }
  }

  const members: CircleMemberProfile[] = memberRows.map((m: any) => {
    const dietary = guestDietaryMap.get(m.profile_id)
    return {
      profileId: m.profile_id,
      displayName: null, // profile_id only; caller can enrich
      email: null,
      role: 'owner' as const,
      dietaryRestrictions: dietary?.restrictions ?? [],
      allergies: dietary?.allergies ?? [],
    }
  })

  // Enrich collaborator display names
  const collabUserIds = collabRows.map((c: any) => c.user_id)
  let collabNameMap = new Map<string, string | null>()
  if (collabUserIds.length > 0) {
    try {
      const { data: chefs } = await db
        .from('chefs')
        .select('auth_user_id, display_name')
        .in('auth_user_id', collabUserIds)
      for (const c of chefs ?? []) {
        collabNameMap.set(c.auth_user_id, c.display_name)
      }
    } catch {
      // Non-blocking
    }
  }

  const collaborators = collabRows.map((c: any) => ({
    userId: c.user_id,
    displayName: collabNameMap.get(c.user_id) ?? null,
    role: c.role,
  }))

  // Build past events with menu names
  const menuIds = allEvents
    .filter((e: any) => e.menu_id)
    .map((e: any) => e.menu_id)
  let menuNameMap = new Map<string, string>()
  if (menuIds.length > 0) {
    try {
      const { data: menus } = await db
        .from('menus')
        .select('id, name')
        .in('id', menuIds)
      for (const m of menus ?? []) {
        menuNameMap.set(m.id, m.name)
      }
    } catch {
      // Non-blocking
    }
  }

  const pastEvents: CirclePastEvent[] = allEvents
    .filter((e: any) => e.event_date)
    .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
    .map((e: any) => ({
      eventId: e.id,
      eventDate: e.event_date,
      menuName: e.menu_id ? (menuNameMap.get(e.menu_id) ?? null) : null,
      guestCount: e.guest_count ?? 0,
      status: e.status,
    }))

  const eventDates = pastEvents.map((e) => e.eventDate)
  const averageFrequencyDays = computeAverageFrequency(eventDates)

  const completedOrPast = pastEvents.filter(
    (e) => e.status === 'completed' || new Date(e.eventDate) < new Date()
  )
  const upcoming = pastEvents.filter(
    (e) =>
      !['completed', 'cancelled'].includes(e.status) &&
      new Date(e.eventDate) >= new Date()
  )

  return {
    circleId,
    circleName: circle.name,
    members,
    dietaryBrief: buildDietaryBrief(members),
    pastEvents,
    collaborators,
    averageFrequencyDays,
    lastEventDate: completedOrPast[0]?.eventDate ?? null,
    nextScheduledDate: upcoming.length > 0
      ? upcoming.sort(
          (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
        )[0].eventDate
      : null,
  }
}

// ---------------------------------------------------------------------------
// suggestNextCircleEvent
// ---------------------------------------------------------------------------

/**
 * Based on circle history: suggest next date (using frequency pattern),
 * menu direction (avoid repeats), seasonal considerations.
 */
export async function suggestNextCircleEvent(
  circleId: string
): Promise<CircleSuggestion | null> {
  const ctx = await getCircleSchedulingContext(circleId)
  if (!ctx) return null

  const now = new Date()
  const currentSeason = getSeason(now)

  // Suggest date based on frequency
  let suggestedDate: string | null = null
  let reasoning: string

  if (ctx.nextScheduledDate) {
    reasoning = `An event is already scheduled for ${ctx.nextScheduledDate}.`
    suggestedDate = null
  } else if (ctx.averageFrequencyDays && ctx.lastEventDate) {
    const lastDate = new Date(ctx.lastEventDate)
    const nextDate = new Date(lastDate.getTime() + ctx.averageFrequencyDays * 24 * 60 * 60 * 1000)
    // If the calculated date is in the past, push to next week
    if (nextDate < now) {
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      suggestedDate = nextWeek.toISOString().split('T')[0]
      reasoning = `This circle meets roughly every ${ctx.averageFrequencyDays} days. ` +
        `The last event was ${ctx.lastEventDate}, so scheduling is overdue.`
    } else {
      suggestedDate = nextDate.toISOString().split('T')[0]
      reasoning = `This circle meets roughly every ${ctx.averageFrequencyDays} days. ` +
        `Based on the last event (${ctx.lastEventDate}), the next one falls around this date.`
    }
  } else if (ctx.lastEventDate) {
    // Only one past event; suggest 30 days later or next week if overdue
    const lastDate = new Date(ctx.lastEventDate)
    const thirtyOut = new Date(lastDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    if (thirtyOut < now) {
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      suggestedDate = nextWeek.toISOString().split('T')[0]
      reasoning = 'Only one past event on record. Suggesting next week since it has been a while.'
    } else {
      suggestedDate = thirtyOut.toISOString().split('T')[0]
      reasoning = 'Only one past event on record. Suggesting roughly 30 days after the last one.'
    }
  } else {
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    suggestedDate = twoWeeks.toISOString().split('T')[0]
    reasoning = 'No past events. Suggesting two weeks out to allow planning time.'
  }

  // Menu direction: avoid repeats from recent events
  const recentMenuNames = ctx.pastEvents
    .slice(0, 5)
    .map((e) => e.menuName)
    .filter(Boolean) as string[]

  const menuDirection = recentMenuNames.length > 0
    ? `Recent menus include: ${recentMenuNames.join(', ')}. Consider a different direction.`
    : 'No past menu data on record. Start fresh with any direction.'

  // Seasonal notes
  const seasonalNotes: string[] = []
  if (currentSeason === 'summer') {
    seasonalNotes.push('Peak produce season; great for farm-to-table or grilling menus.')
  } else if (currentSeason === 'fall') {
    seasonalNotes.push('Root vegetables, squash, and game are in season.')
  } else if (currentSeason === 'winter') {
    seasonalNotes.push('Hearty, warming dishes. Braised meats, soups, and citrus are strong.')
  } else if (currentSeason === 'spring') {
    seasonalNotes.push('Light, bright flavors. Asparagus, peas, ramps, and lamb are seasonal standouts.')
  }

  // Dietary reminders from the brief
  const dietaryReminders: string[] = []
  const brief = ctx.dietaryBrief
  for (const [allergy, count] of Object.entries(brief.allergySummary)) {
    dietaryReminders.push(`${count} member(s) allergic to ${allergy}`)
  }
  for (const [restriction, count] of Object.entries(brief.restrictionSummary)) {
    dietaryReminders.push(`${count} member(s) require ${restriction}`)
  }
  if (brief.membersWithData === 0 && brief.totalMembers > 0) {
    dietaryReminders.push('No dietary data on file for any members. Consider collecting it.')
  }

  return {
    suggestedDate,
    reasoning,
    menuDirection,
    avoidRepeats: recentMenuNames,
    seasonalNotes,
    dietaryReminders,
  }
}

// ---------------------------------------------------------------------------
// getCircleCoordinationOverview
// ---------------------------------------------------------------------------

/**
 * All circles with upcoming events, overdue scheduling, and member changes.
 * This is the "at a glance" view for Marisol coordination.
 */
export async function getCircleCoordinationOverview(): Promise<CircleCoordinationOverview> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: allCircles } = await db
    .from('hub_groups')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (!allCircles || allCircles.length === 0) {
    return { circles: [], overdueCount: 0, totalUpcoming: 0 }
  }

  const now = new Date()
  const entries: CircleCoordinationEntry[] = []

  // Process circles in parallel (batch of all)
  const results = await Promise.all(
    allCircles.map(async (circle: any) => {
      try {
        const [eventsData, membersResult, collabResult] = await Promise.all([
          fetchCircleEvents(db, circle.id, tenantId),
          db
            .from('hub_group_members')
            .select('profile_id, created_at')
            .eq('group_id', circle.id),
          db
            .from('circle_collaborators')
            .select('id')
            .eq('circle_id', circle.id)
            .eq('status', 'active'),
        ])

        const events = eventsData ?? []
        const members = membersResult.data ?? []

        const eventDates = events
          .filter((e: any) => e.event_date)
          .map((e: any) => e.event_date)

        const sortedDesc = eventDates
          .map((d: string) => new Date(d))
          .sort((a: Date, b: Date) => b.getTime() - a.getTime())

        const completedOrPast = events.filter(
          (e: any) => e.status === 'completed' || (e.event_date && new Date(e.event_date) < now)
        )
        const upcoming = events.filter(
          (e: any) =>
            !['completed', 'cancelled'].includes(e.status) &&
            e.event_date &&
            new Date(e.event_date) >= now
        )

        const lastEventDate = completedOrPast.length > 0
          ? completedOrPast.sort(
              (a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
            )[0].event_date
          : null

        const upcomingEventDate = upcoming.length > 0
          ? upcoming.sort(
              (a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
            )[0].event_date
          : null

        const avgFreq = computeAverageFrequency(eventDates)

        const daysSinceLast = lastEventDate
          ? daysBetween(now, new Date(lastEventDate))
          : null

        const overdueForScheduling =
          !upcomingEventDate &&
          avgFreq !== null &&
          daysSinceLast !== null &&
          daysSinceLast > avgFreq

        // Count members added after the last event
        let membersChangedSinceLastEvent = 0
        if (lastEventDate) {
          const lastDate = new Date(lastEventDate)
          membersChangedSinceLastEvent = members.filter(
            (m: any) => m.created_at && new Date(m.created_at) > lastDate
          ).length
        }

        return {
          circleId: circle.id,
          circleName: circle.name,
          memberCount: members.length + (collabResult.data?.length ?? 0),
          upcomingEventDate,
          lastEventDate,
          averageFrequencyDays: avgFreq,
          daysSinceLastEvent: daysSinceLast,
          overdueForScheduling: overdueForScheduling || false,
          membersChangedSinceLastEvent,
        } satisfies CircleCoordinationEntry
      } catch {
        return null
      }
    })
  )

  for (const entry of results) {
    if (entry) entries.push(entry)
  }

  return {
    circles: entries,
    overdueCount: entries.filter((e) => e.overdueForScheduling).length,
    totalUpcoming: entries.filter((e) => e.upcomingEventDate).length,
  }
}

// ---------------------------------------------------------------------------
// getCircleDietaryBrief
// ---------------------------------------------------------------------------

/**
 * Aggregated dietary needs across all circle members for menu planning.
 */
export async function getCircleDietaryBrief(
  circleId: string
): Promise<CircleDietaryBrief | null> {
  const ctx = await getCircleSchedulingContext(circleId)
  if (!ctx) return null
  return ctx.dietaryBrief
}
