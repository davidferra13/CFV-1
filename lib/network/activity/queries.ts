import { createServerClient } from '@/lib/db/server'

export interface ConnectedChefActivity {
  chefId: string
  displayName: string | null
  businessName: string
  profileImageUrl: string | null
  upcomingEventCount: number
  currentWeekCount: number
  currentMonthCount: number
  lastEventDate: string | null
  busiestDay: string | null
  streakWeeks: number
  avgWeeklyEvents: number
  updatedAt: string
}

export async function getConnectedChefsActivity(
  chefId: string,
  options?: { circleId?: string }
): Promise<ConnectedChefActivity[]> {
  const db: any = createServerClient({ admin: true })

  // Get accepted connection IDs (bidirectional)
  const { data: connections } = await db
    .from('chef_connections')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${chefId},addressee_id.eq.${chefId}`)
    .eq('status', 'accepted')

  if (!connections || connections.length === 0) return []

  const connectedIds = connections.map((c: any) =>
    c.requester_id === chefId ? c.addressee_id : c.requester_id
  )

  let filteredIds = connectedIds

  if (options?.circleId) {
    const { data: circleMembers } = await db
      .from('circle_collaborators')
      .select('chef_id')
      .eq('circle_id', options.circleId)
      .eq('status', 'active')

    if (circleMembers && circleMembers.length > 0) {
      const circleMemberIds = new Set(circleMembers.map((m: any) => m.chef_id))
      filteredIds = connectedIds.filter((id: string) => circleMemberIds.has(id))
    } else {
      return []
    }
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Get snapshots for connected chefs (only those with upcoming events)
  const { data: snapshots } = await db
    .from('chef_activity_snapshots')
    .select(
      'chef_id, upcoming_event_count, current_week_count, current_month_count, last_event_date, busiest_day, streak_weeks, avg_weekly_events, updated_at'
    )
    .in('chef_id', filteredIds)
    .gt('upcoming_event_count', 0)
    .gte('updated_at', sevenDaysAgo)
    .order('upcoming_event_count', { ascending: false })

  if (!snapshots || snapshots.length === 0) return []

  // Get chef profile info
  const snapshotChefIds = snapshots.map((s: any) => s.chef_id)
  const { data: chefs } = await db
    .from('chefs')
    .select('id, display_name, business_name, profile_image_url')
    .in('id', snapshotChefIds)

  const chefMap = new Map<string, any>((chefs ?? []).map((c: any) => [c.id, c]))

  return snapshots.map((s: any) => {
    const chef = chefMap.get(s.chef_id)
    return {
      chefId: s.chef_id,
      displayName: chef?.display_name ?? null,
      businessName: chef?.business_name ?? 'Chef',
      profileImageUrl: chef?.profile_image_url ?? null,
      upcomingEventCount: s.upcoming_event_count,
      currentWeekCount: s.current_week_count,
      currentMonthCount: s.current_month_count,
      lastEventDate: s.last_event_date,
      busiestDay: s.busiest_day,
      streakWeeks: s.streak_weeks,
      avgWeeklyEvents: Number(s.avg_weekly_events) || 0,
      updatedAt: s.updated_at,
    }
  })
}

export interface OwnActivitySnapshot {
  upcomingEventCount: number
  currentWeekCount: number
  currentMonthCount: number
  streakWeeks: number
  avgWeeklyEvents: number
  busiestDay: string | null
  updatedAt: string
}

export async function getOwnSnapshot(chefId: string): Promise<OwnActivitySnapshot | null> {
  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('chef_activity_snapshots')
    .select(
      'upcoming_event_count, current_week_count, current_month_count, streak_weeks, avg_weekly_events, busiest_day, updated_at'
    )
    .eq('chef_id', chefId)
    .maybeSingle()

  if (!data) return null

  return {
    upcomingEventCount: data.upcoming_event_count,
    currentWeekCount: data.current_week_count,
    currentMonthCount: data.current_month_count,
    streakWeeks: data.streak_weeks,
    avgWeeklyEvents: Number(data.avg_weekly_events) || 0,
    busiestDay: data.busiest_day,
    updatedAt: data.updated_at,
  }
}

export async function getChefConnectionCount(chefId: string): Promise<number> {
  const db: any = createServerClient({ admin: true })
  const { count, error } = await db
    .from('chef_connections')
    .select('*', { count: 'exact', head: true })
    .or(`requester_id.eq.${chefId},addressee_id.eq.${chefId}`)
    .eq('status', 'accepted')
  if (error) return 0
  return count ?? 0
}

export async function purgeStaleSnapshots(): Promise<number> {
  const db: any = createServerClient({ admin: true })
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await db
    .from('chef_activity_snapshots')
    .delete()
    .lt('updated_at', thirtyDaysAgo)
    .select('id')

  return data?.length ?? 0
}
