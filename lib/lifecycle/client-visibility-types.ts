// Client Visibility and Redaction Rules (Lifecycle #12)
// Controls what lifecycle data clients can see vs. chef-only/system-only fields.

export type VisibilityLevel = 'public' | 'client-visible' | 'chef-only' | 'system-only'

export type VisibilityEntityType = 'event' | 'menu' | 'invoice' | 'note' | 'timeline'

export interface VisibilityRule {
  id: string
  tenantId: string
  lifecycleStage: string
  fieldName: string
  entityType: VisibilityEntityType
  visibility: VisibilityLevel
  redactWith: string | null
  reason: string | null
  createdAt: Date
}

export interface RedactionPolicy {
  id: string
  tenantId: string
  name: string
  description: string | null
  rules: RedactionFieldRule[]
  appliesTo: string[]
  active: boolean
  createdAt: Date
}

export interface RedactionFieldRule {
  fieldName: string
  entityType: VisibilityEntityType
  visibility: VisibilityLevel
  redactWith?: string
}

export interface VisibilitySummary {
  totalRules: number
  totalPolicies: number
  activePolicies: number
  fieldsCovered: number
  redactedFieldCount: number
}

export interface UpsertVisibilityRuleParams {
  id?: string
  lifecycleStage: string
  fieldName: string
  entityType: VisibilityEntityType
  visibility: VisibilityLevel
  redactWith?: string
  reason?: string
}

export interface UpsertRedactionPolicyParams {
  id?: string
  name: string
  description?: string
  rules: RedactionFieldRule[]
  appliesTo: string[]
  active?: boolean
}
