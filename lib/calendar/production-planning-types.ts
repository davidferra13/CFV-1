// Production Planning Types
// Data layer types for calendar views: event prep schedules,
// ingredient procurement timelines, and daily workload.

export interface ProductionDay {
  date: string
  events: ProductionEvent[]
  prepTasks: PrepTask[]
  procurementItems: ProcurementItem[]
  workloadHours: number
  capacity: 'light' | 'normal' | 'heavy' | 'overloaded'
}

export interface ProductionEvent {
  eventId: string
  title: string
  guestCount: number
  startTime: string
  menuCount: number
  status: string
}

export interface PrepTask {
  id: string
  eventId: string
  title: string
  estimatedMinutes: number
  scheduledDate: string
  completed: boolean
}

export interface ProcurementItem {
  ingredientName: string
  quantity: number
  unit: string
  neededBy: string
  eventId: string
  ordered: boolean
}

export interface WeeklyProductionPlan {
  weekStart: string
  weekEnd: string
  days: ProductionDay[]
  totalEvents: number
  totalPrepHours: number
  peakDay: string
}

export interface MonthlyDaySummary {
  date: string
  eventCount: number
  capacity: 'light' | 'normal' | 'heavy' | 'overloaded'
}

export interface ProductionConflict {
  date: string
  type: 'overlap' | 'overloaded'
  description: string
  eventIds: string[]
}
