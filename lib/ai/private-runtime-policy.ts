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
  return DOCUMENT_DRAFT_TASK_TYPES.has(taskType)
}

const DOCUMENT_DRAFT_TASK_TYPES = new Set([
  'email.followup',
  'email.generic',
  'email.draft_reply',
  'agent.draft_email',
  'draft.thank_you',
  'draft.referral_request',
  'draft.testimonial_request',
  'draft.quote_cover_letter',
  'draft.decline_response',
  'draft.cancellation_response',
  'draft.payment_reminder',
  'draft.re_engagement',
  'draft.milestone_recognition',
  'draft.food_safety_incident',
  'draft.confirmation',
  'draft.inquiry_first_response',
  'draft.menu_proposal',
  'contract.generate',
  'document.create_folder',
  'agent.create_doc_folder',
])
