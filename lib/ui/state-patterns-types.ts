/**
 * UI State Patterns - Types
 * Operational empty/loading/error/success state management
 */

export type UIStateType = 'empty' | 'loading' | 'error' | 'success' | 'partial'

export interface StatePatternConfig {
  id: string
  tenantId: string
  route: string
  component: string
  stateType: UIStateType
  title: string
  message: string | null
  icon: string | null
  actionLabel: string | null
  actionHref: string | null
  illustration: string | null
  createdAt: string
}

export interface StatePatternAudit {
  id: string
  tenantId: string
  route: string
  component: string
  hasEmptyState: boolean
  hasLoadingState: boolean
  hasErrorState: boolean
  hasSuccessState: boolean
  score: number
  auditedAt: string
}

export interface StatePatternSummary {
  totalComponents: number
  fullyHandled: number
  partiallyHandled: number
  unhandled: number
  byStateType: Record<UIStateType, number>
  coveragePercent: number
}
