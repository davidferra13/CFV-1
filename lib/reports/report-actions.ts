'use server'

// Custom Reports Server Actions
// All Pro-gated. Tenant ID derived from session, never from input.

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { ReportType, ReportConfig, DateRangeFilter, ReportPeriod } from './report-definitions'
import {
  generateRevenueReport,
  generateClientReport,
  generateEventReport,
  generateExpenseReport,
  generatePipelineReport,
} from './report-generators'
import type {
  RevenueSummaryReport,
  ClientActivityReport,
  EventPerformanceReport,
  ExpenseBreakdownReport,
  PipelineConversionReport,
} from './report-generators'

// ── Types ────────────────────────────────────────────────────────────────

export type GeneratedReport =
  | { type: 'revenue-summary'; data: RevenueSummaryReport }
  | { type: 'client-activity'; data: ClientActivityReport }
  | { type: 'event-performance'; data: EventPerformanceReport }
  | { type: 'expense-breakdown'; data: ExpenseBreakdownReport }
  | { type: 'pipeline-conversion'; data: PipelineConversionReport }

export type SavedReportRow = {
  id: string
  name: string
  report_type: string
  config: ReportConfig
  created_at: string
  updated_at: string
}

// ── Generate Report ──────────────────────────────────────────────────────

export async function generateReport(
  type: ReportType,
  dateRange: DateRangeFilter,
  period?: ReportPeriod
): Promise<{ success: true; report: GeneratedReport } | { success: false; error: string }> {
  await requirePro('advanced-analytics')
  const user = await requireChef()
  const tenantId = user.tenantId!

  try {
    switch (type) {
      case 'revenue-summary': {
        const data = await generateRevenueReport(tenantId, dateRange, period || 'monthly')
        return { success: true, report: { type, data } }
      }
      case 'client-activity': {
        const data = await generateClientReport(tenantId, dateRange)
        return { success: true, report: { type, data } }
      }
      case 'event-performance': {
        const data = await generateEventReport(tenantId, dateRange, period || 'monthly')
        return { success: true, report: { type, data } }
      }
      case 'expense-breakdown': {
        const data = await generateExpenseReport(tenantId, dateRange, period || 'monthly')
        return { success: true, report: { type, data } }
      }
      case 'pipeline-conversion': {
        const data = await generatePipelineReport(tenantId, dateRange)
        return { success: true, report: { type, data } }
      }
      default:
        return { success: false, error: `Unknown report type: ${type}` }
    }
  } catch (err) {
    console.error('[custom-reports] generateReport failed', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Report generation failed',
    }
  }
}

// ── Saved Reports CRUD ───────────────────────────────────────────────────

export async function getSavedReports(): Promise<SavedReportRow[]> {
  await requirePro('advanced-analytics')
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('saved_reports')
    .select('id, name, report_type, config, created_at, updated_at')
    .eq('chef_id', user.tenantId!)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[custom-reports] getSavedReports failed', error)
    return []
  }

  return (data || []) as SavedReportRow[]
}

export async function saveReport(
  name: string,
  config: ReportConfig
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  await requirePro('advanced-analytics')
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('saved_reports')
    .insert({
      chef_id: user.tenantId!,
      name,
      report_type: config.type,
      config,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[custom-reports] saveReport failed', error)
    return { success: false, error: 'Failed to save report configuration' }
  }

  revalidatePath('/reports')
  return { success: true, id: data.id }
}

export async function deleteReport(
  reportId: string
): Promise<{ success: true } | { success: false; error: string }> {
  await requirePro('advanced-analytics')
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('saved_reports')
    .delete()
    .eq('id', reportId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[custom-reports] deleteReport failed', error)
    return { success: false, error: 'Failed to delete report' }
  }

  revalidatePath('/reports')
  return { success: true }
}
