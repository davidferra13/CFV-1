import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces revenue goal milestones approaching.
 * Tables: chef_goals, goal_snapshots
 */
export async function resolveRevenueGoals(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    goalId: string
    label: string
    targetValue: number
    periodEnd: string
    currentValue: number
    progressPercent: number
  }[]

  try {
    const result = await pgClient`
      SELECT
        g.id as "goalId",
        g.label,
        g.target_value as "targetValue",
        g.period_end as "periodEnd",
        COALESCE(gs.current_value, 0) as "currentValue",
        COALESCE(gs.progress_percent, 0) as "progressPercent"
      FROM chef_goals g
      LEFT JOIN LATERAL (
        SELECT current_value, progress_percent
        FROM goal_snapshots
        WHERE goal_id = g.id
        ORDER BY snapshot_date DESC
        LIMIT 1
      ) gs ON true
      WHERE g.tenant_id = ${ctx.tenantId}
        AND g.status = 'active'
        AND g.period_end >= CURRENT_DATE
      ORDER BY g.period_end ASC
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[revenue-goal-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    const pct = Number(row.progressPercent)
    // Only surface if progress is meaningful (over 70% or period ending soon)
    const endMs = new Date(row.periodEnd + 'T00:00:00').getTime()
    const nowStart = new Date(
      ctx.now.getFullYear(),
      ctx.now.getMonth(),
      ctx.now.getDate()
    ).getTime()
    const daysLeft = Math.round((endMs - nowStart) / MS_DAY)

    // Skip if too far from goal and plenty of time left
    if (pct < 50 && daysLeft > 14) continue
    // Skip completed goals
    if (pct >= 100) continue

    let tier: RailTier = 'p4'
    if (pct >= 85) tier = 'p3' // close to goal, opportunity to celebrate
    if (pct >= 85 && daysLeft <= 7) tier = 'p2' // almost there, period ending
    if (pct < 50 && daysLeft <= 7) tier = 'p1' // behind and running out of time

    items.push({
      definitionId: `chef.revenue_goal_milestone.${row.goalId}`,
      tier,
      label: `${row.label}: ${pct}% of goal`,
      context: `${daysLeft}d left in period, ${row.currentValue}/${row.targetValue}`,
      destination: '/chef/goals',
      icon: 'target',
      loopState: 'active',
      sourceKind: 'system',
      evidenceLabel: 'computed',
      confidence: 0.9,
      nextAction: pct >= 85 ? 'Push to hit your goal' : 'Review goal progress',
      data: {
        goalId: row.goalId,
        progressPercent: pct,
        daysLeft,
        currentValue: row.currentValue,
        targetValue: row.targetValue,
      },
    })
  }

  return items
}
