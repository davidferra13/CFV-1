// Custom Report Definitions
// Declarative registry of available report types for the Custom Reports Pro feature.
// NOT a server action file - no 'use server'.

export type ReportType =
  | 'revenue-summary'
  | 'client-activity'
  | 'event-performance'
  | 'expense-breakdown'
  | 'pipeline-conversion'

export type ReportPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type ReportDefinition = {
  type: ReportType
  label: string
  description: string
  supportsPeriodGrouping: boolean
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    type: 'revenue-summary',
    label: 'Revenue Summary',
    description: 'Gross revenue, net revenue, refunds, tips, and profit broken down by period.',
    supportsPeriodGrouping: true,
  },
  {
    type: 'client-activity',
    label: 'Client Activity',
    description: 'Bookings per client, total spend, booking frequency, and last event date.',
    supportsPeriodGrouping: false,
  },
  {
    type: 'event-performance',
    label: 'Event Performance',
    description: 'Event counts, revenue, and average margins grouped by month or event type.',
    supportsPeriodGrouping: true,
  },
  {
    type: 'expense-breakdown',
    label: 'Expense Breakdown',
    description: 'Total expenses by category and period, with running totals.',
    supportsPeriodGrouping: true,
  },
  {
    type: 'pipeline-conversion',
    label: 'Pipeline Conversion',
    description: 'Inquiry-to-booking conversion rates, average time to close, and funnel analysis.',
    supportsPeriodGrouping: false,
  },
]

export function getReportDefinition(type: ReportType): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find((d) => d.type === type)
}

export type DateRangeFilter = {
  start: string // ISO date YYYY-MM-DD
  end: string // ISO date YYYY-MM-DD
}

export type ReportConfig = {
  type: ReportType
  dateRange: DateRangeFilter
  period?: ReportPeriod
}

export type SavedReport = {
  id: string
  tenantId: string
  name: string
  config: ReportConfig
  createdAt: string
  updatedAt: string
}
