// Daily Report Server Actions
// User-facing actions for the daily report app page.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { computeDailyReport } from './compute-daily-report'
import type { DailyReport, DailyReportContent, DailyReportSummary } from './types'

/**
 * Generate (or regenerate) the daily report for a given date.
 * Computes all metrics and upserts into daily_reports.
 */
export async function generateDailyReport(date?: string): Promise<DailyReport> {
  const user = await requireChef()
  const supabase = createServerClient({ admin: true })

  const reportDate = date ?? new Date().toISOString().split('T')[0]

  // Compute the report
  const content = await computeDailyReport(supabase, user.tenantId!, reportDate)

  // Upsert
  const { data, error } = await supabase
    .from('daily_reports')
    .upsert(
      {
        tenant_id: user.tenantId!,
        report_date: reportDate,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,report_date' }
    )
    .select()
    .single()

  if (error) {
    console.error('[generateDailyReport] Error:', error)
    throw new Error('Failed to generate daily report')
  }

  return {
    id: data.id,
    tenantId: data.tenant_id,
    reportDate: data.report_date,
    content: data.content as DailyReportContent,
    emailSentAt: data.email_sent_at,
    createdAt: data.created_at,
  }
}

/**
 * Get the daily report for a given date. Defaults to today.
 * Returns null if no report has been generated yet.
 */
export async function getDailyReport(date?: string): Promise<DailyReport | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  const reportDate = date ?? new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('report_date', reportDate)
    .maybeSingle()

  if (error) {
    console.error('[getDailyReport] Error:', error)
    return null
  }

  if (!data) return null

  return {
    id: data.id,
    tenantId: data.tenant_id,
    reportDate: data.report_date,
    content: data.content as DailyReportContent,
    emailSentAt: data.email_sent_at,
    createdAt: data.created_at,
  }
}

/**
 * List recent daily report summaries for the history browser.
 */
export async function getDailyReportHistory(limit = 30): Promise<DailyReportSummary[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('daily_reports')
    .select('report_date, content')
    .eq('tenant_id', user.tenantId!)
    .order('report_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getDailyReportHistory] Error:', error)
    return []
  }

  return (data || []).map((row) => {
    const content = row.content as DailyReportContent
    return {
      reportDate: row.report_date,
      eventsCount: content?.eventsToday?.length ?? 0,
      revenueCents: content?.paymentsReceivedTodayCents ?? 0,
      newInquiries: content?.newInquiriesToday ?? 0,
    }
  })
}
