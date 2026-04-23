// Daily Report Cron - generates daily reports for all chefs
// Schedule: 0 11 * * * (7 AM ET)

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { computeDailyReport } from '@/lib/reports/compute-daily-report'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'
import { DAILY_REPORT_EMAIL_REPAIR_KIND } from '@/lib/monitoring/failure-repair'
import { sendDailyReportEmailDelivery } from '@/lib/reports/daily-report-delivery'

const DAILY_REPORT_EMAILS_ENABLED =
  String(process.env.ENABLE_DAILY_REPORT_EMAILS ?? '')
    .trim()
    .toLowerCase() === 'true'

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('daily-report', async () => {
      const db = createServerClient({ admin: true })
      const _now = new Date()
      const today = [
        _now.getFullYear(),
        String(_now.getMonth() + 1).padStart(2, '0'),
        String(_now.getDate()).padStart(2, '0'),
      ].join('-')
      const { data: chefs, error: chefsError } = await db
        .from('chefs')
        .select('id, auth_user_id, business_name')

      if (chefsError || !chefs) {
        console.error('[daily-report-cron] Failed to fetch chefs:', chefsError)
        throw new Error('Failed to fetch chefs')
      }

      let sent = 0
      let failed = 0

      if (!DAILY_REPORT_EMAILS_ENABLED) {
        console.info('[daily-report-cron] Email delivery disabled; generating reports only')
      }

      for (const chef of chefs) {
        try {
          const content = await computeDailyReport(db, chef.id, today)

          await db.from('daily_reports').upsert(
            {
              tenant_id: chef.id,
              report_date: today,
              content,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'tenant_id,report_date' }
          )

          if (!DAILY_REPORT_EMAILS_ENABLED) continue

          try {
            const delivery = await sendDailyReportEmailDelivery({
              tenantId: chef.id,
              reportDate: today,
              content,
            })

            if (!delivery.emailSent) continue

            const emailedAt = new Date().toISOString()
            const { error: markSentError } = await db
              .from('daily_reports')
              .update({ email_sent_at: emailedAt })
              .eq('tenant_id', chef.id)
              .eq('report_date', today)

            if (markSentError) {
              await recordSideEffectFailure({
                source: 'cron:daily-report',
                operation: 'mark_daily_report_email_sent',
                severity: 'high',
                entityType: 'chef',
                entityId: chef.id,
                tenantId: chef.id,
                errorMessage: markSentError.message,
                context: { reportDate: today, emailedAt },
              })
              failed++
              continue
            }

            sent++
          } catch (emailErr) {
            console.error(`[daily-report-cron] Email failed for chef ${chef.id}:`, emailErr)
            await recordSideEffectFailure({
              source: 'cron:daily-report',
              operation: 'send_daily_report_email',
              severity: 'medium',
              entityType: 'chef',
              entityId: chef.id,
              tenantId: chef.id,
              errorMessage: emailErr instanceof Error ? emailErr.message : String(emailErr),
              context: {
                repairKind: DAILY_REPORT_EMAIL_REPAIR_KIND,
                reportDate: today,
              },
            })
            failed++
          }
        } catch (reportErr) {
          console.error(
            `[daily-report-cron] Report generation failed for chef ${chef.id}:`,
            reportErr
          )
          await recordSideEffectFailure({
            source: 'cron:daily-report',
            operation: 'generate_daily_report',
            severity: 'high',
            entityType: 'chef',
            entityId: chef.id,
            tenantId: chef.id,
            errorMessage: reportErr instanceof Error ? reportErr.message : String(reportErr),
            context: { reportDate: today },
          })
          failed++
        }
      }

      return {
        success: true,
        date: today,
        chefs: chefs.length,
        emailsEnabled: DAILY_REPORT_EMAILS_ENABLED,
        sent,
        failed,
      }
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chefs' }, { status: 500 })
  }
}
