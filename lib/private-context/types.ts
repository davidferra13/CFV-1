// Private Context, Secret Orchestration, and Complimentary Intelligence types

// ============================================================
// PRIVATE CONTEXT LAYER
// ============================================================

export type PrivateContextEntityType = 'event' | 'client' | 'menu' | 'circle' | 'dish' | 'recipe'
export type PrivateContextType = 'note' | 'reminder' | 'observation' | 'intention' | 'item'

export interface ChefPrivateContext {
  id: string
  tenant_id: string
  entity_type: PrivateContextEntityType
  entity_id: string
  context_type: PrivateContextType
  title: string | null
  content: string | null
  structured_data: Record<string, unknown>
  pinned: boolean
  archived: boolean
  remind_at: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// SECRET ORCHESTRATION
// ============================================================

export type SecretType = 'menu_item' | 'surprise_dish' | 'gift' | 'experience' | 'moment'
export type SecretVisibilityScope = 'chef_only' | 'chef_and_selected' | 'participant_only'
export type SecretStatus = 'planning' | 'ready' | 'revealed' | 'cancelled'
export type SecretAuthorType = 'chef' | 'participant'
export type SecretAssetType = 'ingredient' | 'design' | 'timing' | 'equipment' | 'other'
export type SecretAssetStatus = 'needed' | 'sourced' | 'ready'

export interface EventSecret {
  id: string
  tenant_id: string
  event_id: string
  circle_group_id: string | null
  secret_type: SecretType
  title: string
  description: string | null
  structured_data: Record<string, unknown>
  visibility_scope: SecretVisibilityScope
  reveal_timing: string | null
  reveal_at: string | null
  status: SecretStatus
  execution_notes: string | null
  estimated_cost_cents: number
  actual_cost_cents: number | null
  created_at: string
  updated_at: string
}

export interface EventSecretParticipant {
  id: string
  secret_id: string
  profile_id: string
  can_edit: boolean
  added_at: string
  added_by_tenant_id: string
}

export interface EventSecretThread {
  id: string
  secret_id: string
  author_type: SecretAuthorType
  author_id: string
  message: string
  created_at: string
}

export interface EventSecretAsset {
  id: string
  secret_id: string
  asset_type: SecretAssetType
  description: string
  quantity: string | null
  estimated_cost_cents: number
  status: SecretAssetStatus
  created_at: string
}

// Full secret with nested data for UI
export interface EventSecretFull extends EventSecret {
  participants: EventSecretParticipant[]
  threads: EventSecretThread[]
  assets: EventSecretAsset[]
}

// ============================================================
// COMPLIMENTARY INTELLIGENCE
// ============================================================

export type CompItemType = 'true_comp' | 'piggyback' | 'reuse'
export type CompSuggestionSource = 'ai' | 'manual' | 'carry_forward' | 'intelligence'
export type CompItemStatus = 'suggested' | 'accepted' | 'rejected' | 'executed'

export type CompSuggestionType =
  | 'unselected_preference'
  | 'repeated_interest'
  | 'celebration'
  | 'excess_production'
  | 'high_margin'
  | 'reusable_component'
  | 'client_pattern'

export type CompEffortLevel = 'minimal' | 'moderate' | 'significant'
export type CompSuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

export interface ComplimentaryItem {
  id: string
  tenant_id: string
  event_id: string
  secret_id: string | null
  item_type: CompItemType
  name: string
  description: string | null
  estimated_cost_cents: number
  actual_cost_cents: number | null
  suggestion_source: CompSuggestionSource
  suggestion_reason: string | null
  status: CompItemStatus
  client_reaction: string | null
  retention_impact: string | null
  created_at: string
  executed_at: string | null
}

export interface ComplimentarySuggestion {
  id: string
  tenant_id: string
  event_id: string
  suggestion_type: CompSuggestionType
  title: string
  description: string | null
  reasoning: string | null
  estimated_cost_cents: number
  effort_level: CompEffortLevel
  confidence_score: number
  status: CompSuggestionStatus
  source_data: Record<string, unknown>
  created_at: string
  expires_at: string | null
}

// ============================================================
// ENGINE INPUT/OUTPUT TYPES
// ============================================================

export interface CompDetectionContext {
  tenantId: string
  eventId: string
  clientId: string | null
  // Event data
  eventDate: string | null
  occasion: string | null
  guestCount: number
  // Menu data
  menuDishes: Array<{ name: string; course: string; dietaryTags: string[] }>
  // Client data
  clientPreferences: {
    cuisinePreferences: string[]
    foodsLove: string[]
    foodsAvoid: string[]
    dietaryRestrictions: string[]
    allergies: string[]
  } | null
  menuPreferences: {
    cuisinePreferences: string[]
    foodsLove: string
    foodsAvoid: string
    adventurousness: string | null
  } | null
  // Carry-forward items
  reusableItems: Array<{ name: string; estimatedCostCents: number; sourceEvent: string }>
  // Financial
  quotedPriceCents: number
  foodCostCents: number
  profitMarginPercent: number
  // History
  pastEvents: Array<{ id: string; date: string; occasion: string | null }>
  pastCompItems: ComplimentaryItem[]
}

export interface CompDetectionResult {
  suggestions: Array<{
    type: CompSuggestionType
    title: string
    description: string
    reasoning: string
    estimatedCostCents: number
    effortLevel: CompEffortLevel
    confidenceScore: number
    sourceData: Record<string, unknown>
  }>
}
