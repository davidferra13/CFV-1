export const CHEF_LIFE_CONSTRAINT_DOMAINS = [
  'body',
  'family',
  'compliance',
  'finance',
  'staff',
  'household',
  'strategy',
  'sustainability',
] as const

export type ChefLifeConstraintDomain = (typeof CHEF_LIFE_CONSTRAINT_DOMAINS)[number]

export const CHEF_LIFE_CONSTRAINT_CAPTURE_MODES = [
  'quick',
  'structured',
  'review',
  'renewal',
] as const

export type ChefLifeConstraintCaptureMode = (typeof CHEF_LIFE_CONSTRAINT_CAPTURE_MODES)[number]

export const CHEF_LIFE_CONSTRAINT_STATES = [
  'draft',
  'needs_review',
  'confirmed',
  'stale',
  'archived',
  'deleted',
] as const

export type ChefLifeConstraintState = (typeof CHEF_LIFE_CONSTRAINT_STATES)[number]

export const CHEF_LIFE_CONSTRAINT_VISIBILITIES = [
  'private_only',
  'chef_internal',
  'staff_safe_summary',
  'client_safe_summary',
  'public_never',
] as const

export type ChefLifeConstraintVisibility = (typeof CHEF_LIFE_CONSTRAINT_VISIBILITIES)[number]

export const CHEF_LIFE_CONSTRAINT_SOURCES = [
  'manual_chef_input',
  'quick_capture',
  'structured_form',
  'remy_private_summary',
  'body_capacity_twin',
  'family_note',
  'compliance_document',
  'finance_record',
  'staff_note',
  'household_memory',
  'strategy_review',
  'sustainability_audit',
  'external_evidence',
  'derived',
] as const

export type ChefLifeConstraintSource = (typeof CHEF_LIFE_CONSTRAINT_SOURCES)[number]

export type ChefLifeConstraintConfidence = 'low' | 'medium' | 'high' | 'confirmed'

export type ChefLifeConstraintFreshness = 'current' | 'review_due' | 'stale' | 'unknown'

export type ChefLifeConstraintEvidence = {
  id: string | null
  label: string
  url: string | null
  storagePath: string | null
  source: ChefLifeConstraintSource
  attachedAt: string
  visibility: 'private_only' | 'chef_internal'
}

export type ChefLifeConstraintFact = {
  id: string | null
  tenantId: string
  chefId: string
  domain: ChefLifeConstraintDomain
  kind: string
  label: string
  value: string
  privateNotes: string | null
  state: ChefLifeConstraintState
  visibility: ChefLifeConstraintVisibility
  source: ChefLifeConstraintSource
  confidence: ChefLifeConstraintConfidence
  freshness: ChefLifeConstraintFreshness
  lastConfirmedAt: string | null
  staleAfter: string | null
  evidence: ChefLifeConstraintEvidence[]
  overshareWarnings: string[]
  archivedAt: string | null
  deletedAt: string | null
}

export type QuickConstraintCaptureInput = {
  tenantId: string
  chefId: string
  note: string
  domain?: ChefLifeConstraintDomain
  source?: ChefLifeConstraintSource
  nowIso?: string
}

export type StructuredConstraintCaptureInput = {
  tenantId: string
  chefId: string
  domain: ChefLifeConstraintDomain
  kind?: string | null
  label: string
  value?: string | null
  privateNotes?: string | null
  visibility?: ChefLifeConstraintVisibility
  source?: ChefLifeConstraintSource
  confidence?: ChefLifeConstraintConfidence
  staleAfter?: string | null
  evidence?: ChefLifeConstraintEvidence[]
  nowIso?: string
}

export type ConstraintReviewPacket = {
  tenantId: string
  facts: ChefLifeConstraintFact[]
  needsReview: ChefLifeConstraintFact[]
  staleFacts: ChefLifeConstraintFact[]
  archivedCount: number
  deletedCount: number
  canConfirmCount: number
}

const DEFAULT_STALE_DAYS_BY_DOMAIN: Record<ChefLifeConstraintDomain, number> = {
  body: 30,
  family: 45,
  compliance: 90,
  finance: 30,
  staff: 30,
  household: 60,
  strategy: 90,
  sustainability: 120,
}

const PRIVATE_LEAK_TERMS = [
  'diagnosis',
  'medical',
  'therapy',
  'medication',
  'injury',
  'divorce',
  'custody',
  'child',
  'spouse',
  'debt',
  'bankruptcy',
  'tax lien',
  'ssn',
  'social security',
  'password',
  'gate code',
  'alarm code',
  'sobriety',
  'faith',
  'identity',
  'private client',
  'nda',
] as const

const CLIENT_SAFE_VISIBILITIES = new Set<ChefLifeConstraintVisibility>(['client_safe_summary'])

export function normalizeQuickConstraintCapture(
  input: QuickConstraintCaptureInput
): ChefLifeConstraintFact {
  const note = normalizeText(input.note)
  if (!note) throw new Error('Constraint note cannot be empty')

  const domain = input.domain ?? inferConstraintDomain(note)
  const nowIso = input.nowIso ?? new Date().toISOString()
  const warnings = findPrivateConstraintLeakTerms(note)

  return {
    id: null,
    tenantId: input.tenantId,
    chefId: input.chefId,
    domain,
    kind: 'quick_note',
    label: clampText(note, 80),
    value: note,
    privateNotes: null,
    state: 'needs_review',
    visibility: 'private_only',
    source: input.source ?? 'quick_capture',
    confidence: 'low',
    freshness: 'unknown',
    lastConfirmedAt: null,
    staleAfter: addDaysIso(nowIso, DEFAULT_STALE_DAYS_BY_DOMAIN[domain]),
    evidence: [],
    overshareWarnings: warnings,
    archivedAt: null,
    deletedAt: null,
  }
}

export function normalizeStructuredConstraintCapture(
  input: StructuredConstraintCaptureInput
): ChefLifeConstraintFact {
  const label = normalizeText(input.label)
  const value = normalizeText(input.value ?? input.label)
  if (!label && !value) throw new Error('Constraint label or value is required')

  const nowIso = input.nowIso ?? new Date().toISOString()
  const visibility = normalizeVisibility(input.visibility, `${label} ${value}`)
  const confidence = input.confidence ?? 'medium'
  const warnings = findPrivateConstraintLeakTerms(`${label} ${value} ${input.privateNotes ?? ''}`)

  return {
    id: null,
    tenantId: input.tenantId,
    chefId: input.chefId,
    domain: input.domain,
    kind: normalizeText(input.kind ?? '') || 'general',
    label: label || clampText(value, 80),
    value: value || label,
    privateNotes: normalizeText(input.privateNotes ?? '') || null,
    state: confidence === 'confirmed' ? 'confirmed' : 'needs_review',
    visibility,
    source: input.source ?? 'structured_form',
    confidence,
    freshness: confidence === 'confirmed' ? 'current' : 'review_due',
    lastConfirmedAt: confidence === 'confirmed' ? nowIso : null,
    staleAfter: input.staleAfter ?? addDaysIso(nowIso, DEFAULT_STALE_DAYS_BY_DOMAIN[input.domain]),
    evidence: normalizeEvidence(input.evidence ?? [], nowIso),
    overshareWarnings: warnings,
    archivedAt: null,
    deletedAt: null,
  }
}

export function buildConstraintReviewPacket(input: {
  tenantId: string
  facts: ChefLifeConstraintFact[]
  nowIso?: string
}): ConstraintReviewPacket {
  const facts = input.facts
    .filter((fact) => fact.tenantId === input.tenantId)
    .map((fact) => refreshConstraintFreshness(fact, input.nowIso))
  const needsReview = facts.filter(
    (fact) => fact.state === 'needs_review' || fact.freshness === 'review_due'
  )
  const staleFacts = facts.filter((fact) => fact.state === 'stale' || fact.freshness === 'stale')
  const archivedCount = facts.filter((fact) => fact.state === 'archived').length
  const deletedCount = facts.filter((fact) => fact.state === 'deleted').length

  return {
    tenantId: input.tenantId,
    facts,
    needsReview,
    staleFacts,
    archivedCount,
    deletedCount,
    canConfirmCount: needsReview.length + staleFacts.length,
  }
}

export function confirmConstraintFact(
  fact: ChefLifeConstraintFact,
  nowIso = new Date().toISOString()
): ChefLifeConstraintFact {
  if (fact.state === 'archived' || fact.state === 'deleted') {
    throw new Error('Archived or deleted constraints cannot be confirmed')
  }

  return {
    ...fact,
    state: 'confirmed',
    confidence: 'confirmed',
    freshness: 'current',
    lastConfirmedAt: nowIso,
    staleAfter: fact.staleAfter ?? addDaysIso(nowIso, DEFAULT_STALE_DAYS_BY_DOMAIN[fact.domain]),
  }
}

export function renewConstraintFact(
  fact: ChefLifeConstraintFact,
  input: {
    value?: string | null
    privateNotes?: string | null
    staleAfter?: string | null
    nowIso?: string
  } = {}
): ChefLifeConstraintFact {
  const nowIso = input.nowIso ?? new Date().toISOString()
  const nextValue = normalizeText(input.value ?? fact.value)
  if (!nextValue) throw new Error('Renewed constraint value cannot be empty')

  return confirmConstraintFact(
    {
      ...fact,
      value: nextValue,
      privateNotes:
        input.privateNotes === undefined
          ? fact.privateNotes
          : normalizeText(input.privateNotes ?? '') || null,
      staleAfter: input.staleAfter ?? addDaysIso(nowIso, DEFAULT_STALE_DAYS_BY_DOMAIN[fact.domain]),
    },
    nowIso
  )
}

export function refreshConstraintFreshness(
  fact: ChefLifeConstraintFact,
  nowIso = new Date().toISOString()
): ChefLifeConstraintFact {
  if (fact.state === 'archived' || fact.state === 'deleted') return fact
  if (!fact.staleAfter) return fact
  if (new Date(fact.staleAfter).getTime() > new Date(nowIso).getTime()) return fact

  return {
    ...fact,
    state: fact.state === 'confirmed' ? 'stale' : fact.state,
    freshness: 'stale',
  }
}

export function archiveConstraintFact(
  fact: ChefLifeConstraintFact,
  input: { reason?: string | null; nowIso?: string } = {}
): ChefLifeConstraintFact {
  const reason = normalizeText(input.reason ?? '')
  const nowIso = input.nowIso ?? new Date().toISOString()

  return {
    ...fact,
    privateNotes: [fact.privateNotes, reason ? `Archive reason: ${reason}` : null]
      .filter(Boolean)
      .join('\n'),
    state: 'archived',
    archivedAt: nowIso,
  }
}

export function deleteConstraintFact(
  fact: ChefLifeConstraintFact,
  input: { confirmation: string; nowIso?: string }
): ChefLifeConstraintFact {
  if (input.confirmation !== 'DELETE') {
    throw new Error('Constraint deletion requires DELETE confirmation')
  }

  return {
    ...fact,
    state: 'deleted',
    deletedAt: input.nowIso ?? new Date().toISOString(),
  }
}

export function isClientSafeConstraintVisibility(
  visibility: ChefLifeConstraintVisibility
): boolean {
  return CLIENT_SAFE_VISIBILITIES.has(visibility)
}

export function findPrivateConstraintLeakTerms(value: string): string[] {
  const normalized = value.toLowerCase()
  return PRIVATE_LEAK_TERMS.filter((term) => normalized.includes(term))
}

export function shouldBlockClientSafeConstraint(fact: ChefLifeConstraintFact): boolean {
  if (!isClientSafeConstraintVisibility(fact.visibility)) return false
  return (
    findPrivateConstraintLeakTerms(`${fact.label} ${fact.value} ${fact.privateNotes ?? ''}`)
      .length > 0
  )
}

function inferConstraintDomain(note: string): ChefLifeConstraintDomain {
  const lower = note.toLowerCase()
  if (/\b(injury|sleep|medical|body|health|recovery|lifting)\b/.test(lower)) return 'body'
  if (/\b(child|family|caregiving|school|spouse|parent)\b/.test(lower)) return 'family'
  if (/\b(permit|license|inspection|insurance|compliance|allergen)\b/.test(lower)) {
    return 'compliance'
  }
  if (/\b(cash|debt|tax|invoice|runway|profit|margin)\b/.test(lower)) return 'finance'
  if (/\b(staff|assistant|server|subcontractor|team)\b/.test(lower)) return 'staff'
  if (/\b(home|household|gate|parking|kitchen|pet)\b/.test(lower)) return 'household'
  if (/\b(goal|strategy|legacy|exit|values|client mix)\b/.test(lower)) return 'strategy'
  if (/\b(waste|compost|sourcing|sustainability|emissions)\b/.test(lower)) {
    return 'sustainability'
  }
  return 'strategy'
}

function normalizeVisibility(
  visibility: ChefLifeConstraintVisibility | undefined,
  text: string
): ChefLifeConstraintVisibility {
  const requested = visibility ?? 'private_only'
  if (requested === 'client_safe_summary' && findPrivateConstraintLeakTerms(text).length > 0) {
    return 'private_only'
  }
  if (requested === 'public_never') return 'public_never'
  return CHEF_LIFE_CONSTRAINT_VISIBILITIES.includes(requested) ? requested : 'private_only'
}

function normalizeEvidence(
  evidence: ChefLifeConstraintEvidence[],
  nowIso: string
): ChefLifeConstraintEvidence[] {
  return evidence
    .map(
      (item): ChefLifeConstraintEvidence => ({
        id: item.id ?? null,
        label: clampText(normalizeText(item.label), 80),
        url: normalizeUrl(item.url),
        storagePath: normalizeText(item.storagePath ?? '') || null,
        source: CHEF_LIFE_CONSTRAINT_SOURCES.includes(item.source)
          ? item.source
          : 'external_evidence',
        attachedAt: item.attachedAt || nowIso,
        visibility:
          item.visibility === 'chef_internal'
            ? ('chef_internal' as const)
            : ('private_only' as const),
      })
    )
    .filter((item) => item.label && (item.url || item.storagePath))
}

function addDaysIso(nowIso: string, days: number): string {
  const date = new Date(nowIso)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString()
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeUrl(value: string | null): string | null {
  const normalized = normalizeText(value ?? '')
  return /^https?:\/\//i.test(normalized) ? normalized : null
}

function clampText(value: string, maxChars: number): string {
  const normalized = normalizeText(value)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`
}
