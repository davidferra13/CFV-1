import type { EvidenceLabel, LoopState, SourceKind } from './types'

export type EvidenceTone = 'success' | 'info' | 'warning' | 'danger' | 'muted'

export type EvidenceConfidenceBand = 'high' | 'medium' | 'low' | 'unknown'

export type EvidenceFactStatus = 'fact' | 'qualified' | 'not_fact'

export interface EvidenceLabelDefinition {
  label: EvidenceLabel
  title: string
  shortTitle: string
  shortDescription: string
  description: string
  tone: EvidenceTone
  factStatus: EvidenceFactStatus
  presentAsFact: boolean
  caution: boolean
  isCertain: boolean
  needsReview: boolean
  priority: number
}

export interface EvidenceMetadataInput {
  label: EvidenceLabel
  source?: string | null
  sourceKind?: SourceKind | null
  confidence?: number | null
  timestamp?: string | Date | null
  href?: string | null
  sensitive?: boolean
}

export interface FormattedEvidenceMetadata extends EvidenceLabelDefinition {
  sourceLabel: string | null
  sourceKind: SourceKind | null
  confidenceLabel: string | null
  confidenceBand: EvidenceConfidenceBand
  timestampLabel: string | null
  href: string | null
  factNotice: string
  summary: string
}

export interface EvidenceDisplayMetadata extends EvidenceLabelDefinition {
  loopState: LoopState | null
  displayLabel: string
  ariaLabel: string
}

export interface EvidenceLabelSelectionInput {
  explicitLabel?: EvidenceLabel | null
  confidence?: number | null
  loopState?: LoopState | null
  sourceUpdatedAt?: string | Date | null
  now?: Date
  staleAfterDays?: number
  hasSource?: boolean | null
  hasConflictingSources?: boolean | null
  isAiGenerated?: boolean | null
  isComputed?: boolean | null
  isUserEntered?: boolean | null
}

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_STALE_AFTER_DAYS = 14
const MAX_SOURCE_LABEL_LENGTH = 80

const PRIVATE_SOURCE_PATTERNS = [
  /\bprivate\s+note\b/i,
  /\binternal\s+note\b/i,
  /\bstaff\s+note\b/i,
  /\bchef\s+note\b/i,
  /\bclient\s+note\b/i,
]

export const EVIDENCE_LABEL_DEFINITIONS: Record<EvidenceLabel, EvidenceLabelDefinition> = {
  confirmed: {
    label: 'confirmed',
    title: 'Confirmed',
    shortTitle: 'Confirmed',
    shortDescription: 'Verified source',
    description: 'Backed by a direct record, accepted state, signed document, or verified input.',
    tone: 'success',
    factStatus: 'fact',
    presentAsFact: true,
    caution: false,
    isCertain: true,
    needsReview: false,
    priority: 70,
  },
  computed: {
    label: 'computed',
    title: 'Computed',
    shortTitle: 'Computed',
    shortDescription: 'Calculated from trusted data',
    description: 'Calculated deterministically from trusted data.',
    tone: 'info',
    factStatus: 'fact',
    presentAsFact: true,
    caution: false,
    isCertain: true,
    needsReview: false,
    priority: 60,
  },
  user_entered: {
    label: 'user_entered',
    title: 'User entered',
    shortTitle: 'User',
    shortDescription: 'Entered by a user',
    description: 'Entered by a ChefFlow user, without independent corroboration.',
    tone: 'info',
    factStatus: 'qualified',
    presentAsFact: true,
    caution: false,
    isCertain: true,
    needsReview: false,
    priority: 58,
  },
  claimed: {
    label: 'claimed',
    title: 'Claimed',
    shortTitle: 'Claimed',
    shortDescription: 'Unverified statement',
    description: 'Provided by a person or external source without independent verification.',
    tone: 'warning',
    factStatus: 'qualified',
    presentAsFact: false,
    caution: true,
    isCertain: false,
    needsReview: true,
    priority: 45,
  },
  inferred: {
    label: 'inferred',
    title: 'Inferred',
    shortTitle: 'Inferred',
    shortDescription: 'Model or pattern estimate',
    description: 'Estimated from a pattern, model, or assumption. Treat as a lead, not a fact.',
    tone: 'muted',
    factStatus: 'qualified',
    presentAsFact: false,
    caution: true,
    isCertain: false,
    needsReview: true,
    priority: 35,
  },
  stale: {
    label: 'stale',
    title: 'Stale',
    shortTitle: 'Stale',
    shortDescription: 'Needs refresh',
    description: 'Based on old evidence that should be refreshed before strong action.',
    tone: 'warning',
    factStatus: 'not_fact',
    presentAsFact: false,
    caution: true,
    isCertain: false,
    needsReview: true,
    priority: 25,
  },
  unknown: {
    label: 'unknown',
    title: 'Unknown',
    shortTitle: 'Unknown',
    shortDescription: 'Evidence missing',
    description: 'Missing or unavailable evidence. Do not guess.',
    tone: 'muted',
    factStatus: 'not_fact',
    presentAsFact: false,
    caution: true,
    isCertain: false,
    needsReview: true,
    priority: 10,
  },
  disputed: {
    label: 'disputed',
    title: 'Disputed',
    shortTitle: 'Disputed',
    shortDescription: 'Sources conflict',
    description: 'Sources conflict. Resolve the contradiction before presenting this as true.',
    tone: 'danger',
    factStatus: 'not_fact',
    presentAsFact: false,
    caution: true,
    isCertain: false,
    needsReview: true,
    priority: 5,
  },
}

export function getEvidenceLabelDefinition(label: EvidenceLabel): EvidenceLabelDefinition {
  return EVIDENCE_LABEL_DEFINITIONS[label] ?? EVIDENCE_LABEL_DEFINITIONS.unknown
}

export function evidenceLabelCanPresentAsFact(label: EvidenceLabel): boolean {
  return getEvidenceLabelDefinition(label).presentAsFact
}

export function evidenceLabelRequiresCaution(label: EvidenceLabel): boolean {
  return getEvidenceLabelDefinition(label).caution
}

export function evidenceLabelForLoopState(
  loopState: LoopState | null | undefined,
  label: EvidenceLabel
): EvidenceLabel {
  if (loopState === 'stale') {
    return 'stale'
  }

  return label
}

export function formatEvidenceConfidence(confidence: number | null | undefined): string | null {
  if (confidence == null || !Number.isFinite(confidence)) {
    return null
  }

  const normalized = confidence > 1 ? confidence / 100 : confidence
  const clamped = Math.min(1, Math.max(0, normalized))

  return `${Math.round(clamped * 100)}% confidence`
}

export function getEvidenceConfidenceBand(
  confidence: number | null | undefined
): EvidenceConfidenceBand {
  if (confidence == null || !Number.isFinite(confidence)) {
    return 'unknown'
  }

  const normalized = confidence > 1 ? confidence / 100 : confidence
  if (normalized >= 0.8) {
    return 'high'
  }

  if (normalized >= 0.5) {
    return 'medium'
  }

  return 'low'
}

export function formatEvidenceSource(
  source: string | null | undefined,
  options: { sensitive?: boolean } = {}
): string | null {
  if (!source) {
    return options.sensitive ? 'Restricted evidence' : null
  }

  if (options.sensitive) {
    return 'Restricted evidence'
  }

  const singleLine = source.replace(/\s+/g, ' ').trim()
  if (!singleLine) {
    return null
  }

  if (PRIVATE_SOURCE_PATTERNS.some((pattern) => pattern.test(singleLine))) {
    return 'Restricted evidence'
  }

  if (singleLine.length <= MAX_SOURCE_LABEL_LENGTH) {
    return singleLine
  }

  return `${singleLine.slice(0, MAX_SOURCE_LABEL_LENGTH - 1).trimEnd()}...`
}

export function formatEvidenceTimestamp(
  timestamp: string | Date | null | undefined
): string | null {
  if (!timestamp) {
    return null
  }

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  if (!Number.isFinite(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatEvidenceMetadata(input: EvidenceMetadataInput): FormattedEvidenceMetadata {
  const definition = getEvidenceLabelDefinition(input.label)
  const sourceLabel = formatEvidenceSource(input.source, { sensitive: input.sensitive })
  const confidenceLabel = formatEvidenceConfidence(input.confidence)
  const timestampLabel = formatEvidenceTimestamp(input.timestamp)
  const visibleHref = input.sensitive ? null : (input.href ?? null)
  const detailParts = [sourceLabel, confidenceLabel, timestampLabel].filter(Boolean)
  const factNotice = definition.presentAsFact
    ? 'Can be presented as a fact.'
    : 'Do not present as a fact.'

  return {
    ...definition,
    sourceLabel,
    sourceKind: input.sourceKind ?? null,
    confidenceLabel,
    confidenceBand: getEvidenceConfidenceBand(input.confidence),
    timestampLabel,
    href: visibleHref,
    factNotice,
    summary:
      detailParts.length > 0
        ? `${definition.title} - ${factNotice} ${detailParts.join(' - ')}`
        : `${definition.title} - ${factNotice}`,
  }
}

export function getEvidenceDisplayMetadata(
  label: EvidenceLabel,
  loopState: LoopState | null | undefined = null
): EvidenceDisplayMetadata {
  const definition = getEvidenceLabelDefinition(label)
  const stateOverride = getLoopStateEvidenceOverride(loopState)
  const display = stateOverride ?? definition
  const needsReview =
    display.needsReview ||
    loopState === 'blocked' ||
    loopState === 'uncertain' ||
    loopState === 'waiting'

  return {
    ...display,
    loopState: loopState ?? null,
    needsReview,
    isCertain: display.isCertain && !needsReview,
    displayLabel: display.title,
    ariaLabel: `${display.title}: ${display.shortDescription}`,
  }
}

function getLoopStateEvidenceOverride(
  loopState: LoopState | null | undefined
): EvidenceLabelDefinition | null {
  switch (loopState) {
    case 'stale':
      return EVIDENCE_LABEL_DEFINITIONS.stale
    case 'uncertain':
      return EVIDENCE_LABEL_DEFINITIONS.unknown
    default:
      return null
  }
}

export function selectEvidenceLabel(input: EvidenceLabelSelectionInput): EvidenceLabel {
  if (input.hasConflictingSources) {
    return 'disputed'
  }

  if (input.loopState === 'stale' || isEvidenceTimestampStale(input)) {
    return 'stale'
  }

  if (input.explicitLabel) {
    return input.explicitLabel
  }

  if (input.hasSource === false && input.confidence == null) {
    return 'unknown'
  }

  if (input.isAiGenerated) {
    return 'inferred'
  }

  if (input.isComputed) {
    return 'computed'
  }

  if (input.isUserEntered) {
    return 'user_entered'
  }

  const confidence = normalizeConfidence(input.confidence)
  if (confidence == null) {
    return 'unknown'
  }

  return confidence >= 0.85 ? 'computed' : 'inferred'
}

function isEvidenceTimestampStale(input: EvidenceLabelSelectionInput): boolean {
  if (!input.sourceUpdatedAt) {
    return false
  }

  const updatedAt =
    input.sourceUpdatedAt instanceof Date ? input.sourceUpdatedAt : new Date(input.sourceUpdatedAt)
  if (!Number.isFinite(updatedAt.getTime())) {
    return false
  }

  const now = input.now ?? new Date()
  const staleAfterMs = (input.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS) * DAY_MS

  return now.getTime() - updatedAt.getTime() > staleAfterMs
}

function normalizeConfidence(confidence: number | null | undefined): number | null {
  if (confidence == null || !Number.isFinite(confidence)) {
    return null
  }

  const normalized = confidence > 1 ? confidence / 100 : confidence
  return Math.min(1, Math.max(0, normalized))
}
