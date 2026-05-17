export type ActionTier = 'primary' | 'secondary' | 'tertiary' | 'hidden'

export type CollapseBehavior = 'dropdown' | 'overflow' | 'hide'

export type LifecycleActionRule = {
  id: string
  tenantId: string
  lifecycleStage: string
  actionName: string
  tier: ActionTier
  visualWeight: number
  sortOrder: number
  contextCondition: Record<string, unknown> | null
  createdAt: Date
}

export type ActionGroupConfig = {
  id: string
  tenantId: string
  groupName: string
  lifecycleStage: string
  maxVisible: number
  collapseBehavior: CollapseBehavior
  createdAt: Date
}

export type ActionHierarchySummary = {
  totalRules: number
  totalGroups: number
  stagesCovered: string[]
  ungroupedActions: number
}
