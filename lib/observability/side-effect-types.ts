/**
 * Side-effect observability types.
 * Matches the side_effects table schema from 20260523160000_side_effects.sql.
 */

export type SideEffectCategory =
  | 'email'
  | 'notification'
  | 'webhook'
  | 'file'
  | 'external_api'
  | 'state_change'
  | 'scheduled_job'

export interface SideEffectEntry {
  id: string
  tenantId: string
  category: SideEffectCategory
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
  triggeredBy: string
  createdAt?: Date
}

export interface SideEffectSummary {
  totalToday: number
  byCategory: Record<SideEffectCategory, number>
  recentEffects: SideEffectEntry[]
}
