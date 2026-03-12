// Financial Alerts Cron
// Daily checks for overdue payments, expense anomalies, budget variance,
// and payment settlement summaries.
//
// Schedule: daily at 8 AM UTC (vercel.json: "0 8 * * *")

import { NextResponse, type NextRequest } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { recordCronHeartbeat, recordCronError } from '@/lib/cron/heartbeat'

async function handleFinancialAlerts(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const startMs = Date.now()

  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const {
      checkOverduePayments,
      checkExpenseAnomalies,
      checkBudgetVariance,
      checkDailySettlements,
    } = await import('@/lib/finance/financial-alerts')

    // Run all checks in parallel
    const [overdueAlerts, anomalyAlerts, varianceAlerts, settlementAlerts] = await Promise.all([
      checkOverduePayments().catch((err) => {
        console.error('[financial-alerts] Overdue check failed:', err)
        return []
      }),
      checkExpenseAnomalies().catch((err) => {
        console.error('[financial-alerts] Anomaly check failed:', err)
        return []
      }),
      checkBudgetVariance().catch((err) => {
        console.error('[financial-alerts] Variance check failed:', err)
        return []
      }),
      checkDailySettlements().catch((err) => {
        console.error('[financial-alerts] Settlement check failed:', err)
        return []
      }),
    ])

    const allAlerts = [...overdueAlerts, ...anomalyAlerts, ...varianceAlerts, ...settlementAlerts]

    let notified = 0
    let skipped = 0
    const recipientCache = new Map<string, string | null>()

    for (const alert of allAlerts) {
      try {
        let recipientId = recipientCache.get(alert.tenantId)
        if (recipientId === undefined) {
          recipientId = (await getChefAuthUserId(alert.tenantId)) ?? null
          recipientCache.set(alert.tenantId, recipientId)
        }
        if (!recipientId) {
          skipped++
          continue
        }

        // Build dedupe key based on alert type
        let dedupeKey: string
        switch (alert.alertType) {
          case 'payment_overdue':
            // Dedupe per event + escalation level (7/14/21)
            dedupeKey = `overdue_${alert.metadata.event_id}_${alert.metadata.escalation}`
            break
          case 'expense_anomaly':
            // Dedupe per expense
            dedupeKey = `anomaly_${alert.metadata.expense_id}`
            break
          case 'budget_variance_warning':
            // Dedupe per event per week
            dedupeKey = `variance_${alert.metadata.event_id}`
            break
          case 'daily_settlement_summary':
            // Dedupe per day per tenant
            dedupeKey = `settlement_${alert.tenantId}_${new Date().toISOString().split('T')[0]}`
            break
          default:
            dedupeKey = `financial_${alert.tenantId}_${Date.now()}`
        }

        // Check for existing notification with same dedupe key
        const { createServerClient } = await import('@/lib/supabase/server')
        const db: any = createServerClient({ admin: true })
        const lookbackMs =
          alert.alertType === 'budget_variance_warning'
            ? 7 * 24 * 60 * 60 * 1000
            : 24 * 60 * 60 * 1000
        const lookbackDate = new Date(Date.now() - lookbackMs).toISOString()

        const { data: existing } = await db
          .from('notifications')
          .select('id')
          .eq('tenant_id', alert.tenantId)
          .eq('action', alert.alertType)
          .contains('metadata', { financial_dedupe_key: dedupeKey })
          .gte('created_at', lookbackDate)
          .limit(1)

        if (existing && existing.length > 0) {
          skipped++
          continue
        }

        // Resolve category from alert type
        const category =
          alert.alertType === 'daily_settlement_summary'
            ? 'payment'
            : alert.alertType === 'expense_anomaly'
              ? 'payment'
              : alert.alertType === 'budget_variance_warning'
                ? 'payment'
                : 'payment'

        await createNotification({
          tenantId: alert.tenantId,
          recipientId,
          category,
          action: alert.alertType,
          title: alert.title,
          body: alert.body,
          actionUrl: alert.link,
          metadata: {
            ...alert.metadata,
            financial_dedupe_key: dedupeKey,
          },
        })

        notified++
      } catch (err) {
        console.error('[financial-alerts] Failed to send alert:', err)
        skipped++
      }
    }

    const durationMs = Date.now() - startMs
    const result = {
      message: 'Financial alerts complete',
      notified,
      skipped,
      candidates: {
        overdue: overdueAlerts.length,
        anomaly: anomalyAlerts.length,
        variance: varianceAlerts.length,
        settlement: settlementAlerts.length,
      },
    }

    await recordCronHeartbeat('financial-alerts', result, durationMs)
    console.log('[financial-alerts]', result)
    return NextResponse.json(result)
  } catch (err) {
    const durationMs = Date.now() - startMs
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[financial-alerts] Cron failed:', err)
    await recordCronError('financial-alerts', errorMsg, durationMs)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export { handleFinancialAlerts as GET, handleFinancialAlerts as POST }
