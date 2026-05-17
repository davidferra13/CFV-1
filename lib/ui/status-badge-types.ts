/** Unified Status Badge and Progress Language types (UI SYSTEM #2) */

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'pending'
  | 'active'

export type ProgressStage =
  | 'not_started'
  | 'in_progress'
  | 'review'
  | 'complete'
  | 'blocked'
  | 'cancelled'

export interface StatusBadgeConfig {
  label: string
  variant: BadgeVariant
  icon?: string
  tooltip?: string
  animate?: boolean
}

export interface EntityStatusMapping {
  id: string
  tenantId: string
  entityType: string
  statusField: string
  statusValue: string
  badgeConfig: StatusBadgeConfig
  createdAt: string
}

export interface ProgressLanguageEntry {
  id: string
  tenantId: string
  entityType: string
  stage: ProgressStage
  label: string
  description: string | null
  percentComplete: number
  createdAt: string
}

export interface StatusBadgeSummary {
  totalMappings: number
  byEntityType: Record<string, number>
  byVariant: Record<string, number>
  unmappedStatuses: string[]
}
