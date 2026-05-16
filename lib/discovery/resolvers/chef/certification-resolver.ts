import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces certifications expiring soon or already expired.
 * Tables: chef_certifications
 */
export async function resolveCertifications(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    id: string
    certType: string
    name: string
    expiryDate: string | null
    expiresAt: string | null
    renewalUrl: string | null
    reminderDaysBefore: number
  }[]

  try {
    const result = await pgClient`
      SELECT
        cc.id,
        cc.cert_type as "certType",
        cc.name,
        cc.expiry_date as "expiryDate",
        cc.expires_at as "expiresAt",
        cc.renewal_url as "renewalUrl",
        cc.reminder_days_before as "reminderDaysBefore"
      FROM chef_certifications cc
      WHERE (cc.chef_id = ${ctx.tenantId} OR cc.tenant_id = ${ctx.tenantId})
        AND (cc.is_active = true OR cc.status IN ('active', 'expiring_soon'))
        AND (
          cc.expiry_date IS NOT NULL AND cc.expiry_date <= (CURRENT_DATE + INTERVAL '60 days')::date
          OR cc.expires_at IS NOT NULL AND cc.expires_at <= (CURRENT_DATE + INTERVAL '60 days')::date
        )
      ORDER BY COALESCE(cc.expiry_date, cc.expires_at) ASC
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[certification-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []

  for (const row of rows) {
    const dateStr = row.expiryDate ?? row.expiresAt
    if (!dateStr) continue

    const expiryMs = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00')).getTime()
    const nowStart = new Date(
      ctx.now.getFullYear(),
      ctx.now.getMonth(),
      ctx.now.getDate()
    ).getTime()
    const daysUntil = Math.round((expiryMs - nowStart) / MS_DAY)

    let tier: RailTier = 'p3'
    if (daysUntil < 0)
      tier = 'p0' // expired
    else if (daysUntil <= 7) tier = 'p1'
    else if (daysUntil <= 30) tier = 'p2'

    const expired = daysUntil < 0
    const label = expired ? `EXPIRED: ${row.name}` : `Expiring: ${row.name}`

    items.push({
      definitionId: `chef.cert_expiring.${row.id}`,
      tier,
      label,
      context: expired ? `Expired ${Math.abs(daysUntil)}d ago` : `Expires in ${daysUntil}d`,
      destination: '/chef/settings/certifications',
      icon: 'shield',
      loopState: expired ? 'blocked' : 'active',
      sourceKind: 'system',
      evidenceLabel: 'confirmed',
      confidence: 1,
      nextAction: expired ? 'Renew immediately' : 'Schedule renewal',
      data: {
        certId: row.id,
        certType: row.certType,
        daysUntilExpiry: daysUntil,
        renewalUrl: row.renewalUrl,
      },
    })
  }

  return items
}
