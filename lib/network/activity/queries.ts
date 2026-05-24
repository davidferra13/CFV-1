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
  updatedAt: string
}

export async function getConnectedChefsActivity(chefId: string): Promise<ConnectedChefActivity[]> {
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

  // Get snapshots for connected chefs (only those with upcoming events)
  const { data: snapshots } = await db
    .from('chef_activity_snapshots')
    .select(
      'chef_id, upcoming_event_count, current_week_count, current_month_count, last_event_date, busiest_day, streak_weeks, updated_at'
    )
    .in('chef_id', connectedIds)
    .gt('upcoming_event_count', 0)
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
      updatedAt: s.updated_at,
    }
  })
}
