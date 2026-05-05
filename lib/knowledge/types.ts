// Knowledge linking types (stub, pending full implementation)

export type KnowledgeSourceType = 'tip' | 'note'
export type KnowledgeLinkTargetType = 'event' | 'recipe' | 'ingredient' | 'client'

export interface KnowledgeLink {
  id: string
  sourceType: KnowledgeSourceType
  sourceId: string
  targetType: KnowledgeLinkTargetType
  targetId: string
  targetLabel?: string
  createdAt: string
}

export interface LinkableEntity {
  id: string
  type: KnowledgeLinkTargetType
  label: string
}
