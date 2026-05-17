export type ActionBarContext =
  | 'event_detail'
  | 'client_detail'
  | 'menu_editor'
  | 'dashboard'
  | 'calendar'
  | 'finance'
  | 'settings'

export type ActionBarVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

export interface ActionBarItem {
  id: string
  label: string
  icon?: string | null
  href?: string | null
  variant: ActionBarVariant
  order: number
  requiredStage?: string | null
  visibleWhen?: string | null
  disabled?: boolean
}

export interface ActionBarConfig {
  id: string
  tenantId: string
  context: ActionBarContext
  items: ActionBarItem[]
  lifecycleStage?: string | null
  createdAt: string
  updatedAt: string
}

export interface ActionBarUsageLog {
  id: string
  tenantId: string
  context: ActionBarContext
  actionId: string
  lifecycleStage?: string | null
  usedAt: string
}

export interface ActionBarSummary {
  totalConfigs: number
  byContext: Record<string, number>
  mostUsedActions: Array<{ actionId: string; count: number }>
  leastUsedActions: Array<{ actionId: string; count: number }>
}
