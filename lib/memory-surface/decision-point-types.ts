// Memory Surface: Decision Point Types
// Maps chef decision moments to relevant memory context for resurfacing.

// ── Decision Points ───────────────────────────────────────────────────────

export type DecisionPoint =
  | 'quote_creation'
  | 'menu_selection'
  | 'client_onboarding'
  | 'event_planning'
  | 'pricing'
  | 'scheduling'
  | 'staffing'
  | 'cancellation'

// ── Memory Hit ────────────────────────────────────────────────────────────

export interface MemoryHit {
  captureId: string
  content: string
  relevanceScore: number
  contextType: string
  createdAt: string
}

// ── Decision Context ──────────────────────────────────────────────────────

export interface DecisionContext {
  point: DecisionPoint
  entityType: string | null
  entityId: string | null
  relevantMemories: MemoryHit[]
}

// ── Context Map ───────────────────────────────────────────────────────────
// Maps each decision point to the capture context types and tags that
// should be searched when surfacing memories for that decision.

export interface DecisionContextMapping {
  contextTypes: string[]
  tags: string[]
}

export const DECISION_CONTEXT_MAP: Record<DecisionPoint, DecisionContextMapping> = {
  quote_creation: {
    contextTypes: ['client', 'event', 'vendor'],
    tags: ['client-note', 'business', 'event-idea'],
  },
  menu_selection: {
    contextTypes: ['recipe', 'menu', 'ingredient', 'client'],
    tags: ['recipe', 'menu-idea', 'shopping', 'client-note'],
  },
  client_onboarding: {
    contextTypes: ['client', 'general'],
    tags: ['client-note', 'business'],
  },
  event_planning: {
    contextTypes: ['event', 'client', 'vendor', 'ingredient'],
    tags: ['event-idea', 'prep-task', 'loadout', 'client-note', 'vendor'],
  },
  pricing: {
    contextTypes: ['vendor', 'ingredient', 'general'],
    tags: ['business', 'shopping', 'vendor'],
  },
  scheduling: {
    contextTypes: ['event', 'client', 'general'],
    tags: ['event-idea', 'prep-task', 'client-note'],
  },
  staffing: {
    contextTypes: ['general', 'event'],
    tags: ['staff', 'event-idea', 'business'],
  },
  cancellation: {
    contextTypes: ['client', 'event', 'general'],
    tags: ['client-note', 'business', 'incident'],
  },
}
