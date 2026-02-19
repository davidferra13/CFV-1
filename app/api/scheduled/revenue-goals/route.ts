import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getRevenueGoalSnapshotForTenantAdmin } from '@/lib/revenue-goals/actions'
import { createNotification, getChefAuthUserId } from '@/lib/notifications/actions'
import {
  fetchBookingCount,
  fetchNewClientCount,
  fetchRecipeCount,
  fetchTrailingProfitMarginBp,
  fetchTrailingExpenseRatioBp,
} from '@/lib/goals/signal-fetchers'

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
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  // ── 1. Collect all tenant IDs to process ────────────────────────────────────
  // Legacy: chefs with revenue_goal_program_enabled
  const { data: prefRows } = await supabase
    .from('chef_preferences')
    .select('tenant_id')
    .eq('revenue_goal_program_enabled', true)

  // New-style: chefs with any active chef_goals
  const { data: activeGoalRows } = await supabase
    .from('chef_goals')
    .select('tenant_id')
    .eq('status', 'active')

  // Union of tenant IDs (deduplicated)
  const tenantSet = new Set<string>()
  for (const row of (prefRows || []) as Array<{ tenant_id: string }>) {
    if (row.tenant_id) tenantSet.add(row.tenant_id)
  }
  for (const row of (activeGoalRows || []) as Array<{ tenant_id: string }>) {
    if (row.tenant_id) tenantSet.add(row.tenant_id)
  }

  const tenantIds = Array.from(tenantSet)
  if (tenantIds.length === 0) {
    return NextResponse.json({ processed: 0, notified: 0, skipped: 0, errors: [] })
  }

  let notified = 0
  let skipped = 0
  const errors: string[] = []

  for (const tenantId of tenantIds) {
    try {
      // ── 2. Write goal snapshots for new-style chef_goals ─────────────────────
      await writeGoalSnapshotsForTenant(supabase, tenantId, now, today)

      // ── 3. Legacy revenue-goal snapshot + notification ────────────────────────
      const snapshot = await getRevenueGoalSnapshotForTenantAdmin(tenantId, now, supabase)
      if (!snapshot.enabled || snapshot.monthly.gapCents <= 0 || snapshot.recommendations.length === 0) {
        skipped += 1
        continue
      }

      // De-duplicate: max 1 goal nudge per tenant per day
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
        actionUrl: '/goals',
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
    processed: tenantIds.length,
    notified,
    skipped,
    errors,
  })
}

export { handleRevenueGoals as GET, handleRevenueGoals as POST }

// ── Snapshot writing for new-style goals ──────────────────────────────────────

async function writeGoalSnapshotsForTenant(
  supabase: any,
  tenantId: string,
  now: Date,
  today: string
): Promise<void> {
  const { data: goals } = await supabase
    .from('chef_goals')
    .select('id, goal_type, target_value, period_start, period_end, nudge_level')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!goals || goals.length === 0) return

  for (const goal of goals as Array<{
    id: string
    goal_type: string
    target_value: number
    period_start: string
    period_end: string
    nudge_level: string
  }>) {
    try {
      let currentValue = 0
      let realizedCents: number | null = null
      let projectedCents: number | null = null

      if (
        goal.goal_type === 'revenue_monthly' ||
        goal.goal_type === 'revenue_annual' ||
        goal.goal_type === 'revenue_custom'
      ) {
        const snapshot = await getRevenueGoalSnapshotForTenantAdmin(tenantId, now, supabase)
        if (goal.goal_type === 'revenue_annual' && snapshot.annual) {
          realizedCents = snapshot.annual.realizedCents
          projectedCents = snapshot.annual.projectedCents
          currentValue = snapshot.annual.projectedCents
        } else {
          realizedCents = snapshot.monthly.realizedCents
          projectedCents = snapshot.monthly.projectedCents
          currentValue = snapshot.monthly.projectedCents
        }
      } else if (goal.goal_type === 'booking_count') {
        currentValue = await fetchBookingCount(supabase, tenantId, goal.period_start, goal.period_end)
      } else if (goal.goal_type === 'new_clients') {
        currentValue = await fetchNewClientCount(supabase, tenantId, goal.period_start, goal.period_end)
      } else if (goal.goal_type === 'recipe_library') {
        currentValue = await fetchRecipeCount(supabase, tenantId)
      } else if (goal.goal_type === 'profit_margin') {
        currentValue = await fetchTrailingProfitMarginBp(supabase, tenantId, 90)
      } else if (goal.goal_type === 'expense_ratio') {
        currentValue = await fetchTrailingExpenseRatioBp(supabase, tenantId, 90)
      }

      const gapValue = Math.max(0, goal.target_value - currentValue)
      const progressPercent = goal.target_value > 0
        ? Math.min(999, Math.round((currentValue / goal.target_value) * 100))
        : 0

      await supabase
        .from('goal_snapshots')
        .insert({
          tenant_id: tenantId,
          goal_id: goal.id,
          snapshot_date: today,
          snapshot_month: today.slice(0, 7),
          current_value: currentValue,
          target_value: goal.target_value,
          gap_value: gapValue,
          progress_percent: progressPercent,
          realized_cents: realizedCents,
          projected_cents: projectedCents,
        })
        // Idempotent: if a snapshot for this goal+date already exists, skip silently
        .onConflict(['goal_id', 'snapshot_date'])
        .ignore()
    } catch {
      // Non-fatal: snapshot failure should not abort the loop
    }
  }
}
