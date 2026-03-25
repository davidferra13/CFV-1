import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
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

const GOAL_MILESTONE_THRESHOLDS = [25, 50, 75, 100]
const GOAL_MILESTONE_SYSTEM_KEY = 'goal_milestone'
const GOAL_WEEKLY_DIGEST_SYSTEM_KEY = 'goal_weekly_digest'

function getUtcWeekStart(date: Date): string {
  const day = date.getUTCDay()
  const offset = day === 0 ? 6 : day - 1 // Monday start
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  monday.setUTCDate(monday.getUTCDate() - offset)
  return monday.toISOString().slice(0, 10)
}

async function handleRevenueGoals(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const db = createServerClient({ admin: true }) as any
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  // ── 1. Collect all tenant IDs to process ────────────────────────────────────
  // Legacy: chefs with revenue_goal_program_enabled
  const { data: prefRows } = await db
    .from('chef_preferences')
    .select('tenant_id')
    .eq('revenue_goal_program_enabled', true)

  // New-style: chefs with any active chef_goals
  const { data: activeGoalRows } = await db
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
  let milestoneNotified = 0
  let weeklyDigestNotified = 0
  let goalSignalSkipped = 0
  const errors: string[] = []

  for (const tenantId of tenantIds) {
    try {
      // ── 2. Write goal snapshots for new-style chef_goals ─────────────────────
      await writeGoalSnapshotsForTenant(db, tenantId, now, today)
      const goalSignalResult = await emitGoalSignalNotifications(db, tenantId, now, today)
      milestoneNotified += goalSignalResult.milestoneNotified
      weeklyDigestNotified += goalSignalResult.weeklyDigestNotified
      goalSignalSkipped += goalSignalResult.skipped

      // ── 3. Legacy revenue-goal snapshot + notification ────────────────────────
      const snapshot = await getRevenueGoalSnapshotForTenantAdmin(tenantId, now, db)
      if (
        !snapshot.enabled ||
        snapshot.monthly.gapCents <= 0 ||
        snapshot.recommendations.length === 0
      ) {
        skipped += 1
        continue
      }

      // De-duplicate: max 1 goal nudge per tenant per day
      const { data: existingToday } = await db
        .from('notifications')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('action', 'goal_nudge')
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
        category: 'goals',
        action: 'goal_nudge',
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

  const result = {
    processed: tenantIds.length,
    notified,
    skipped,
    milestoneNotified,
    weeklyDigestNotified,
    goalSignalSkipped,
    errors,
  }
  await recordCronHeartbeat('revenue-goals', result)
  return NextResponse.json(result)
}

export { handleRevenueGoals as GET, handleRevenueGoals as POST }

// ── Snapshot writing for new-style goals ──────────────────────────────────────

async function writeGoalSnapshotsForTenant(
  db: any,
  tenantId: string,
  now: Date,
  today: string
): Promise<void> {
  const { data: goals } = await db
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

  // Pre-compute revenue snapshot once if any revenue goals exist - avoids
  // calling getRevenueGoalSnapshotForTenantAdmin once per revenue goal row.
  const hasRevenueGoal = goalList.some(
    (g) =>
      g.goal_type === 'revenue_monthly' ||
      g.goal_type === 'revenue_annual' ||
      g.goal_type === 'revenue_custom'
  )
  let revenueSnapshot: RevenueGoalSnapshot | null = null
  if (hasRevenueGoal) {
    revenueSnapshot = await getRevenueGoalSnapshotForTenantAdmin(tenantId, now, db)
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
        currentValue = await fetchBookingCount(db, tenantId, goal.period_start, goal.period_end)
      } else if (goal.goal_type === 'new_clients') {
        currentValue = await fetchNewClientCount(db, tenantId, goal.period_start, goal.period_end)
      } else if (goal.goal_type === 'recipe_library') {
        currentValue = await fetchRecipeCount(db, tenantId)
      } else if (goal.goal_type === 'profit_margin') {
        currentValue = await fetchTrailingProfitMarginBp(db, tenantId, 90)
      } else if (goal.goal_type === 'expense_ratio') {
        currentValue = await fetchTrailingExpenseRatioBp(db, tenantId, 90)
      }

      const gapValue = Math.max(0, goal.target_value - currentValue)
      const progressPercent =
        goal.target_value > 0
          ? Math.min(999, Math.round((currentValue / goal.target_value) * 100))
          : 0

      // upsert with ignoreDuplicates: true is idempotent - re-running the cron
      // on the same day will not overwrite an existing snapshot.
      await db.from('goal_snapshots').upsert(
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

async function emitGoalSignalNotifications(
  db: any,
  tenantId: string,
  now: Date,
  today: string
): Promise<{ milestoneNotified: number; weeklyDigestNotified: number; skipped: number }> {
  const { data: activeGoals } = await db
    .from('chef_goals')
    .select('id, label')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const goals = (activeGoals ?? []) as Array<{ id: string; label: string | null }>
  if (goals.length === 0) {
    return { milestoneNotified: 0, weeklyDigestNotified: 0, skipped: 0 }
  }

  const goalIds = goals.map((goal) => goal.id)
  const goalLabelById = new Map(goals.map((goal) => [goal.id, goal.label ?? 'Goal']))
  const lookbackStart = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const weekStart = getUtcWeekStart(now)

  const { data: snapshots } = await db
    .from('goal_snapshots')
    .select('goal_id, snapshot_date, progress_percent')
    .eq('tenant_id', tenantId)
    .in('goal_id', goalIds)
    .gte('snapshot_date', lookbackStart)
    .lte('snapshot_date', today)
    .order('snapshot_date', { ascending: false })

  const rows = (snapshots ?? []) as Array<{
    goal_id: string
    snapshot_date: string
    progress_percent: number
  }>
  if (rows.length === 0) {
    return { milestoneNotified: 0, weeklyDigestNotified: 0, skipped: 0 }
  }

  const todayRows = rows.filter((row) => row.snapshot_date === today)
  if (todayRows.length === 0) {
    return { milestoneNotified: 0, weeklyDigestNotified: 0, skipped: 0 }
  }

  const byGoal = new Map<string, Array<{ snapshot_date: string; progress_percent: number }>>()
  for (const row of rows) {
    const list = byGoal.get(row.goal_id) ?? []
    list.push({
      snapshot_date: row.snapshot_date,
      progress_percent: Number(row.progress_percent ?? 0),
    })
    byGoal.set(row.goal_id, list)
  }

  const recipientId = await getChefAuthUserId(tenantId)
  if (!recipientId) {
    return { milestoneNotified: 0, weeklyDigestNotified: 0, skipped: todayRows.length + 1 }
  }

  let milestoneNotified = 0
  let weeklyDigestNotified = 0
  let skipped = 0

  for (const row of todayRows) {
    const history = byGoal.get(row.goal_id) ?? []
    const previousSnapshot = history.find((item) => item.snapshot_date < today)
    const previousProgress = previousSnapshot ? Number(previousSnapshot.progress_percent ?? 0) : 0
    const currentProgress = Number(row.progress_percent ?? 0)

    const crossedMilestones = GOAL_MILESTONE_THRESHOLDS.filter(
      (threshold) => previousProgress < threshold && currentProgress >= threshold
    )
    if (crossedMilestones.length === 0) continue

    const milestone = crossedMilestones[crossedMilestones.length - 1]
    const { data: existingMilestone } = await db
      .from('notifications')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('action', 'goal_milestone')
      .contains('metadata', {
        system_key: GOAL_MILESTONE_SYSTEM_KEY,
        goal_id: row.goal_id,
        milestone,
      })
      .limit(1)

    if ((existingMilestone?.length ?? 0) > 0) {
      skipped += 1
      continue
    }

    const goalLabel = goalLabelById.get(row.goal_id) ?? 'Goal'
    await createNotification({
      tenantId,
      recipientId,
      category: 'goals',
      action: 'goal_milestone',
      title: `Goal milestone reached: ${milestone}%`,
      body: `${goalLabel} is now at ${Math.round(currentProgress)}% progress.`,
      actionUrl: '/goals',
      metadata: {
        system_key: GOAL_MILESTONE_SYSTEM_KEY,
        goal_id: row.goal_id,
        milestone,
        previous_progress_percent: Math.round(previousProgress),
        current_progress_percent: Math.round(currentProgress),
        snapshot_date: today,
      },
    })
    milestoneNotified += 1
  }

  const { data: existingDigest } = await db
    .from('notifications')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('action', 'goal_weekly_digest')
    .contains('metadata', {
      system_key: GOAL_WEEKLY_DIGEST_SYSTEM_KEY,
      week_start: weekStart,
    })
    .limit(1)

  if ((existingDigest?.length ?? 0) === 0) {
    const averageProgress = Math.round(
      todayRows.reduce((sum, row) => sum + Number(row.progress_percent ?? 0), 0) / todayRows.length
    )
    const goalsAtOrAbove75 = todayRows.filter(
      (row) => Number(row.progress_percent ?? 0) >= 75
    ).length

    await createNotification({
      tenantId,
      recipientId,
      category: 'goals',
      action: 'goal_weekly_digest',
      title: 'Weekly goals digest',
      body: `${todayRows.length} active goals tracked. ${goalsAtOrAbove75} goals are at 75%+ progress. Avg progress: ${averageProgress}%.`,
      actionUrl: '/goals',
      metadata: {
        system_key: GOAL_WEEKLY_DIGEST_SYSTEM_KEY,
        week_start: weekStart,
        goals_tracked: todayRows.length,
        goals_at_or_above_75_percent: goalsAtOrAbove75,
        average_progress_percent: averageProgress,
      },
    })
    weeklyDigestNotified = 1
  } else {
    skipped += 1
  }

  return { milestoneNotified, weeklyDigestNotified, skipped }
}
