// Operations Check Cron
// Daily check for equipment maintenance, dietary accommodations, and stale data.
// Equipment & dietary: every day. Stale data digest: Mondays only.
//
// Schedule: daily at 7 AM UTC (vercel.json: "0 7 * * *")

import { NextResponse, type NextRequest } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { recordCronHeartbeat, recordCronError } from '@/lib/cron/heartbeat'

async function handleOperationsCheck(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const startMs = Date.now()

  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const { checkEquipmentMaintenance, checkDietaryAccommodations, checkStaleData } =
      await import('@/lib/operations/proactive-alerts')

    const isMonday = new Date().getUTCDay() === 1

    // Run checks in parallel
    const [equipmentAlerts, dietaryAlerts, staleAlerts] = await Promise.all([
      checkEquipmentMaintenance().catch((err) => {
        console.error('[operations-check] Equipment check failed:', err)
        return []
      }),
      checkDietaryAccommodations().catch((err) => {
        console.error('[operations-check] Dietary check failed:', err)
        return []
      }),
      // Stale data digest only on Mondays
      isMonday
        ? checkStaleData().catch((err) => {
            console.error('[operations-check] Stale data check failed:', err)
            return []
          })
        : Promise.resolve([]),
    ])

    const allAlerts = [...equipmentAlerts, ...dietaryAlerts, ...staleAlerts]

    let notified = 0
    let skipped = 0
    const recipientCache = new Map<string, string | null>()

    for (const alert of allAlerts) {
      try {
        // Resolve recipient (cache per tenant)
        let recipientId = recipientCache.get(alert.tenantId)
        if (recipientId === undefined) {
          recipientId = (await getChefAuthUserId(alert.tenantId)) ?? null
          recipientCache.set(alert.tenantId, recipientId)
        }
        if (!recipientId) {
          skipped++
          continue
        }

        // Deduplicate: check if we already sent this exact alert recently
        // Equipment: dedupe by equipment_id, Dietary: by event_id, Stale: by tenant per week
        const dedupeKey =
          alert.alertType === 'equipment_maintenance_due'
            ? `equipment_${alert.metadata.equipment_id}`
            : alert.alertType === 'dietary_accommodation_check'
              ? `dietary_${alert.metadata.event_id}`
              : `stale_${alert.tenantId}`

        const { createServerClient } = await import('@/lib/supabase/server')
        const db: any = createServerClient({ admin: true })

        // Check for existing notification with same system_key in last 24h (equipment/dietary)
        // or last 7 days (stale digest)
        const lookbackMs =
          alert.alertType === 'stale_data_digest' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
        const lookbackDate = new Date(Date.now() - lookbackMs).toISOString()

        const { data: existing } = await db
          .from('notifications')
          .select('id')
          .eq('tenant_id', alert.tenantId)
          .eq('action', alert.alertType)
          .contains('metadata', { ops_dedupe_key: dedupeKey })
          .gte('created_at', lookbackDate)
          .limit(1)

        if (existing && existing.length > 0) {
          skipped++
          continue
        }

        await createNotification({
          tenantId: alert.tenantId,
          recipientId,
          category:
            alert.alertType === 'equipment_maintenance_due'
              ? 'ops'
              : alert.alertType === 'dietary_accommodation_check'
                ? 'event'
                : 'system',
          action: alert.alertType,
          title: alert.title,
          body: alert.body,
          actionUrl: alert.link,
          metadata: {
            ...alert.metadata,
            ops_dedupe_key: dedupeKey,
          },
        })

        notified++
      } catch (err) {
        console.error(`[operations-check] Failed to send alert:`, err)
        skipped++
      }
    }

    const durationMs = Date.now() - startMs
    const result = {
      message: `Operations check complete`,
      notified,
      skipped,
      candidates: {
        equipment: equipmentAlerts.length,
        dietary: dietaryAlerts.length,
        stale: staleAlerts.length,
      },
      isMonday,
    }

    await recordCronHeartbeat('operations-check', result, durationMs)

    console.log('[operations-check]', result)
    return NextResponse.json(result)
  } catch (err) {
    const durationMs = Date.now() - startMs
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[operations-check] Cron failed:', err)
    await recordCronError('operations-check', errorMsg, durationMs)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export { handleOperationsCheck as GET, handleOperationsCheck as POST }
