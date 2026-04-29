import { isAiToolControlledBy } from '@/lib/ai/tool-permission-manifest'

export type AiWorkflow = 'remy.chat' | 'remy.context' | 'structured.parse'

export type PrivateRuntimePrefs = {
  localAiEnabled: boolean
  localAiUrl: string
  localAiModel: string
  localAiVerifiedAt: string | null
}

export type PrivateRuntimePolicy = {
  workflow: AiWorkflow
  activeBackend: 'local' | 'platform'
  localRequired: boolean
  localAvailable: boolean
  canUsePlatformFallback: boolean
  blockReason: string | null
  localAiUrl: string
  localAiModel: string
}

export type AiAccessPrefs = {
  allowMemory: boolean
  allowSuggestions: boolean
  allowDocumentDrafts: boolean
}

export function resolvePrivateRuntimePolicy(
  workflow: AiWorkflow,
  prefs: PrivateRuntimePrefs
): PrivateRuntimePolicy {
  const localAvailable = Boolean(prefs.localAiEnabled && prefs.localAiVerifiedAt)
  const localRequired = prefs.localAiEnabled
  const blockReason =
    localRequired && !localAvailable
      ? 'Local AI is enabled but has not been verified. Test the connection in AI & Privacy before using Remy.'
      : null

  return {
    workflow,
    activeBackend: localAvailable ? 'local' : 'platform',
    localRequired,
    localAvailable,
    canUsePlatformFallback: !localRequired,
    blockReason,
    localAiUrl: prefs.localAiUrl,
    localAiModel: prefs.localAiModel,
  }
}

export function shouldUseAiMemory(prefs: Pick<AiAccessPrefs, 'allowMemory'>): boolean {
  return prefs.allowMemory
}

export function shouldEmitAiSuggestions(prefs: Pick<AiAccessPrefs, 'allowSuggestions'>): boolean {
  return prefs.allowSuggestions
}

export function canDraftAiDocuments(prefs: Pick<AiAccessPrefs, 'allowDocumentDrafts'>): boolean {
  return prefs.allowDocumentDrafts
}

export function isAiDocumentDraftTaskType(taskType: string): boolean {
  return isAiToolControlledBy(taskType, 'allow_document_drafts')
}
