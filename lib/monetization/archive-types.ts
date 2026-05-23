// Beta Monetization Archive Types (P57)

export type DecisionCategory =
  | 'free-tier'
  | 'paid-tier'
  | 'pricing-changes'
  | 'billing-policy'
  | 'trial-period'
  | 'discount'
  | 'refund-policy'

export type MonetizationDecision = {
  id: string
  decisionType: string
  category: DecisionCategory
  rationale: string
  decidedBy: string
  decidedAt: string
  supersededBy: string | null
  tenantId: string
}

export type MonetizationDecisionInput = {
  decisionType: string
  category: DecisionCategory
  rationale: string
  supersedes?: string
}

export type DecisionHistoryPage = {
  decisions: MonetizationDecision[]
  total: number
  page: number
  pageSize: number
}
