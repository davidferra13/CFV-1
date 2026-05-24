import { createServerClient } from '@/lib/db/server'

const ACTIVE_STATUSES = ['accepted', 'paid', 'confirmed', 'in_progress']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function refreshActivitySnapshot(chefId: string) {
  const db: any = createServerClient({ admin: true })

  // Check if chef opted in
  const { data: prefs } = await db
    .from('chef_preferences')
    .select('share_activity_with_connections')
    .eq('chef_id', chefId)
    .maybeSingle()

  if (!prefs?.share_activity_with_connections) {
    // Opted out or no prefs row: delete any existing snapshot
    await db.from('chef_activity_snapshots').delete().eq('chef_id', chefId)
    return
  }

  // Get upcoming events for this chef (tenant_id = chef's own tenant)
  const today = new Date().toISOString().split('T')[0]
  const { data: events } = await db
    .from('events')
    .select('event_date, status')
    .eq('tenant_id', chefId)
    .in('status', ACTIVE_STATUSES)
    .gte('event_date', today)

  const upcomingEvents = events ?? []

  // Current week bounds (ISO week: Monday-Sunday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + mondayOffset)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  // Current month bounds
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const currentWeekCount = upcomingEvents.filter(
    (e: any) => e.event_date >= weekStartStr && e.event_date <= weekEndStr
  ).length

  const currentMonthCount = upcomingEvents.filter(
    (e: any) => e.event_date >= monthStart && e.event_date <= monthEnd
  ).length

  // Last event date
  const lastEventDate =
    upcomingEvents.length > 0
      ? upcomingEvents.reduce(
          (max: string, e: any) => (e.event_date > max ? e.event_date : max),
          upcomingEvents[0].event_date
        )
      : null

  // Busiest day (mode of day-of-week)
  let busiestDay: string | null = null
  if (upcomingEvents.length > 0) {
    const dayCounts = new Map<number, number>()
    for (const e of upcomingEvents) {
      const d = new Date(e.event_date + 'T12:00:00').getDay()
      dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1)
    }
    let maxCount = 0
    let maxDay = 0
    for (const [day, count] of dayCounts) {
      if (count > maxCount) {
        maxCount = count
        maxDay = day
      }
    }
    busiestDay = DAY_NAMES[maxDay]
  }

  // Streak: consecutive past weeks with at least 1 completed event (up to 12)
  let streakWeeks = 0
  const { data: pastEvents } = await db
    .from('events')
    .select('event_date')
    .eq('tenant_id', chefId)
    .eq('status', 'completed')
    .lte('event_date', today)
    .order('event_date', { ascending: false })
    .limit(200)

  if (pastEvents && pastEvents.length > 0) {
    // Walk backwards week by week from current week
    for (let w = 1; w <= 12; w++) {
      const wStart = new Date(weekStart)
      wStart.setDate(weekStart.getDate() - 7 * w)
      const wEnd = new Date(wStart)
      wEnd.setDate(wStart.getDate() + 6)
      const wStartStr = wStart.toISOString().split('T')[0]
      const wEndStr = wEnd.toISOString().split('T')[0]
      const hasEvent = pastEvents.some(
        (e: any) => e.event_date >= wStartStr && e.event_date <= wEndStr
      )
      if (hasEvent) {
        streakWeeks++
      } else {
        break
      }
    }
  }

  // Rolling 4-week average: completed events in past 28 days / 4
  const twentyEightDaysAgo = new Date()
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28)
  const twentyEightDaysAgoStr = twentyEightDaysAgo.toISOString().split('T')[0]

  const recentCompletedCount = (pastEvents ?? []).filter(
    (e: any) => e.event_date >= twentyEightDaysAgoStr
  ).length

  const avgWeeklyEvents = Math.round((recentCompletedCount / 4) * 100) / 100

  // Upsert snapshot
  await db.from('chef_activity_snapshots').upsert(
    {
      chef_id: chefId,
      upcoming_event_count: upcomingEvents.length,
      current_week_count: currentWeekCount,
      current_month_count: currentMonthCount,
      last_event_date: lastEventDate,
      busiest_day: busiestDay,
      streak_weeks: streakWeeks,
      avg_weekly_events: avgWeeklyEvents,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id' }
  )
}
