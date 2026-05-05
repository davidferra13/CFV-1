'use server'

// Knowledge linking (stub, pending full implementation)

import type {
  KnowledgeSourceType,
  KnowledgeLinkTargetType,
  KnowledgeLink,
  LinkableEntity,
} from './types'

export async function searchLinkableEntities(
  _query: string,
  _targetType?: KnowledgeLinkTargetType
): Promise<LinkableEntity[]> {
  return []
}

export async function linkKnowledge(
  _sourceType: KnowledgeSourceType,
  _sourceId: string,
  _targetType: KnowledgeLinkTargetType,
  _targetId: string
): Promise<{ success: boolean }> {
  return { success: false }
}

export async function unlinkKnowledge(_linkId: string): Promise<{ success: boolean }> {
  return { success: false }
}

export async function getLinksFor(
  _sourceType: KnowledgeSourceType,
  _sourceId: string
): Promise<KnowledgeLink[]> {
  return []
}
