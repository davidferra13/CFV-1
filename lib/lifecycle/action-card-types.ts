// Lifecycle Action Cards - Types (LIFECYCLE #5)

export type ActionCardPriority = 'critical' | 'high' | 'normal' | 'low'

export type ActionCardActionType = 'navigate' | 'execute' | 'confirm' | 'delegate'

export interface ActionCard {
  id: string
  tenantId: string
  eventId: string
  lifecycleStage: string
  title: string
  description: string | null
  actionType: ActionCardActionType
  targetRoute: string | null
  priority: ActionCardPriority
  dueAt: Date | null
  completedAt: Date | null
  dismissedAt: Date | null
  createdAt: Date
}

export interface ActionRecommendation {
  id: string
  tenantId: string
  lifecycleStage: string
  triggerCondition: Record<string, unknown>
  recommendedAction: string
  title: string
  description: string | null
  autoCreate: boolean
  createdAt: Date
}

export interface ActionCardSummary {
  eventId: string
  totalCards: number
  pendingCards: number
  overdueCards: number
  completedCards: number
  criticalCount: number
}
