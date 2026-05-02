'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getStoryData, type StoryData } from '@/lib/stories/story-data'
import { buildCsvSafe } from '@/lib/security/csv-sanitize'

// Event Storytelling Report
// Module: more (analytics)
// Comprehensive post-event narrative: what happened, menu, financials,
// guest feedback, photos. Deterministic assembly; AI narrative via AAR.

export type EventReportData = {
  story: StoryData
  financials: {
    revenueCents: number
    expenseCents: number
    grossProfitCents: number
    marginPct: number
    foodCostCents: number
    foodCostPct: number
    laborCostCents: number
    laborCostPct: number
  }
  timeline: {
    createdAt: string | null
    proposedAt: string | null
    acceptedAt: string | null
    confirmedAt: string | null
    completedAt: string | null
  }
  feedback: {
    aarFiled: boolean
    calmRating: number | null
    executionRating: number | null
    whatWentWell: string | null
    whatWentWrong: string | null
  }
  photoCount: number
  generatedAt: string
}

/**
 * Assemble full event storytelling report from existing data.
 * Combines story data, financials, timeline, AAR feedback, and photos.
 */
export async function getEventReport(eventId: string): Promise<EventReportData> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Parallel fetch: story + financials + transitions + AAR + photos
  const [story, ledgerResult, transitionsResult, aarResult, photoResult, laborResult] =
    await Promise.all([
      getStoryData(eventId),

      // Revenue and expenses from ledger
      db
        .from('ledger_entries')
        .select('amount_cents, entry_type, is_refund')
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId),

      // Event transitions for timeline
      db
        .from('event_transitions')
        .select('to_status, created_at')
        .eq('event_id', eventId)
        .order('created_at'),

      // AAR for feedback
      db
        .from('after_action_reviews')
        .select('calm_rating, execution_rating, what_went_well, what_went_wrong')
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId)
        .maybeSingle(),

      // Photo count
      db
        .from('event_photos')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId),

      // Labor cost from staff assignments
      db
        .from('event_staff_assignments')
        .select('pay_amount_cents')
        .eq('event_id', eventId)
        .eq('chef_id', tenantId),
    ])

  // Compute financials from ledger
  let revenueCents = 0
  let expenseCents = 0
  for (const row of ledgerResult.data ?? []) {
    if (row.is_refund || row.entry_type === 'refund') {
      revenueCents -= Math.abs(row.amount_cents)
    } else if (row.entry_type === 'expense') {
      expenseCents += Math.abs(row.amount_cents)
    } else if (row.entry_type !== 'tip') {
      revenueCents += row.amount_cents
    }
  }

  const laborCostCents = (laborResult.data ?? []).reduce(
    (sum: number, r: any) => sum + (r.pay_amount_cents ?? 0),
    0
  )

  // Food cost = expenses minus labor (rough approximation)
  const foodCostCents = Math.max(0, expenseCents - laborCostCents)
  const grossProfitCents = revenueCents - expenseCents
  const marginPct = revenueCents > 0 ? (grossProfitCents / revenueCents) * 100 : 0
  const foodCostPct = revenueCents > 0 ? (foodCostCents / revenueCents) * 100 : 0
  const laborCostPct = revenueCents > 0 ? (laborCostCents / revenueCents) * 100 : 0

  // Build timeline from transitions
  const transitions = transitionsResult.data ?? []
  const transMap: Record<string, string> = {}
  for (const t of transitions) {
    transMap[(t as any).to_status] = (t as any).created_at
  }

  const aar = aarResult.data

  return {
    story,
    financials: {
      revenueCents,
      expenseCents,
      grossProfitCents,
      marginPct: Math.round(marginPct * 10) / 10,
      foodCostCents,
      foodCostPct: Math.round(foodCostPct * 10) / 10,
      laborCostCents,
      laborCostPct: Math.round(laborCostPct * 10) / 10,
    },
    timeline: {
      createdAt: transMap['draft'] ?? null,
      proposedAt: transMap['proposed'] ?? null,
      acceptedAt: transMap['accepted'] ?? null,
      confirmedAt: transMap['confirmed'] ?? null,
      completedAt: transMap['completed'] ?? null,
    },
    feedback: {
      aarFiled: !!aar,
      calmRating: aar?.calm_rating ?? null,
      executionRating: aar?.execution_rating ?? null,
      whatWentWell: aar?.what_went_well ?? null,
      whatWentWrong: aar?.what_went_wrong ?? null,
    },
    photoCount: photoResult.count ?? 0,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Export event report as CSV for record-keeping.
 */
export async function exportEventReportCSV(
  eventId: string
): Promise<{ csv: string; filename: string }> {
  const report = await getEventReport(eventId)

  const headers = ['Field', 'Value']
  const rows: string[][] = [
    ['Event', report.story.occasion ?? 'Untitled'],
    ['Date', report.story.eventDate],
    ['Guests', String(report.story.guestCount)],
    ['Service Style', report.story.serviceStyle ?? '-'],
    [
      'Location',
      [report.story.locationCity, report.story.locationState].filter(Boolean).join(', ') || '-',
    ],
    ['Menu', report.story.menuName ?? '-'],
    ['Cuisine', report.story.cuisineType ?? '-'],
    ['Courses', String(report.story.courseCount)],
    ['Dietary Accommodations', String(report.story.dietaryAccommodations)],
    ['Revenue', `$${(report.financials.revenueCents / 100).toFixed(2)}`],
    ['Expenses', `$${(report.financials.expenseCents / 100).toFixed(2)}`],
    [
      'Food Cost',
      `$${(report.financials.foodCostCents / 100).toFixed(2)} (${report.financials.foodCostPct}%)`,
    ],
    [
      'Labor Cost',
      `$${(report.financials.laborCostCents / 100).toFixed(2)} (${report.financials.laborCostPct}%)`,
    ],
    [
      'Gross Profit',
      `$${(report.financials.grossProfitCents / 100).toFixed(2)} (${report.financials.marginPct}%)`,
    ],
    ['Photos', String(report.photoCount)],
    ['AAR Filed', report.feedback.aarFiled ? 'Yes' : 'No'],
  ]

  if (report.story.dishes.length > 0) {
    rows.push(['--- Menu ---', ''])
    for (const dish of report.story.dishes) {
      rows.push([`Course ${dish.courseNumber}: ${dish.courseName}`, dish.description ?? ''])
    }
  }

  const csv = buildCsvSafe(headers, rows)
  const dateStr = report.story.eventDate.split('T')[0]
  const filename = `event-report-${dateStr}.csv`
  return { csv, filename }
}
