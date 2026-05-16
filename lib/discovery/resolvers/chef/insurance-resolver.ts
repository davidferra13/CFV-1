import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces insurance policies expiring or up for renewal.
 * Tables: insurance_policies
 */
export async function resolveInsurancePolicies(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    id: string
    policyType: string
    provider: string
    endDate: string
    status: string
    autoRenew: boolean | null
  }[]

  try {
    const result = await pgClient`
      SELECT
        ip.id,
        ip.policy_type as "policyType",
        ip.provider,
        ip.end_date as "endDate",
        ip.status,
        ip.auto_renew as "autoRenew"
      FROM insurance_policies ip
      WHERE ip.chef_id = ${ctx.tenantId}
        AND ip.status IN ('active', 'expiring_soon')
        AND ip.end_date <= (CURRENT_DATE + INTERVAL '60 days')::date
      ORDER BY ip.end_date ASC
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[insurance-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    const endMs = new Date(row.endDate + 'T00:00:00').getTime()
    const nowStart = new Date(
      ctx.now.getFullYear(),
      ctx.now.getMonth(),
      ctx.now.getDate()
    ).getTime()
    const daysUntil = Math.round((endMs - nowStart) / MS_DAY)

    let tier: RailTier = 'p3'
    if (daysUntil < 0)
      tier = 'p0' // expired
    else if (daysUntil <= 14) tier = 'p1'
    else if (daysUntil <= 30) tier = 'p2'

    const expired = daysUntil < 0
    const typeLabel = row.policyType.replace(/_/g, ' ')

    items.push({
      definitionId: `chef.insurance_expiring.${row.id}`,
      tier,
      label: expired ? `EXPIRED: ${typeLabel}` : `Insurance renewal: ${typeLabel}`,
      context: expired
        ? `${row.provider} policy expired ${Math.abs(daysUntil)}d ago`
        : `${row.provider} expires in ${daysUntil}d${row.autoRenew ? ' (auto-renew on)' : ''}`,
      destination: '/chef/settings/insurance',
      icon: 'shield-check',
      loopState: expired ? 'blocked' : 'active',
      sourceKind: 'system',
      evidenceLabel: 'confirmed',
      confidence: 1,
      nextAction: expired ? 'Renew insurance immediately' : 'Review renewal',
      data: {
        policyId: row.id,
        policyType: row.policyType,
        daysUntilExpiry: daysUntil,
        autoRenew: row.autoRenew,
      },
    })
  }

  return items
}
