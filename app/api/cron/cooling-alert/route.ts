import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

const dbAdmin = createAdminClient()

const SYSTEM_KEY = 'relationship_cooling'

function getUtcWeekStart(date: Date): string {
  const day = date.getUTCDay()
  const offset = day === 0 ? 6 : day - 1 // Monday start
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  monday.setUTCDate(monday.getUTCDate() - offset)
  return monday.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('cooling-alert', async () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
      const today = new Date().toISOString().split('T')[0]
      const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
      const cycleWeek = getUtcWeekStart(new Date())
      const recipientCache = new Map<string, string | null>()
      const coolingPairs = new Map<string, { tenant_id: string; client_id: string }>()

      const { data: coolingClients, error } = await dbAdmin.rpc('get_cooling_clients', {
        cutoff_date: ninetyDaysAgo,
        today_date: today,
      })

      if (!error && Array.isArray(coolingClients)) {
        for (const row of coolingClients as Array<{ tenant_id?: string; client_id?: string }>) {
          if (!row.tenant_id || !row.client_id) continue
          coolingPairs.set(`${row.tenant_id}:${row.client_id}`, {
            tenant_id: row.tenant_id,
            client_id: row.client_id,
          })
        }
      } else {
        const { data: latestEvents } = await dbAdmin
          .from('events')
          .select('tenant_id, client_id')
          .eq('status', 'completed')
          .not('client_id', 'is', null)
          .lt('event_date', ninetyDaysAgo)
          .order('event_date', { ascending: false })

        const seen = new Set<string>()
        const candidates: { tenant_id: string; client_id: string }[] = []
        for (const e of latestEvents ?? []) {
          if (!e.tenant_id || !e.client_id) continue
          const key = `${e.tenant_id}:${e.client_id}`
          if (!seen.has(key)) {
            seen.add(key)
            candidates.push({ tenant_id: e.tenant_id, client_id: e.client_id })
          }
        }

        const { data: upcomingEvents } = await dbAdmin
          .from('events')
          .select('tenant_id, client_id')
          .gte('event_date', today)
          .not('status', 'eq', 'cancelled')

        const upcomingSet = new Set(
          (upcomingEvents || []).map((e: any) => `${e.tenant_id}:${e.client_id}`)
        )

        const filteredPairs = candidates.filter(
          (c) => !upcomingSet.has(`${c.tenant_id}:${c.client_id}`)
        )

        for (const pair of filteredPairs) {
          coolingPairs.set(`${pair.tenant_id}:${pair.client_id}`, pair)
        }
      }

      const candidates = Array.from(coolingPairs.values())
      if (candidates.length === 0) {
        return { detected: 0, notified: 0, skipped: 0 }
      }

      const clientIds = Array.from(new Set(candidates.map((row) => row.client_id)))
      const { data: clients } = await dbAdmin
        .from('clients')
        .select('id, full_name')
        .in('id', clientIds)

      const clientNameById = new Map(
        (clients ?? []).map((client: any) => [client.id, client.full_name])
      )

      let notified = 0
      let skipped = 0

      for (const pair of candidates) {
        const cached = recipientCache.get(pair.tenant_id)
        const recipientId =
          cached !== undefined
            ? cached
            : await getChefAuthUserId(pair.tenant_id).then((id) => {
                recipientCache.set(pair.tenant_id, id)
                return id
              })
        if (!recipientId) {
          skipped += 1
          continue
        }

        const { data: existing } = await dbAdmin
          .from('notifications')
          .select('id')
          .eq('tenant_id', pair.tenant_id)
          .eq('action', 'relationship_cooling')
          .contains('metadata', {
            system_key: SYSTEM_KEY,
            client_id: pair.client_id,
            cycle_week: cycleWeek,
          })
          .limit(1)

        if ((existing?.length ?? 0) > 0) {
          skipped += 1
          continue
        }

        const clientName = clientNameById.get(pair.client_id) ?? 'A client'
        await createNotification({
          tenantId: pair.tenant_id,
          recipientId,
          category: 'client',
          action: 'relationship_cooling',
          title: `${clientName} may be cooling off`,
          body: 'No completed event in the last 90 days and no upcoming booking.',
          actionUrl: `/clients/${pair.client_id}`,
          clientId: pair.client_id,
          metadata: {
            system_key: SYSTEM_KEY,
            client_id: pair.client_id,
            cycle_week: cycleWeek,
            cutoff_date: ninetyDaysAgo,
          },
        })
        console.log(`[cooling-alert] Client ${pair.client_id} cooling for chef ${pair.tenant_id}`)
        notified += 1
      }

      return {
        detected: candidates.length,
        notified,
        skipped,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[cooling-alert] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
