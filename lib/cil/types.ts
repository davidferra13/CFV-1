// CIL (Continuous Intelligence Layer) - Type definitions
// Persistent per-chef knowledge graph primitives

export type EntityType = 'chef' | 'client' | 'event' | 'ingredient' | 'vendor' | 'recipe' | 'staff'

export type RelationType =
  | 'books' // client books event
  | 'contains' // event contains recipe/ingredient
  | 'supplies' // vendor supplies ingredient
  | 'requires' // recipe requires ingredient
  | 'prefers' // chef/client prefers ingredient/vendor
  | 'precedes' // event precedes another event (temporal)
  | 'uses' // chef uses ingredient/vendor
  | 'pays' // client pays for event

export type SignalSource =
  | 'db_mutation' // chef_activity_log insert
  | 'event_transition' // FSM state change
  | 'ledger' // ledger_entries append
  | 'memory' // remy_memories extraction
  | 'automation' // automation_executions
  | 'inventory' // inventory_transactions
  | 'sse' // SSE EventEmitter bus

export type ConfidenceLabel = 'EXTRACTED' | 'INFERRED' | 'AMBIGUOUS'

export interface CILEntity {
  id: string // format: {type}_{app_id}
  type: EntityType
  label: string // human-readable name
  state: Record<string, unknown> // current known attributes
  velocity: Record<string, number> // rate of change per attribute
  last_observed: number // epoch ms
  created_at: number
  observation_count: number
}

export interface CILRelation {
  id: string // deterministic: {from}_{type}_{to}
  from_entity: string
  to_entity: string
  type: RelationType
  strength: number // 0.0-1.0
  confidence: ConfidenceLabel
  confidence_score: number // 0.0-1.0
  evidence: string[] // signal IDs
  periodicity: number | null // days, null = not periodic
  chef_override: boolean
  created_at: number
  last_reinforced: number
}

export interface CILSignal {
  id: string // ULID
  source: SignalSource
  entity_ids: string[]
  payload: Record<string, unknown>
  timestamp: number // source event time
  interpretation_status: 'pending' | 'interpreted' | 'skipped'
  created_at: number
}
