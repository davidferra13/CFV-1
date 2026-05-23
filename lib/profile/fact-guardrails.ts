export const PROFILE_FACT_VISIBILITIES = [
  'private_only',
  'chef_internal',
  'client_safe',
  'public_profile',
  'website_only',
  'requires_permission',
  'requires_evidence',
  'never_publish',
] as const

export type ProfileFactVisibility = (typeof PROFILE_FACT_VISIBILITIES)[number]

export const PROFILE_FACT_SENSITIVITIES = [
  'none',
  'cannabis',
  'celebrity_private_client',
  'medical_dietary_claim',
  'named_third_party',
  'negative_defamatory_story',
  'legal_compliance',
  'identity_private_life',
] as const

export type ProfileFactSensitivity = (typeof PROFILE_FACT_SENSITIVITIES)[number]

export const PROFILE_FACT_CATEGORIES = [
  'identity',
  'birthday',
  'career',
  'credentials',
  'proof',
  'service_fit',
  'values',
  'sourcing_foraging',
  'collaboration',
  'cannabis',
  'client_private_client_proof',
  'external_long_form_story_links',
] as const

export type ProfileFactCategory = (typeof PROFILE_FACT_CATEGORIES)[number]

export const CANNABIS_DISCLOSURE_MODES = [
  'hidden',
  'soft_mentioned',
  'credentialed_public',
  'full_public',
] as const

export type CannabisDisclosureMode = (typeof CANNABIS_DISCLOSURE_MODES)[number]

export const PUBLIC_BIO_LIMITS = {
  taglineMaxChars: 160,
  bioMaxChars: 600,
  proofChipMaxChars: 60,
  maxProofChips: 8,
} as const

const BLOCKED_PUBLIC_VISIBILITIES = new Set<ProfileFactVisibility>([
  'private_only',
  'chef_internal',
  'website_only',
  'requires_permission',
  'requires_evidence',
  'never_publish',
])

export type ChefProfileFact = {
  id: string
  category: ProfileFactCategory
  label: string
  value: string
  visibility: ProfileFactVisibility
  sensitivity: ProfileFactSensitivity
  confidence: 'chef_verified' | 'imported' | 'inferred' | 'needs_review'
  source: 'chef_entered' | 'raw_memory' | 'ai_extraction' | 'credential' | 'event_history'
  intendedUse:
    | 'private_memory'
    | 'profile_optimization'
    | 'public_bio'
    | 'proof_chip'
    | 'client_context'
  freshness: 'current' | 'needs_review' | 'stale'
  publishability: 'publishable' | 'review_required' | 'blocked'
  evidenceUrl?: string | null
  permissionRecordedAt?: string | null
}

export type ChefBirthdatePrivateFacts = {
  dateOfBirth: string | null
  birthMonth: number | null
  birthDay: number | null
  purpose: {
    fullDob: 'legal_compliance_only'
    monthDay: 'internal_reminders_personalization'
    age: 'computed_when_needed'
  }
}

export type PublicBioSettings = {
  maxChars: number
  proofChipMaxChars: number
  maxProofChips: number
  cannabisDisclosureMode: CannabisDisclosureMode
  externalLongFormLinks: string[]
}

export type PublicProfileComposition = {
  tagline: string | null
  bio: string | null
  proofChips: string[]
  externalLongFormLinks: string[]
  facts: ChefProfileFact[]
}

const DEFAULT_PUBLIC_BIO_SETTINGS: PublicBioSettings = {
  maxChars: PUBLIC_BIO_LIMITS.bioMaxChars,
  proofChipMaxChars: PUBLIC_BIO_LIMITS.proofChipMaxChars,
  maxProofChips: PUBLIC_BIO_LIMITS.maxProofChips,
  cannabisDisclosureMode: 'hidden',
  externalLongFormLinks: [],
}

export function normalizePublicBioSettings(input: unknown): PublicBioSettings {
  const raw = isRecord(input) ? input : {}
  const maxChars = clampNumber(raw.maxChars, 180, PUBLIC_BIO_LIMITS.bioMaxChars)
  const proofChipMaxChars = clampNumber(
    raw.proofChipMaxChars,
    24,
    PUBLIC_BIO_LIMITS.proofChipMaxChars
  )
  const maxProofChips = clampNumber(raw.maxProofChips, 3, PUBLIC_BIO_LIMITS.maxProofChips)
  const cannabisDisclosureMode = CANNABIS_DISCLOSURE_MODES.includes(
    raw.cannabisDisclosureMode as CannabisDisclosureMode
  )
    ? (raw.cannabisDisclosureMode as CannabisDisclosureMode)
    : DEFAULT_PUBLIC_BIO_SETTINGS.cannabisDisclosureMode

  return {
    maxChars,
    proofChipMaxChars,
    maxProofChips,
    cannabisDisclosureMode,
    externalLongFormLinks: normalizeUrls(raw.externalLongFormLinks),
  }
}

export function normalizeChefProfileFacts(input: unknown): ChefProfileFact[] {
  if (!Array.isArray(input)) return []

  return input
    .map((fact) => normalizeChefProfileFact(fact))
    .filter((fact): fact is ChefProfileFact => Boolean(fact))
}

export function normalizeChefBirthdate(input: {
  dateOfBirth?: string | null
  birthMonth?: number | string | null
  birthDay?: number | string | null
}): ChefBirthdatePrivateFacts {
  const parsedDate = parseIsoDate(input.dateOfBirth)
  const parsedMonth = parsedDate ? Number(parsedDate.slice(5, 7)) : normalizeMonth(input.birthMonth)
  const parsedDay = parsedDate ? Number(parsedDate.slice(8, 10)) : normalizeDay(input.birthDay)

  return {
    dateOfBirth: parsedDate,
    birthMonth: parsedMonth,
    birthDay: parsedDay,
    purpose: {
      fullDob: 'legal_compliance_only',
      monthDay: 'internal_reminders_personalization',
      age: 'computed_when_needed',
    },
  }
}

export function composePublicProfile(input: {
  tagline?: string | null
  bio?: string | null
  facts?: ChefProfileFact[]
  settings?: PublicBioSettings | unknown
}): PublicProfileComposition {
  const settings = normalizePublicBioSettings(input.settings)
  const facts = normalizeChefProfileFacts(input.facts).filter((fact) =>
    isFactAllowedForPublicProfile(fact, settings)
  )
  const proofChips = facts
    .filter((fact) => fact.intendedUse === 'proof_chip' || fact.category === 'credentials')
    .map((fact) => clampText(fact.value || fact.label, settings.proofChipMaxChars))
    .filter(Boolean)
    .slice(0, settings.maxProofChips)

  return {
    tagline: clampText(input.tagline ?? '', PUBLIC_BIO_LIMITS.taglineMaxChars) || null,
    bio: sanitizePublicBio(input.bio ?? '', settings) || null,
    proofChips,
    externalLongFormLinks: settings.externalLongFormLinks,
    facts,
  }
}

export function extractPrivateFactsFromRawMemory(rawMemory: string): ChefProfileFact[] {
  const text = rawMemory.trim()
  if (!text) return []

  const facts: ChefProfileFact[] = []
  const lower = text.toLowerCase()

  if (/\b(cannabis|thc|cbd|infused)\b/i.test(text)) {
    facts.push(createPrivateExtractedFact('Cannabis context', 'cannabis', 'cannabis', text))
  }
  if (/\b(celebrity|private client|famous|nda)\b/i.test(text)) {
    facts.push(
      createPrivateExtractedFact(
        'Private client context',
        'client_private_client_proof',
        'celebrity_private_client',
        text
      )
    )
  }
  if (/\b(birthday|born|dob|date of birth)\b/i.test(text)) {
    facts.push(
      createPrivateExtractedFact('Birthday context', 'birthday', 'identity_private_life', text)
    )
  }
  if (/\b(medical|allergy|therapeutic|health claim|cures?|treats?)\b/i.test(text)) {
    facts.push(
      createPrivateExtractedFact('Medical or dietary claim', 'proof', 'medical_dietary_claim', text)
    )
  }
  if (/\b(lawsuit|legal|permit|compliance|license)\b/i.test(text)) {
    facts.push(
      createPrivateExtractedFact(
        'Legal or compliance context',
        'credentials',
        'legal_compliance',
        text
      )
    )
  }
  if (/\b(hated|fired|terrible|worst|lawsuit|stole|fraud)\b/i.test(lower)) {
    facts.push(
      createPrivateExtractedFact(
        'Negative story context',
        'career',
        'negative_defamatory_story',
        text
      )
    )
  }

  return facts
}

function normalizeChefProfileFact(input: unknown): ChefProfileFact | null {
  if (!isRecord(input)) return null
  const value = String(input.value ?? '').trim()
  const label = String(input.label ?? '').trim()
  if (!value && !label) return null

  const visibility = PROFILE_FACT_VISIBILITIES.includes(input.visibility as ProfileFactVisibility)
    ? (input.visibility as ProfileFactVisibility)
    : 'private_only'
  const sensitivity = PROFILE_FACT_SENSITIVITIES.includes(
    input.sensitivity as ProfileFactSensitivity
  )
    ? (input.sensitivity as ProfileFactSensitivity)
    : 'none'

  return {
    id: String(input.id || crypto.randomUUID()),
    category: PROFILE_FACT_CATEGORIES.includes(input.category as ProfileFactCategory)
      ? (input.category as ProfileFactCategory)
      : 'identity',
    label: label || value.slice(0, 48),
    value: value || label,
    visibility,
    sensitivity,
    confidence: ['chef_verified', 'imported', 'inferred', 'needs_review'].includes(
      String(input.confidence)
    )
      ? (input.confidence as ChefProfileFact['confidence'])
      : 'needs_review',
    source: ['chef_entered', 'raw_memory', 'ai_extraction', 'credential', 'event_history'].includes(
      String(input.source)
    )
      ? (input.source as ChefProfileFact['source'])
      : 'chef_entered',
    intendedUse: [
      'private_memory',
      'profile_optimization',
      'public_bio',
      'proof_chip',
      'client_context',
    ].includes(String(input.intendedUse))
      ? (input.intendedUse as ChefProfileFact['intendedUse'])
      : 'private_memory',
    freshness: ['current', 'needs_review', 'stale'].includes(String(input.freshness))
      ? (input.freshness as ChefProfileFact['freshness'])
      : 'needs_review',
    publishability: ['publishable', 'review_required', 'blocked'].includes(
      String(input.publishability)
    )
      ? (input.publishability as ChefProfileFact['publishability'])
      : visibility === 'public_profile'
        ? 'review_required'
        : 'blocked',
    evidenceUrl: typeof input.evidenceUrl === 'string' ? input.evidenceUrl : null,
    permissionRecordedAt:
      typeof input.permissionRecordedAt === 'string' ? input.permissionRecordedAt : null,
  }
}

function isFactAllowedForPublicProfile(
  fact: ChefProfileFact,
  settings: PublicBioSettings
): boolean {
  if (fact.visibility !== 'public_profile') return false
  if (BLOCKED_PUBLIC_VISIBILITIES.has(fact.visibility)) return false
  if (fact.publishability !== 'publishable') return false
  if (fact.sensitivity === 'cannabis' && settings.cannabisDisclosureMode === 'hidden') return false
  if (fact.sensitivity === 'celebrity_private_client' && !fact.permissionRecordedAt) return false
  if (
    ['medical_dietary_claim', 'legal_compliance'].includes(fact.sensitivity) &&
    !fact.evidenceUrl
  ) {
    return false
  }
  return !['named_third_party', 'negative_defamatory_story', 'identity_private_life'].includes(
    fact.sensitivity
  )
}

function createPrivateExtractedFact(
  label: string,
  category: ProfileFactCategory,
  sensitivity: ProfileFactSensitivity,
  rawText: string
): ChefProfileFact {
  return {
    id: crypto.randomUUID(),
    category,
    label,
    value: clampText(rawText, 240),
    visibility: 'private_only',
    sensitivity,
    confidence: 'needs_review',
    source: 'raw_memory',
    intendedUse: 'profile_optimization',
    freshness: 'needs_review',
    publishability: 'blocked',
    evidenceUrl: null,
    permissionRecordedAt: null,
  }
}

function clampText(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxChars) return normalized
  return `${normalized
    .slice(0, Math.max(0, maxChars - 3))
    .trimEnd()
    .replace(/[,:;.\-]+$/, '')}...`
}

function sanitizePublicBio(text: string, settings: PublicBioSettings): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  const unsafePatterns = [
    /\b(born|dob|date of birth)\b/i,
    /\b(celebrity|famous|private client|nda)\b/i,
    /\b(medical|therapeutic|health claim|cures?|treats?)\b/i,
    /\b(lawsuit|legal dispute|permit violation)\b/i,
    /\b(hated|fired|terrible|worst|stole|fraud)\b/i,
  ]
  if (settings.cannabisDisclosureMode === 'hidden') {
    unsafePatterns.push(/\b(cannabis|thc|cbd|infused)\b/i)
  }
  if (unsafePatterns.some((pattern) => pattern.test(normalized))) return ''
  return clampText(normalized, settings.maxChars)
}

function clampNumber(value: unknown, min: number, max: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return max
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

function normalizeUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((url) => String(url || '').trim())
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, 5)
}

function normalizeMonth(value: number | string | null | undefined): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) return null
  return parsed
}

function normalizeDay(value: number | string | null | undefined): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) return null
  return parsed
}

function parseIsoDate(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  const parsed = new Date(`${trimmed}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return null
  if (parsed.toISOString().slice(0, 10) !== trimmed) return null
  return trimmed
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
