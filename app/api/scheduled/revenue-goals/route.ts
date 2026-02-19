import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getRevenueGoalSnapshotForTenantAdmin } from '@/lib/revenue-goals/actions'
import { createNotification, getChefAuthUserId } from '@/lib/notifications/actions'

async function handleRevenueGoals(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient({ admin: true }) as any
  const { data: prefRows, error } = await supabase
    .from('chef_preferences')
    .select('tenant_id')
    .eq('revenue_goal_program_enabled', true)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch opted-in chefs' }, { status: 500 })
  }

  if (!prefRows || prefRows.length === 0) {
    return NextResponse.json({ processed: 0, notified: 0, skipped: 0, errors: [] })
  }

  const today = new Date().toISOString().slice(0, 10)
  let notified = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of prefRows as Array<{ tenant_id: string }>) {
    const tenantId = row.tenant_id
    try {
      const snapshot = await getRevenueGoalSnapshotForTenantAdmin(tenantId, new Date(), supabase)
      if (!snapshot.enabled || snapshot.monthly.gapCents <= 0 || snapshot.recommendations.length === 0) {
        skipped += 1
        continue
      }

      const { data: existingToday } = await supabase
        .from('notifications')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('action', 'system_alert')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .contains('metadata', { system_key: 'revenue_goal_nudge' })
        .limit(1)

      if (existingToday && existingToday.length > 0) {
        skipped += 1
        continue
      }

      const recipientId = await getChefAuthUserId(tenantId)
      if (!recipientId) {
        skipped += 1
        continue
      }

      const top = snapshot.recommendations[0]
      await createNotification({
        tenantId,
        recipientId,
        category: 'system',
        action: 'system_alert',
        title: top.title,
        body: top.description,
        actionUrl: '/financials',
        metadata: {
          system_key: 'revenue_goal_nudge',
          monthly_gap_cents: snapshot.monthly.gapCents,
          monthly_target_cents: snapshot.monthly.targetCents,
          recommendation_id: top.id,
        },
      })
      notified += 1
    } catch (err) {
      errors.push(`${tenantId}: ${(err as Error).message}`)
    }
  }

  return NextResponse.json({
    processed: prefRows.length,
    notified,
    skipped,
    errors,
  })
}

export { handleRevenueGoals as GET, handleRevenueGoals as POST }
