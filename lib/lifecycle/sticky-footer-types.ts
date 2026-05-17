// Sticky Footer configuration types for mobile lifecycle action bar

export type FooterActionType = 'primary' | 'secondary' | 'danger' | 'info'

export interface StickyFooterConfig {
  id: string
  tenantId: string
  lifecycleStage: string
  actionLabel: string
  actionType: FooterActionType
  icon: string | null
  targetRoute: string | null
  sortOrder: number
  showBadge: boolean
  badgeCount: number | null
  visible: boolean
  createdAt: Date
}

export interface StickyFooterOverride {
  id: string
  tenantId: string
  eventId: string
  lifecycleStage: string
  configId: string
  overrideLabel: string | null
  overrideAction: string | null
  visible: boolean
  createdAt: Date
}

export interface StickyFooterSummary {
  totalConfigs: number
  totalOverrides: number
  stagesCovered: string[]
  avgActionsPerStage: number
}
