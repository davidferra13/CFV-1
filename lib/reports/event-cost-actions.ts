'use server'

// Event Cost Report Server Actions
// Auth-gated wrappers around the cost report generator.

import { requireChef } from '@/lib/auth/get-user'
import { generateEventCostReport, type EventCostReport } from './event-cost-report'

/**
 * Get the full event cost report for display on the report page.
 * Auth-gated, tenant-scoped.
 */
export async function getEventCostReport(
  eventId: string
): Promise<EventCostReport | null> {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('No tenant')
  if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')

  return generateEventCostReport(eventId, user.tenantId)
}

/**
 * Actual vs quoted comparison for quick display.
 * Returns a simplified view for widgets or summary cards.
 */
export async function getEventCostComparison(eventId: string) {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('No tenant')
  if (!eventId || typeof eventId !== 'string') throw new Error('Invalid event ID')

  const report = await generateEventCostReport(eventId, user.tenantId)
  if (!report) return null

  const varianceCents = report.actualCosts.total - report.quotedTotalCents
  const variancePercent =
    report.quotedTotalCents > 0
      ? parseFloat(((varianceCents / report.quotedTotalCents) * 100).toFixed(1))
      : null

  return {
    eventName: report.eventName,
    eventDate: report.eventDate,
    quotedTotalCents: report.quotedTotalCents,
    actualTotalCents: report.actualCosts.total,
    varianceCents,
    variancePercent,
    profitCents: report.profitCents,
    profitMarginPercent: report.profitMarginPercent,
    categoryBreakdown: report.categoryBreakdown,
  }
}
