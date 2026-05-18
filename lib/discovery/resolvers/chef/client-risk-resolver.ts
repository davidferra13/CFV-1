import type { GodModeResolvedItem, GodModeResolverContext } from '../../god-mode-types'

const MS_DAY = 86_400_000

export async function resolveClientRisks(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    id: string
    fullName: string
    lastEventDate: string | null
    totalEventsCompleted: number
    lifetimeValueCents: number
  }[]

  try {
    const result = await pgClient`
      SELECT
        c.id,
        c.full_name as "fullName",
        c.last_event_date as "lastEventDate",
        c.total_events_completed as "totalEventsCompleted",
        c.lifetime_value_cents as "lifetimeValueCents"
      FROM clients c
      WHERE c.tenant_id = ${ctx.tenantId}
        AND c.status = 'active'
        AND c.total_events_completed > 0
        AND c.last_event_date IS NOT NULL
      ORDER BY c.lifetime_value_cents DESC
      LIMIT 25
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[client-risk-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []
  const nowMs = new Date(ctx.now.getFullYear(), ctx.now.getMonth(), ctx.now.getDate()).getTime()

  for (const row of rows) {
    if (!row.lastEventDate) continue

    const lastMs = new Date(row.lastEventDate + 'T00:00:00').getTime()
    const daysSince = Math.round((nowMs - lastMs) / MS_DAY)

    if (daysSince < 30) continue

    let riskScore = 0

    if (daysSince > 180) riskScore += 40
    else if (daysSince > 90) riskScore += 25
    else if (daysSince > 60) riskScore += 15
    else riskScore += 5

    if (row.lifetimeValueCents > 500_000) riskScore += 20
    else if (row.lifetimeValueCents > 200_000) riskScore += 10
    else if (row.lifetimeValueCents > 100_000) riskScore += 5

    if (row.totalEventsCompleted >= 5 && daysSince > 60) riskScore += 20
    else if (row.totalEventsCompleted >= 3 && daysSince > 90) riskScore += 10

    riskScore = Math.min(100, riskScore)

    const riskLevel: 'critical' | 'high' | 'medium' | 'low' =
      riskScore >= 60 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low'

    if (riskLevel === 'low') continue

    const tier =
      riskLevel === 'critical'
        ? ('p0' as const)
        : riskLevel === 'high'
          ? ('p1' as const)
          : ('p2' as const)

    const ltv = `$${(row.lifetimeValueCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`

    items.push({
      definitionId: `chef.client_risk.${row.id}`,
      tier,
      label: `Client at risk: ${row.fullName}`,
      context: `${daysSince}d silent, ${row.totalEventsCompleted} events, ${ltv} LTV`,
      destination: `/chef/clients/${row.id}`,
      icon: 'alert-triangle',
      loopState: 'stale',
      sourceKind: 'client_profile',
      evidenceLabel: 'computed',
      confidence: riskScore / 100,
      score: riskScore,
      nextAction:
        riskLevel === 'critical'
          ? 'Reach out personally about upcoming plans'
          : 'Send a check-in or seasonal menu update',
      data: {
        clientId: row.id,
        riskScore,
        riskLevel,
        daysSinceLastEvent: daysSince,
        lifetimeValueCents: row.lifetimeValueCents,
      },
    })
  }

  return items
}
