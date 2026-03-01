// Daily Report Cron — generates and emails daily reports for all chefs
// Schedule: 0 11 * * * (7 AM ET)

import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { computeDailyReport } from '@/lib/reports/compute-daily-report'
import { sendEmail } from '@/lib/email/send'
import { DailyReportEmail } from '@/lib/email/templates/daily-report'
import type { DailyReportContent } from '@/lib/reports/types'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase = createServerClient({ admin: true })
  const today = new Date().toISOString().split('T')[0]

  // Fetch all chefs
  const { data: chefs, error: chefsError } = await supabase
    .from('chefs')
    .select('id, auth_user_id, business_name')

  if (chefsError || !chefs) {
    console.error('[daily-report-cron] Failed to fetch chefs:', chefsError)
    return NextResponse.json({ error: 'Failed to fetch chefs' }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const chef of chefs) {
    try {
      // Compute report
      const content = await computeDailyReport(supabase, chef.id, today)

      // Upsert into daily_reports
      await supabase.from('daily_reports').upsert(
        {
          tenant_id: chef.id,
          report_date: today,
          content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,report_date' }
      )

      // Resolve chef email
      if (!chef.auth_user_id) continue
      const { data: authUser } = await supabase.auth.admin.getUserById(chef.auth_user_id)
      if (!authUser?.user?.email) continue

      const chefName = chef.business_name || 'Chef'

      // Send email
      const emailSent = await sendEmail({
        to: authUser.user.email,
        subject: `Daily Report — ${new Date(today + 'T00:00:00Z').toLocaleDateString('en-US', {
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
        // Mark email_sent_at
        await supabase
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

  return NextResponse.json({
    success: true,
    date: today,
    chefs: chefs.length,
    sent,
    failed,
  })
}
