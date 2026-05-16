import type { GodModeResolvedItem, GodModeResolverContext } from '../../god-mode-types'

/**
 * Surfaces recent automation executions (autopilot summary).
 * Tables: automation_executions
 */
export async function resolveAutomationActivity(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let summary: {
    totalRuns: number
    successCount: number
    failedCount: number
    lastRunAt: string | null
    latestActions: string[]
  }

  try {
    const countResult = await pgClient`
      SELECT
        COUNT(*)::int as "totalRuns",
        COUNT(*) FILTER (WHERE status = 'success')::int as "successCount",
        COUNT(*) FILTER (WHERE status = 'failed')::int as "failedCount",
        MAX(executed_at) as "lastRunAt"
      FROM automation_executions
      WHERE tenant_id = ${ctx.tenantId}
        AND executed_at > (NOW() - INTERVAL '24 hours')
    `

    const actionsResult = await pgClient`
      SELECT DISTINCT action_type
      FROM automation_executions
      WHERE tenant_id = ${ctx.tenantId}
        AND executed_at > (NOW() - INTERVAL '24 hours')
        AND status = 'success'
      LIMIT 5
    `

    const row = (
      countResult as unknown as {
        totalRuns: number
        successCount: number
        failedCount: number
        lastRunAt: string | null
      }[]
    )[0]
    summary = {
      totalRuns: row?.totalRuns ?? 0,
      successCount: row?.successCount ?? 0,
      failedCount: row?.failedCount ?? 0,
      lastRunAt: row?.lastRunAt ?? null,
      latestActions: (actionsResult as unknown as { action_type: string }[]).map(
        (r) => r.action_type
      ),
    }
  } catch (err) {
    console.error('[automation-resolver] Query failed:', err)
    return []
  }

  if (summary.totalRuns === 0) return []

  const items: GodModeResolvedItem[] = []

  // Failed automations get higher priority
  if (summary.failedCount > 0) {
    items.push({
      definitionId: 'chef.automation_failures',
      tier: 'p2',
      label: `Automation: ${summary.failedCount} failed`,
      context: `${summary.failedCount} of ${summary.totalRuns} automations failed in the last 24h`,
      destination: '/chef/automations',
      icon: 'zap-off',
      loopState: 'blocked',
      sourceKind: 'system',
      evidenceLabel: 'computed',
      confidence: 1,
      nextAction: 'Review failed automations',
      data: {
        totalRuns: summary.totalRuns,
        failedCount: summary.failedCount,
      },
    })
  }

  // Summary of successful automations (awareness/opportunity tier)
  if (summary.successCount > 0) {
    const actionSummary =
      summary.latestActions.length > 0
        ? summary.latestActions.map((a) => a.replace(/_/g, ' ')).join(', ')
        : 'various actions'

    items.push({
      definitionId: 'chef.automation_summary',
      tier: 'p4',
      label: `Autopilot: ${summary.successCount} actions handled`,
      context: `Last 24h: ${actionSummary}`,
      destination: '/chef/automations',
      icon: 'zap',
      loopState: 'done',
      sourceKind: 'system',
      evidenceLabel: 'computed',
      confidence: 1,
      nextAction: 'Review autopilot activity',
      data: {
        totalRuns: summary.totalRuns,
        successCount: summary.successCount,
        latestActions: summary.latestActions,
      },
    })
  }

  return items
}
