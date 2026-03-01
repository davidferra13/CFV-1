import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { recordCronHeartbeat } from '@/lib/cron/heartbeat'
import { getRevenueGoalSnapshotForTenantAdmin } from '@/lib/revenue-goals/actions'
import { createNotification, getChefAuthUserId } from '@/lib/notifications/actions'
import {
  fetchBookingCount,
  fetchNewClientCount,
  fetchRecipeCount,
  fetchTrailingProfitMarginBp,
  fetchTrailingExpenseRatioBp,
} from '@/lib/goals/signal-fetchers'
import type { RevenueGoalSnapshot } from '@/lib/revenue-goals/types'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

async function handleRevenueGoals(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

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
      if (
        !snapshot.enabled ||
        snapshot.monthly.gapCents <= 0 ||
        snapshot.recommendations.length === 0
      ) {
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

  const result = { processed: tenantIds.length, notified, skipped, errors }
  await recordCronHeartbeat('revenue-goals', result)
  return NextResponse.json(result)
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
    .select('id, goal_type, target_value, period_start, period_end')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!goals || goals.length === 0) return

  type GoalRow = {
    id: string
    goal_type: string
    target_value: number
    period_start: string
    period_end: string
  }

  const goalList = goals as GoalRow[]

  // Pre-compute revenue snapshot once if any revenue goals exist — avoids
  // calling getRevenueGoalSnapshotForTenantAdmin once per revenue goal row.
  const hasRevenueGoal = goalList.some(
    (g) =>
      g.goal_type === 'revenue_monthly' ||
      g.goal_type === 'revenue_annual' ||
      g.goal_type === 'revenue_custom'
  )
  let revenueSnapshot: RevenueGoalSnapshot | null = null
  if (hasRevenueGoal) {
    revenueSnapshot = await getRevenueGoalSnapshotForTenantAdmin(tenantId, now, supabase)
  }

  for (const goal of goalList) {
    try {
      let currentValue = 0
      let realizedCents: number | null = null
      let projectedCents: number | null = null

      if (
        goal.goal_type === 'revenue_monthly' ||
        goal.goal_type === 'revenue_annual' ||
        goal.goal_type === 'revenue_custom'
      ) {
        // revenueSnapshot is guaranteed non-null here because hasRevenueGoal was true
        const snap = revenueSnapshot!
        if (goal.goal_type === 'revenue_annual' && snap.annual) {
          realizedCents = snap.annual.realizedCents
          projectedCents = snap.annual.projectedCents
          currentValue = snap.annual.projectedCents
        } else {
          realizedCents = snap.monthly.realizedCents
          projectedCents = snap.monthly.projectedCents
          currentValue = snap.monthly.projectedCents
        }
      } else if (goal.goal_type === 'booking_count') {
        currentValue = await fetchBookingCount(
          supabase,
          tenantId,
          goal.period_start,
          goal.period_end
        )
      } else if (goal.goal_type === 'new_clients') {
        currentValue = await fetchNewClientCount(
          supabase,
          tenantId,
          goal.period_start,
          goal.period_end
        )
      } else if (goal.goal_type === 'recipe_library') {
        currentValue = await fetchRecipeCount(supabase, tenantId)
      } else if (goal.goal_type === 'profit_margin') {
        currentValue = await fetchTrailingProfitMarginBp(supabase, tenantId, 90)
      } else if (goal.goal_type === 'expense_ratio') {
        currentValue = await fetchTrailingExpenseRatioBp(supabase, tenantId, 90)
      }

      const gapValue = Math.max(0, goal.target_value - currentValue)
      const progressPercent =
        goal.target_value > 0
          ? Math.min(999, Math.round((currentValue / goal.target_value) * 100))
          : 0

      // upsert with ignoreDuplicates: true is idempotent — re-running the cron
      // on the same day will not overwrite an existing snapshot.
      await supabase.from('goal_snapshots').upsert(
        {
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
        },
        { onConflict: 'goal_id,snapshot_date', ignoreDuplicates: true }
      )
    } catch {
      // Non-fatal: snapshot failure for one goal should not abort the rest
    }
  }
}
