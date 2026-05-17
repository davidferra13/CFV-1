// Rail Navigation Types - Event lifecycle rail progression + stage navigation

export type RailProgressStatus = 'pending' | 'active' | 'completed' | 'skipped'

export interface RailStage {
  id: string
  tenantId: string
  stageName: string
  label: string
  icon: string | null
  sortOrder: number
  color: string | null
  completionCriteria: Record<string, unknown> | null
  createdAt: Date
}

export interface RailProgress {
  id: string
  tenantId: string
  eventId: string
  stageId: string
  status: RailProgressStatus
  completedAt: Date | null
  completionPercent: number
  blockers: string[]
  createdAt: Date
}

export interface RailNavShortcut {
  id: string
  tenantId: string
  stageName: string
  shortcutLabel: string
  targetRoute: string
  hotkey: string | null
  createdAt: Date
}

export interface RailSummary {
  eventId: string
  totalStages: number
  completedStages: number
  currentStage: string | null
  completionPercent: number
  estimatedCompletion: Date | null
}
