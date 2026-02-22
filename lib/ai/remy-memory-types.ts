// Remy Memory Types
// No 'use server' — safe to import from any context

export type MemoryCategory =
  | 'chef_preference'
  | 'client_insight'
  | 'business_rule'
  | 'communication_style'
  | 'culinary_note'
  | 'scheduling_pattern'
  | 'pricing_pattern'
  | 'workflow_preference'

export interface RemyMemory {
  id: string
  category: MemoryCategory
  content: string
  importance: number
  accessCount: number
  relatedClientId: string | null
  createdAt: string
  lastAccessedAt: string
}
