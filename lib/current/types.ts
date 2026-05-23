// The Current - Unified Operational Feed
// Types for the single ranking layer that merges all "what to do next" systems.

export type CurrentCategory =
  | 'money'
  | 'prep'
  | 'communication'
  | 'completion'
  | 'growth'
  | 'optimization'

export type CurrentUrgency = 'critical' | 'high' | 'normal' | 'low'

export type CurrentSource =
  | 'priority_queue'
  | 'decision_queue'
  | 'action_layer'
  | 'client_pulse'
  | 'next_best_action'
  | 'completion'
  | 'cil'

export interface CurrentAction {
  label: string
  href: string
}

export interface CurrentUnit {
  /** Deterministic ID: source:entityType:entityId */
  id: string
  category: CurrentCategory
  urgency: CurrentUrgency
  title: string
  description: string
  href: string
  /** 1-3 actions, first is primary. V1: navigate only. */
  actions: CurrentAction[]
  /** 0-1000 after ranking */
  score: number
  /** Which system produced this */
  source: CurrentSource
  /** For dedup across sources */
  entityId: string
  /** For dedup across sources */
  entityType: string
  /** Supporting context lines */
  contextLines: string[]
  /** Evidence label from Truth-Net taxonomy (optional) */
  evidenceLabel?: import('@/lib/operating-loop/types').EvidenceLabel | null
  /** Effort estimate in minutes (null = unknown) */
  estimatedMinutes: number | null
  /** Deadline ISO string (null = no deadline). String for RSC serialization. */
  dueAt: string | null
  /** Revenue tied to this unit in cents (null = none) */
  revenueCents: number | null
  /** When this unit was created/detected. ISO string for RSC serialization. */
  createdAt: string
}

export interface CurrentFeed {
  /** All ranked, deduplicated, suppressed units */
  units: CurrentUnit[]
  /** Top N for display */
  top: CurrentUnit[]
  /** Total available */
  totalCount: number
  /** True when growth mode is active (nothing urgent) */
  growthMode: boolean
  /** When this feed was computed */
  computedAt: string
}
