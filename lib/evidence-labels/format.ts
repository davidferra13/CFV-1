import type { EvidenceLabel } from '@/lib/operating-loop/types'

import type {
  EvidenceConfidenceBand,
  EvidenceLabelDefinition,
  EvidenceMetadata,
  FormattedEvidenceMetadata,
} from './types'

export const EVIDENCE_LABEL_DEFINITIONS: Record<EvidenceLabel, EvidenceLabelDefinition> = {
  confirmed: {
    label: 'confirmed',
    title: 'Confirmed',
    shortTitle: 'Confirmed',
    description:
      'Backed by a direct record, accepted state, signed document, or verified user input.',
    tone: 'success',
    factual: true,
    caution: false,
    priority: 70,
  },
  computed: {
    label: 'computed',
    title: 'Computed',
    shortTitle: 'Computed',
    description: 'Calculated deterministically from trusted data.',
    tone: 'info',
    factual: true,
    caution: false,
    priority: 60,
  },
  user_entered: {
    label: 'user_entered',
    title: 'User entered',
    shortTitle: 'User',
    description: 'Entered by a ChefFlow user but not independently verified.',
    tone: 'info',
    factual: true,
    caution: false,
    priority: 58,
  },
  claimed: {
    label: 'claimed',
    title: 'Claimed',
    shortTitle: 'Claimed',
    description: 'Provided by a person or external source without independent verification.',
    tone: 'warning',
    factual: false,
    caution: true,
    priority: 45,
  },
  inferred: {
    label: 'inferred',
    title: 'Inferred',
    shortTitle: 'Inferred',
    description: 'Estimated from a pattern, model, or assumption. Treat as a lead, not a fact.',
    tone: 'muted',
    factual: false,
    caution: true,
    priority: 35,
  },
  stale: {
    label: 'stale',
    title: 'Stale',
    shortTitle: 'Stale',
    description: 'Based on old evidence that should be refreshed before strong action.',
    tone: 'warning',
    factual: false,
    caution: true,
    priority: 25,
  },
  unknown: {
    label: 'unknown',
    title: 'Unknown',
    shortTitle: 'Unknown',
    description: 'Missing or unavailable evidence. Do not guess.',
    tone: 'muted',
    factual: false,
    caution: true,
    priority: 10,
  },
  disputed: {
    label: 'disputed',
    title: 'Disputed',
    shortTitle: 'Disputed',
    description: 'Sources conflict. Resolve the contradiction before presenting this as true.',
    tone: 'danger',
    factual: false,
    caution: true,
    priority: 5,
  },
}

const PRIVATE_SOURCE_PATTERNS = [
  /\bprivate\s+note\b/i,
  /\binternal\s+note\b/i,
  /\bstaff\s+note\b/i,
  /\bchef\s+note\b/i,
  /\bclient\s+note\b/i,
]

const MAX_SOURCE_LABEL_LENGTH = 80

export function getEvidenceDefinition(label: EvidenceLabel): EvidenceLabelDefinition {
  return EVIDENCE_LABEL_DEFINITIONS[label] ?? EVIDENCE_LABEL_DEFINITIONS.unknown
}

export function getEvidencePriority(label: EvidenceLabel): number {
  return getEvidenceDefinition(label).priority
}

export function sortEvidenceLabelsByPriority(labels: EvidenceLabel[]): EvidenceLabel[] {
  return [...labels].sort((a, b) => getEvidencePriority(b) - getEvidencePriority(a))
}

export function shouldPresentAsFact(label: EvidenceLabel): boolean {
  return getEvidenceDefinition(label).factual
}

export function formatConfidence(confidence: number | null | undefined): string | null {
  if (confidence == null || !Number.isFinite(confidence)) return null

  const normalized = confidence > 1 ? confidence / 100 : confidence
  const clamped = Math.min(1, Math.max(0, normalized))

  return `${Math.round(clamped * 100)}% confidence`
}

export function getConfidenceBand(confidence: number | null | undefined): EvidenceConfidenceBand {
  if (confidence == null || !Number.isFinite(confidence)) return 'unknown'

  const normalized = confidence > 1 ? confidence / 100 : confidence
  if (normalized >= 0.8) return 'high'
  if (normalized >= 0.5) return 'medium'
  return 'low'
}

export function formatEvidenceSource(source: string | null | undefined): string | null {
  if (!source) return null

  const singleLine = source.replace(/\s+/g, ' ').trim()
  if (!singleLine) return null

  if (PRIVATE_SOURCE_PATTERNS.some((pattern) => pattern.test(singleLine))) {
    return 'Private note'
  }

  if (singleLine.length <= MAX_SOURCE_LABEL_LENGTH) return singleLine

  return `${singleLine.slice(0, MAX_SOURCE_LABEL_LENGTH - 1).trimEnd()}...`
}

export function formatEvidenceTimestamp(
  timestamp: string | Date | null | undefined
): string | null {
  if (!timestamp) return null

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatEvidenceMetadata(metadata: EvidenceMetadata): FormattedEvidenceMetadata {
  const definition = getEvidenceDefinition(metadata.label)
  const sourceLabel = formatEvidenceSource(metadata.source)
  const confidenceLabel = formatConfidence(metadata.confidence)
  const timestampLabel = formatEvidenceTimestamp(metadata.timestamp)
  const detailParts = [sourceLabel, confidenceLabel, timestampLabel].filter(Boolean)

  return {
    ...definition,
    sourceLabel,
    confidenceLabel,
    confidenceBand: getConfidenceBand(metadata.confidence),
    timestampLabel,
    href: metadata.href ?? null,
    summary:
      detailParts.length > 0
        ? `${definition.title} - ${detailParts.join(' - ')}`
        : definition.title,
  }
}

export function getStrongestEvidenceLabel(labels: EvidenceLabel[]): EvidenceLabel {
  if (labels.length === 0) return 'unknown'
  return sortEvidenceLabelsByPriority(labels)[0] ?? 'unknown'
}
