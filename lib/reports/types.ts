// Daily Report Type Definitions

import type { DerivedOutputProvenance } from '@/lib/analytics/source-provenance'

export type DailyReportEvent = {
  eventId: string
  occasion: string | null
  clientName: string
  serveTime: string | null
  guestCount: number | null
  status: string
}

export type HighIntentVisit = {
  clientName: string
  clientId: string
  eventType: string
  time: string
}

export type ExpiringQuote = {
  clientName: string
  validUntil: string
  amountCents: number
}

export type DormantClient = {
  clientId: string
  clientName: string
  daysSinceLastEvent: number
  lifetimeValueCents: number
}

export type ClientMilestone = {
  clientId: string
  clientName: string
  type: 'birthday' | 'anniversary' | 'milestone'
  label: string
  date: string
  daysUntil: number
}

export type NextAction = {
  clientName: string
  label: string
  description: string
  href: string
  urgency: 'critical' | 'high' | 'normal' | 'low'
}

export type ScheduleConflict = {
  date: string
  eventCount: number
}

export type DailyReportContent = {
  // Today's Schedule
  eventsToday: DailyReportEvent[]
  upcomingEventsNext7d: number

  // Pipeline
  newInquiriesToday: number
  inquiryStats: Record<string, number>
  quotesExpiringSoon: number
  expiringQuoteDetails: ExpiringQuote[]
  staleFollowUps: number

  // Revenue
  paymentsReceivedTodayCents: number
  monthRevenueToDateCents: number
  monthOverMonthChangePercent: number
  outstandingBalanceCents: number
  pipelineForecastCents: number

  // Response Time
  avgResponseTimeHours: number | null
  overdueResponses: number

  // Food Cost
  foodCostAvgPercent: number | null
  foodCostTrending: 'rising' | 'falling' | 'stable'

  // Closure Streak
  closureStreak: number
  longestStreak: number

  // Client Activity
  highIntentVisits: HighIntentVisit[]
  clientLoginsYesterday: number

  // Client Milestones
  upcomingMilestones: ClientMilestone[]

  // Dormant Clients
  dormantClients: DormantClient[]

  // Schedule Conflicts
  scheduleConflicts: ScheduleConflict[]

  // Next Best Actions
  nextBestActions: NextAction[]

  // Closure Tasks
  openClosureTasks: number

  // Metadata
  generatedAt: string
  provenance?: DerivedOutputProvenance

  // AI-generated narrative summary (non-blocking, may be null if AI unavailable)
  aiNarrative?: string | null
}

export type DailyReport = {
  id: string
  tenantId: string
  reportDate: string
  content: DailyReportContent
  emailSentAt: string | null
  createdAt: string
}

export type DailyReportSummary = {
  reportDate: string
  eventsCount: number
  revenueCents: number
  newInquiries: number
}
