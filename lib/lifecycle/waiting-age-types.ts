// Waiting Age + Owner Language types

export type AgeBracket = 'fresh' | 'normal' | 'aging' | 'stale' | 'critical'

export interface WaitingAgeConfig {
  id: string
  tenantId: string
  lifecycleStage: string
  bracket: AgeBracket
  minDays: number
  maxDays: number | null
  label: string
  color: string
  icon: string | null
  escalationAction: string | null
  createdAt: Date
}

export interface OwnerLanguageRule {
  id: string
  tenantId: string
  lifecycleStage: string
  ageBracket: AgeBracket
  ownerType: 'chef' | 'client' | 'vendor' | 'system'
  messageTemplate: string
  tone: 'neutral' | 'urgent' | 'friendly' | 'formal'
  createdAt: Date
}

export interface WaitingAgeSummary {
  totalConfigs: number
  totalLanguageRules: number
  stagesCovered: string[]
  itemsByBracket: Record<AgeBracket, number>
}
