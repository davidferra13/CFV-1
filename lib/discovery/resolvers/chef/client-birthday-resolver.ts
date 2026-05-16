import type { GodModeResolvedItem, GodModeResolverContext, RailTier } from '../../god-mode-types'

const MS_DAY = 86_400_000

/**
 * Surfaces upcoming client birthdays and anniversaries.
 * Tables: clients (birthday, anniversary fields)
 */
export async function resolveClientBirthdays(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { pgClient } = await import('@/lib/db')

  let rows: {
    id: string
    fullName: string
    birthday: string | null
    anniversary: string | null
  }[]

  try {
    // Find clients whose birthday or anniversary falls within the next 14 days
    const result = await pgClient`
      SELECT
        c.id,
        c.full_name as "fullName",
        c.birthday,
        c.anniversary
      FROM clients c
      WHERE c.tenant_id = ${ctx.tenantId}
        AND c.status = 'active'
        AND (
          (c.birthday IS NOT NULL AND (
            (EXTRACT(MONTH FROM c.birthday::date) = EXTRACT(MONTH FROM CURRENT_DATE)
             AND EXTRACT(DAY FROM c.birthday::date) BETWEEN EXTRACT(DAY FROM CURRENT_DATE) AND EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '14 days'))
            OR
            (EXTRACT(MONTH FROM c.birthday::date) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '14 days')
             AND EXTRACT(DAY FROM c.birthday::date) <= EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '14 days'))
          ))
          OR
          (c.anniversary IS NOT NULL AND (
            (EXTRACT(MONTH FROM c.anniversary::date) = EXTRACT(MONTH FROM CURRENT_DATE)
             AND EXTRACT(DAY FROM c.anniversary::date) BETWEEN EXTRACT(DAY FROM CURRENT_DATE) AND EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '14 days'))
            OR
            (EXTRACT(MONTH FROM c.anniversary::date) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '14 days')
             AND EXTRACT(DAY FROM c.anniversary::date) <= EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '14 days'))
          ))
        )
      LIMIT 20
    `
    rows = result as unknown as typeof rows
  } catch (err) {
    console.error('[client-birthday-resolver] Query failed:', err)
    return []
  }

  const items: GodModeResolvedItem[] = []
  const thisYear = ctx.now.getFullYear()

  for (const row of rows) {
    // Check birthday
    if (row.birthday) {
      const bday = new Date(row.birthday)
      const thisYearBday = new Date(thisYear, bday.getMonth(), bday.getDate())
      const nowStart = new Date(ctx.now.getFullYear(), ctx.now.getMonth(), ctx.now.getDate())
      const daysUntil = Math.round((thisYearBday.getTime() - nowStart.getTime()) / MS_DAY)

      if (daysUntil >= 0 && daysUntil <= 14) {
        const tier: RailTier = daysUntil <= 1 ? 'p3' : 'p4'

        items.push({
          definitionId: `chef.client_birthday.${row.id}`,
          tier,
          label: `${row.fullName}'s birthday${daysUntil === 0 ? ' today' : daysUntil === 1 ? ' tomorrow' : ''}`,
          context: daysUntil <= 1 ? 'Send a birthday message' : `In ${daysUntil} days`,
          destination: `/chef/clients/${row.id}`,
          icon: 'cake',
          loopState: 'active',
          sourceKind: 'client_profile',
          evidenceLabel: 'confirmed',
          confidence: 1,
          nextAction: 'Send birthday wishes or plan something special',
          data: {
            clientId: row.id,
            milestoneType: 'birthday',
            daysUntil,
          },
        })
      }
    }

    // Check anniversary
    if (row.anniversary) {
      const anniv = new Date(row.anniversary)
      const thisYearAnniv = new Date(thisYear, anniv.getMonth(), anniv.getDate())
      const nowStart = new Date(ctx.now.getFullYear(), ctx.now.getMonth(), ctx.now.getDate())
      const daysUntil = Math.round((thisYearAnniv.getTime() - nowStart.getTime()) / MS_DAY)

      if (daysUntil >= 0 && daysUntil <= 14) {
        const tier: RailTier = daysUntil <= 1 ? 'p3' : 'p4'

        items.push({
          definitionId: `chef.client_anniversary.${row.id}`,
          tier,
          label: `${row.fullName}'s anniversary${daysUntil === 0 ? ' today' : daysUntil === 1 ? ' tomorrow' : ''}`,
          context: daysUntil <= 1 ? 'A thoughtful note goes a long way' : `In ${daysUntil} days`,
          destination: `/chef/clients/${row.id}`,
          icon: 'heart',
          loopState: 'active',
          sourceKind: 'client_profile',
          evidenceLabel: 'confirmed',
          confidence: 1,
          nextAction: 'Send anniversary wishes',
          data: {
            clientId: row.id,
            milestoneType: 'anniversary',
            daysUntil,
          },
        })
      }
    }
  }

  return items
}
