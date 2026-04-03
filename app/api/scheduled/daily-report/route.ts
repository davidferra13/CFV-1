// Daily Report Cron - generates and emails daily reports for all chefs
// Schedule: 0 11 * * * (7 AM ET)

import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { createServerClient } from '@/lib/db/server'
import { computeDailyReport } from '@/lib/reports/compute-daily-report'
import { sendEmail } from '@/lib/email/send'
import { DailyReportEmail } from '@/lib/email/templates/daily-report'
import type { DailyReportContent } from '@/lib/reports/types'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('daily-report', async () => {
      const db = createServerClient({ admin: true })
      const today = new Date().toISOString().split('T')[0]
      const { data: chefs, error: chefsError } = await db
        .from('chefs')
        .select('id, auth_user_id, business_name')

      if (chefsError || !chefs) {
        console.error('[daily-report-cron] Failed to fetch chefs:', chefsError)
        throw new Error('Failed to fetch chefs')
      }

      let sent = 0
      let failed = 0

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

          if (!chef.auth_user_id) continue
          const { data: authUser } = await db.auth.admin.getUserById(chef.auth_user_id)
          if (!authUser?.user?.email) continue

          const chefName = chef.business_name || 'Chef'
          const emailSent = await sendEmail({
            to: authUser.user.email,
            subject: `Daily Report - ${new Date(today + 'T00:00:00Z').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}`,
            react: createElement(DailyReportEmail, {
              chefName,
              reportDate: today,
              content,
              reportUrl: `${APP_URL}/analytics/daily-report`,
            }),
          })

          if (emailSent) {
            await db
              .from('daily_reports')
              .update({ email_sent_at: new Date().toISOString() })
              .eq('tenant_id', chef.id)
              .eq('report_date', today)
            sent++
          } else {
            failed++
          }
        } catch (err) {
          console.error(`[daily-report-cron] Failed for chef ${chef.id}:`, err)
          failed++
        }
      }

      return {
        success: true,
        date: today,
        chefs: chefs.length,
        sent,
        failed,
      }
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chefs' }, { status: 500 })
  }
}
