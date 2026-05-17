// Widget Types - Home Screen Widget Data Shapes
// Powers Android/PWA home screen widgets with live chef data.

export type WidgetType = 'today_schedule' | 'quick_stats' | 'upcoming_events' | 'prep_countdown' | 'revenue_tracker'

export interface WidgetConfig {
  id: string
  tenantId: string
  widgetType: WidgetType
  position: number
  settings: Record<string, unknown>
  enabled: boolean
  createdAt: string
}

export interface TodayScheduleWidget {
  date: string
  events: { id: string; title: string; time: string; guests: number; status: string }[]
  prepTasks: { title: string; estimatedMinutes: number; completed: boolean }[]
}

export interface QuickStatsWidget {
  eventsThisWeek: number
  eventsThisMonth: number
  pendingInquiries: number
  outstandingInvoices: number
  revenueThisMonth: number
}

export interface UpcomingEventsWidget {
  events: { id: string; title: string; date: string; clientName: string; guests: number; daysUntil: number }[]
}

export interface PrepCountdownWidget {
  nextEvent: { title: string; date: string; hoursUntil: number } | null
  prepItems: { title: string; dueIn: string; priority: 'high' | 'normal' }[]
}
