import { isAllowedVoiceAgentRole } from '@/lib/calling/voice-agent-contract'
import { isValidE164, normalizePhone } from '@/lib/calling/phone-utils'
import type {
  VoiceCampaignLaunchMode,
  VoiceCampaignPlan,
  VoiceCampaignRecipientInput,
  VoiceCampaignRecipientPlan,
  VoiceConsentState,
} from '@/lib/calling/voice-ops-types'

const OUTBOUND_CAMPAIGN_ROLES = new Set([
  'vendor_availability',
  'vendor_delivery',
  'venue_confirmation',
])

export function planVoiceCallCampaign(params: {
  name: string
  purpose: string
  launchMode?: VoiceCampaignLaunchMode
  maxConcurrentLaunches?: number
  recipients: VoiceCampaignRecipientInput[]
}): VoiceCampaignPlan {
  const launchMode = params.launchMode ?? 'safe_serialized'
  const maxConcurrentLaunches =
    launchMode === 'safe_serialized' ? 1 : clampInteger(params.maxConcurrentLaunches ?? 2, 1, 5)

  const seen = new Set<string>()
  const blockedReasons = new Set<string>()
  const recipients = params.recipients.map((recipient): VoiceCampaignRecipientPlan => {
    const normalizedPhone = normalizePhone(recipient.contactPhone || '')
    const consentState: VoiceConsentState = recipient.consentState ?? 'unknown'
    const contactType = recipient.contactType ?? 'unknown'
    const key = `${normalizedPhone}:${recipient.role}:${recipient.subject ?? ''}`.toLowerCase()
    let status: VoiceCampaignRecipientPlan['status'] = 'reserved'
    let skipReason: string | null = null

    if (!isValidE164(normalizedPhone)) {
      status = 'skipped'
      skipReason = 'Invalid phone number.'
    } else if (
      !isAllowedVoiceAgentRole(recipient.role) ||
      !OUTBOUND_CAMPAIGN_ROLES.has(recipient.role)
    ) {
      status = 'skipped'
      skipReason = 'Role is not approved for outbound campaign calling.'
    } else if (contactType === 'client') {
      status = 'skipped'
      skipReason = 'Automated outbound client calls are blocked.'
    } else if (seen.has(key)) {
      status = 'skipped'
      skipReason = 'Duplicate recipient for the same role and subject.'
    } else if (consentState === 'opted_out') {
      status = 'skipped'
      skipReason = 'Contact opted out of AI assistant calls.'
    } else if (consentState === 'manual_only') {
      status = 'manual_review'
      skipReason = 'Contact is marked manual-only.'
    } else if (consentState === 'unknown') {
      status = 'manual_review'
      skipReason = 'Consent preference is unknown.'
    }

    if (skipReason) blockedReasons.add(skipReason)
    if (!skipReason) seen.add(key)

    return {
      ...recipient,
      contactType,
      consentState,
      normalizedPhone,
      status,
      skipReason,
      professionalRisk: status === 'reserved' ? 'low' : 'medium',
    }
  })

  const reservedCount = recipients.filter((recipient) => recipient.status === 'reserved').length
  const skippedCount = recipients.filter((recipient) => recipient.status === 'skipped').length
  const manualReviewCount = recipients.filter(
    (recipient) => recipient.status === 'manual_review'
  ).length

  return {
    name: params.name.trim(),
    purpose: params.purpose.trim(),
    launchMode,
    maxConcurrentLaunches,
    requestedCount: params.recipients.length,
    reservedCount,
    skippedCount,
    manualReviewCount,
    recipients,
    summary: {
      canLaunchAutomatically: reservedCount > 0 && manualReviewCount === 0,
      blockedReasons: Array.from(blockedReasons),
    },
  }
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.floor(value)))
}
