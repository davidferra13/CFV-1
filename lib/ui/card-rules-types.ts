export type CardType = 'event' | 'client' | 'menu' | 'recipe' | 'invoice' | 'task' | 'metric' | 'notification'

export type CardSection = 'header' | 'body' | 'footer' | 'actions' | 'media' | 'metadata'

export type CardCompositionRule = {
  id: string
  tenantId: string
  cardType: CardType
  section: CardSection
  maxItems: number | null
  required: boolean
  order: number
  description: string | null
  createdAt: Date
}

export type CardAudit = {
  id: string
  tenantId: string
  route: string
  cardType: CardType
  violations: unknown[]
  score: number
  auditedAt: Date
}

export type CardRulesSummary = {
  totalRules: number
  byCardType: Record<CardType, number>
  totalAudits: number
  avgScore: number
  worstCards: Array<{ route: string; cardType: string; score: number }>
}
