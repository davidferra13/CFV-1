import { hasVoiceAgentOptOutRequest } from '@/lib/calling/voice-agent-contract'
import { isValidE164, normalizePhone } from '@/lib/calling/phone-utils'
import type { VoiceConsentState } from '@/lib/calling/voice-ops-types'

export interface VoiceConsentRecord {
  contactPhone: string
  contactName?: string | null
  contactType?: 'vendor' | 'venue' | 'business' | 'client' | 'unknown'
  consentState: VoiceConsentState
  notes?: string | null
  lastOptOutAt?: string | null
}

export interface VoiceConsentGate {
  allowed: boolean
  normalizedPhone: string
  consentState: VoiceConsentState
  reason: string | null
  nextStep: 'launch_call' | 'manual_review' | 'do_not_call'
}

export function evaluateVoiceCallConsent(params: {
  phone: string
  contactType?: string | null
  record?: VoiceConsentRecord | null
  latestUtterance?: string | null
  allowUnknownBusinessConsent?: boolean
}): VoiceConsentGate {
  const normalizedPhone = normalizePhone(params.phone || '')
  if (!isValidE164(normalizedPhone)) {
    return blocked(normalizedPhone, 'unknown', 'Invalid phone number.', 'manual_review')
  }

  if (params.contactType === 'client') {
    return blocked(
      normalizedPhone,
      'manual_only',
      'Automated outbound client calls are blocked.',
      'manual_review'
    )
  }

  if (hasVoiceAgentOptOutRequest(params.latestUtterance)) {
    return blocked(
      normalizedPhone,
      'opted_out',
      'Caller requested no AI assistant calls.',
      'do_not_call'
    )
  }

  const consentState = params.record?.consentState ?? 'unknown'
  if (consentState === 'allowed') {
    return {
      allowed: true,
      normalizedPhone,
      consentState,
      reason: null,
      nextStep: 'launch_call',
    }
  }

  if (consentState === 'opted_out') {
    return blocked(
      normalizedPhone,
      consentState,
      'Contact opted out of AI assistant calls.',
      'do_not_call'
    )
  }

  if (consentState === 'manual_only') {
    return blocked(normalizedPhone, consentState, 'Contact is marked manual-only.', 'manual_review')
  }

  const businessType =
    params.contactType === 'vendor' ||
    params.contactType === 'venue' ||
    params.contactType === 'business'
  if (params.allowUnknownBusinessConsent && businessType) {
    return {
      allowed: true,
      normalizedPhone,
      consentState,
      reason: 'No explicit preference found. Business contact is allowed by this flow.',
      nextStep: 'launch_call',
    }
  }

  return blocked(normalizedPhone, consentState, 'Consent preference is unknown.', 'manual_review')
}

function blocked(
  normalizedPhone: string,
  consentState: VoiceConsentState,
  reason: string,
  nextStep: VoiceConsentGate['nextStep']
): VoiceConsentGate {
  return {
    allowed: false,
    normalizedPhone,
    consentState,
    reason,
    nextStep,
  }
}
