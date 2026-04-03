import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

const dbAdmin = createAdminClient()

const SYSTEM_KEY = 'quarterly_checkin_due'

function getQuarterKey(date: Date): string {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1
  return `${date.getUTCFullYear()}-Q${quarter}`
}

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('quarterly-checkin', async () => {
      const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const quarterKey = getQuarterKey(new Date())
      const { data: chefs } = await dbAdmin.from('chefs').select('id').limit(10000)

      if (!chefs || chefs.length === 0) {
        return { processed: 0, due: 0, notified: 0, skipped: 0 }
      }

      const recipientCache = new Map<string, string | null>()
      let due = 0
      let notified = 0
      let skipped = 0

      for (const chef of chefs) {
        const { data: lastCheckin } = await dbAdmin
          .from('chef_growth_checkins')
          .select('checkin_date')
          .eq('tenant_id', chef.id)
          .order('checkin_date', { ascending: false })
          .limit(1)
          .single()

        const isDue = !lastCheckin || lastCheckin.checkin_date < ninetyDaysAgo.split('T')[0]

        if (!isDue) continue
        due++

        const cached = recipientCache.get(chef.id)
        const recipientId =
          cached !== undefined
            ? cached
            : await getChefAuthUserId(chef.id).then((id) => {
                recipientCache.set(chef.id, id)
                return id
              })
        if (!recipientId) {
          skipped += 1
          continue
        }

        const { data: existing } = await dbAdmin
          .from('notifications')
          .select('id')
          .eq('tenant_id', chef.id)
          .eq('action', 'quarterly_checkin_due')
          .contains('metadata', {
            system_key: SYSTEM_KEY,
            quarter_key: quarterKey,
          })
          .limit(1)

        if ((existing?.length ?? 0) > 0) {
          skipped += 1
          continue
        }

        await createNotification({
          tenantId: chef.id,
          recipientId,
          category: 'wellbeing',
          action: 'quarterly_checkin_due',
          title: 'Quarterly check-in due',
          body: 'Take 5 minutes to log how the last quarter felt and set your next focus.',
          actionUrl: '/settings/protection/business-health',
          metadata: {
            system_key: SYSTEM_KEY,
            quarter_key: quarterKey,
          },
        })
        console.log(`[quarterly-checkin] Chef ${chef.id} is due for quarterly check-in`)
        notified++
      }

      return { processed: chefs.length, due, notified, skipped }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[quarterly-checkin] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
