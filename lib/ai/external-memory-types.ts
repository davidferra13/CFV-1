/**
 * Chef Operating Loop External Memory
 *
 * Types for persistent chef decision/preference/pattern storage.
 * Enables the AI layer to recall prior chef context across sessions.
 */

export type MemoryType = 'decision' | 'preference' | 'pattern' | 'observation'

export interface OperatingMemory {
  id: string
  tenant_id: string
  memory_type: MemoryType
  context: string | null
  content: string
  relevance_score: number
  created_at: Date
  expires_at: Date | null
}

export interface OperatingMemoryInsert {
  tenant_id: string
  memory_type: MemoryType
  context?: string | null
  content: string
  relevance_score?: number
  expires_at?: Date | null
}

export interface MemoryStats {
  total: number
  by_type: Record<MemoryType, number>
  oldest: Date | null
  newest: Date | null
}
