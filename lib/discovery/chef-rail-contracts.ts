export type ChefRailCategory =
  | 'opening'
  | 'follow_up'
  | 'event_risk'
  | 'menu_opportunity'
  | 'partner_lead'

export type ChefRailLifecycleState =
  | 'candidate'
  | 'eligible'
  | 'shown'
  | 'acted_on'
  | 'snoozed'
  | 'dismissed'
  | 'resolved'
  | 'converted'
  | 'expired'
  | 'suppressed'

export type ChefRailAction =
  | 'open_inquiry'
  | 'send_follow_up'
  | 'promote_opening'
  | 'create_menu_draft'
  | 'attach_event_note'
  | 'mark_risk_resolved'
  | 'open_workflow'

export interface ChefRailCandidate {
  id: string
  tenantId: string
  category: ChefRailCategory
  title: string
  reasonCode: string
  reason: string
  href: string
  action: ChefRailAction
  urgency: number
  moneyImpact: number
  eventRisk: number
  relationshipValue: number
  confidence: number
  freshness: number
  actionability: number
  createdAt: string
  expiresAt?: string | null
}

export interface ChefRailState {
  itemId: string
  tenantId: string
  state: ChefRailLifecycleState
  updatedAt: string
  snoozedUntil?: string | null
}

export interface ChefRailSettings {
  enabledCategories: Partial<Record<ChefRailCategory, boolean>>
  categoryWeights: Partial<Record<ChefRailCategory, number>>
}

export interface RankedChefRailItem extends ChefRailCandidate {
  score: number
}

export interface ChefRailAuditEvent {
  itemId: string
  tenantId: string
  event: 'shown' | 'clicked' | 'dismissed' | 'snoozed' | 'resolved' | 'promoted' | 'converted'
  category: ChefRailCategory
  reasonCode: string
  occurredAt: string
}

export const CHEF_RAIL_ALLOWED_ACTIONS: Record<ChefRailCategory, ChefRailAction[]> = {
  opening: ['promote_opening', 'open_workflow'],
  follow_up: ['open_inquiry', 'send_follow_up', 'open_workflow'],
  event_risk: ['attach_event_note', 'mark_risk_resolved', 'open_workflow'],
  menu_opportunity: ['create_menu_draft', 'open_workflow'],
  partner_lead: ['open_workflow'],
}
