export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low'
export type TaskStatus = 'unassigned' | 'assigned' | 'in_progress' | 'completed' | 'blocked'

export interface StaffTask {
  id: string
  tenantId: string
  eventId: string | null
  assigneeId: string | null
  assigneeName: string | null
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  dueAt: string | null
  completedAt: string | null
  category: string
  createdAt: string
  updatedAt: string
}

export interface StaffWorkload {
  staffId: string
  staffName: string
  activeTasks: number
  completedToday: number
  upcomingEvents: number
  hoursScheduled: number
}

export interface ShiftAssignment {
  id: string
  tenantId: string
  staffId: string
  eventId: string
  role: string
  startTime: string
  endTime: string
  confirmed: boolean
  notes: string | null
}

export interface TaskBoard {
  unassigned: StaffTask[]
  inProgress: StaffTask[]
  completed: StaffTask[]
  blocked: StaffTask[]
}
