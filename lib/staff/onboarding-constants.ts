// Staff Onboarding - Constants (no 'use server' - values only)

export const ONBOARDING_ITEM_KEYS = [
  'BACKGROUND_CHECK',
  'FOOD_HANDLER_CERT',
  'CODE_OF_CONDUCT_SIGNED',
  'NDA_SIGNED',
  'EMERGENCY_CONTACT',
  'SOCIAL_MEDIA_POLICY',
  'CLIENT_CONFIDENTIALITY_BRIEFED',
  'W9_COLLECTED',
  'SERVICE_AGREEMENT_SIGNED',
] as const

export type OnboardingItemKey = (typeof ONBOARDING_ITEM_KEYS)[number]

export const ONBOARDING_ITEM_LABELS: Record<string, string> = {
  BACKGROUND_CHECK: 'Background Check Completed',
  FOOD_HANDLER_CERT: 'Food Handler Certification on File',
  CODE_OF_CONDUCT_SIGNED: 'Code of Conduct Signed',
  NDA_SIGNED: 'NDA / Confidentiality Agreement Signed',
  EMERGENCY_CONTACT: 'Emergency Contact Collected',
  SOCIAL_MEDIA_POLICY: 'Social Media Policy Acknowledged',
  CLIENT_CONFIDENTIALITY_BRIEFED: 'Client Confidentiality Briefing Complete',
  W9_COLLECTED: 'W-9 Form Collected',
  SERVICE_AGREEMENT_SIGNED: 'Service Agreement Signed',
}
