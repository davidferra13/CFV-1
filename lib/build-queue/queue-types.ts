export const BUILD_QUEUE_STATUSES = [
  'SPEC-READY',
  'PARTIAL',
  'DRAFT',
  'UNSPECCED',
  'BLOCKED',
  'IN-FLIGHT',
  'DONE',
] as const

export type BuildQueueStatus = (typeof BUILD_QUEUE_STATUSES)[number]

export interface BuildQueueItem {
  id: number
  category: string
  title: string
  status: BuildQueueStatus
  dependsOn: string[]
  notes: string
}

export interface BuildQueueCategory {
  name: string
  itemCount: number
  items: BuildQueueItem[]
}

export interface BuildQueueSummary {
  total: number
  byStatus: Record<BuildQueueStatus, number>
  completionPercentage: number
  categories: Array<{ name: string; total: number; done: number }>
}

export interface BuildQueueFilter {
  status?: BuildQueueStatus | BuildQueueStatus[]
  category?: string
  search?: string
}
