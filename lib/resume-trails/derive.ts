import type { EvidenceLabel } from '@/lib/operating-loop/types'
import type {
  DeriveResumeTrailsOptions,
  ResumeTrail,
  ResumeTrailInput,
  ResumeTrailNextActionKind,
  ResumeTrailSourceKind,
} from './types'

const DEFAULT_LIMIT = 6
const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000

const SOURCE_PRIORITY: Record<ResumeTrailSourceKind, number> = {
  inquiry: 95,
  quote: 90,
  event: 85,
  menu: 80,
  recipe: 75,
  client_profile: 70,
  vendor: 60,
  note: 45,
  system: 30,
}

const EVIDENCE_PRIORITY: Record<EvidenceLabel, number> = {
  confirmed: 6,
  user_entered: 6,
  computed: 5,
  claimed: 4,
  inferred: 3,
  stale: 2,
  disputed: 1,
  unknown: 0,
}

export function deriveResumeTrails(
  items: ResumeTrailInput[],
  options: DeriveResumeTrailsOptions = {}
): ResumeTrail[] {
  const now = options.now ?? new Date()
  const limit = options.limit ?? DEFAULT_LIMIT

  const trails = items
    .map((item) => deriveResumeTrail(item, now))
    .filter((trail): trail is ResumeTrail => trail != null)

  return rankResumeTrails(dedupeResumeTrails(trails)).slice(0, Math.max(0, limit))
}

export function deriveResumeTrail(item: ResumeTrailInput, now = new Date()): ResumeTrail | null {
  const timestamp = normalizeIso(item.lastActionAt)
  const route = item.href ?? item.route ?? null

  if (!timestamp || !route) {
    return null
  }

  const status = cleanText(item.status)
  const explicitAction = contextString(item.context, 'next_action')
  const evidenceLabel = deriveEvidenceLabel(item, explicitAction, now)
  const next = deriveNextAction(item, explicitAction)
  const lastAction = cleanText(item.lastAction) ?? `Last saved ${sourceLabel(item.type)}`

  const trail: ResumeTrail = {
    id: `${item.type}:${item.id}`,
    source: {
      id: item.id,
      kind: item.type,
      status,
    },
    title: cleanText(item.title) ?? `Untitled ${sourceLabel(item.type)}`,
    description: cleanText(item.subtitle),
    lastAction,
    nextAction: next.label,
    nextActionKind: next.kind,
    route,
    evidenceLabel,
    timestamp,
    rank: 0,
  }

  return {
    ...trail,
    rank: scoreResumeTrail(trail, now),
  }
}

export function rankResumeTrails(trails: ResumeTrail[], now = new Date()): ResumeTrail[] {
  return [...trails].sort((a, b) => {
    const scoreDiff = scoreResumeTrail(b, now) - scoreResumeTrail(a, now)
    if (scoreDiff !== 0) {
      return scoreDiff
    }

    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
}

export function dedupeResumeTrails(trails: ResumeTrail[]): ResumeTrail[] {
  const bySource = new Map<string, ResumeTrail>()

  for (const trail of trails) {
    const key = `${trail.source.kind}:${trail.source.id}`
    const existing = bySource.get(key)

    if (!existing || compareTrailStrength(trail, existing) > 0) {
      bySource.set(key, trail)
    }
  }

  return Array.from(bySource.values())
}

export function hasResumeTrails(trails: ResumeTrail[]): boolean {
  return trails.length > 0
}

export function evidenceLabelText(label: EvidenceLabel): string {
  switch (label) {
    case 'confirmed':
      return 'Confirmed'
    case 'computed':
      return 'Computed'
    case 'inferred':
      return 'Inferred'
    case 'claimed':
      return 'Claimed'
    case 'stale':
      return 'Stale'
    case 'unknown':
      return 'Unknown'
    case 'disputed':
      return 'Needs review'
    case 'user_entered':
      return 'User entered'
  }

  return 'Unknown'
}

function compareTrailStrength(a: ResumeTrail, b: ResumeTrail): number {
  const aEvidence = EVIDENCE_PRIORITY[a.evidenceLabel]
  const bEvidence = EVIDENCE_PRIORITY[b.evidenceLabel]

  if (aEvidence !== bEvidence) {
    return aEvidence - bEvidence
  }

  if (a.nextActionKind !== b.nextActionKind) {
    return actionPriority(a.nextActionKind) - actionPriority(b.nextActionKind)
  }

  return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
}

function scoreResumeTrail(trail: ResumeTrail, now: Date): number {
  const ageMs = Math.max(0, now.getTime() - new Date(trail.timestamp).getTime())
  const ageDays = ageMs / (24 * 60 * 60 * 1000)
  const recency = Math.max(0, 100 - ageDays * 6)
  const evidence = EVIDENCE_PRIORITY[trail.evidenceLabel] * 12
  const action = actionPriority(trail.nextActionKind) * 8
  const source = SOURCE_PRIORITY[trail.source.kind]

  return Math.round(source + recency + evidence + action)
}

function actionPriority(kind: ResumeTrailNextActionKind): number {
  switch (kind) {
    case 'follow_up':
      return 5
    case 'complete':
      return 4
    case 'verify':
      return 3
    case 'continue':
      return 2
    case 'review':
      return 1
  }
}

function deriveEvidenceLabel(
  item: ResumeTrailInput,
  explicitAction: string | null,
  now: Date
): EvidenceLabel {
  const timestamp = normalizeIso(item.lastActionAt)

  if (!timestamp) {
    return 'unknown'
  }

  if (now.getTime() - new Date(timestamp).getTime() > STALE_AFTER_MS) {
    return 'stale'
  }

  if (explicitAction || item.lastAction) {
    return 'user_entered'
  }

  if (item.type === 'note') {
    return 'claimed'
  }

  return 'computed'
}

function deriveNextAction(
  item: ResumeTrailInput,
  explicitAction: string | null
): { label: string; kind: ResumeTrailNextActionKind } {
  if (explicitAction) {
    return { label: explicitAction, kind: actionKindFromText(explicitAction) }
  }

  const status = String(item.status ?? '').toLowerCase()

  if (item.type === 'inquiry') {
    if (status.includes('awaiting_client')) {
      return { label: 'Check whether the client needs a follow-up', kind: 'follow_up' }
    }

    return { label: 'Review the inquiry and set the next response', kind: 'review' }
  }

  if (item.type === 'quote') {
    return status.includes('sent')
      ? { label: 'Follow up on the sent quote', kind: 'follow_up' }
      : { label: 'Finish and verify the quote', kind: 'complete' }
  }

  if (item.type === 'event') {
    return { label: 'Continue event setup from the latest saved details', kind: 'continue' }
  }

  if (item.type === 'menu') {
    return { label: 'Continue menu editing and verify dish coverage', kind: 'continue' }
  }

  if (item.type === 'recipe') {
    return { label: 'Continue recipe editing and verify instructions', kind: 'continue' }
  }

  if (item.type === 'client_profile') {
    return { label: 'Complete the missing client profile details', kind: 'complete' }
  }

  if (item.type === 'vendor') {
    return { label: 'Review the vendor document trail', kind: 'review' }
  }

  if (item.type === 'note') {
    return { label: 'Review the note and decide whether it becomes work', kind: 'review' }
  }

  return { label: 'Review the saved work and choose the next step', kind: 'review' }
}

function actionKindFromText(value: string): ResumeTrailNextActionKind {
  const text = value.toLowerCase()

  if (text.includes('follow') || text.includes('reply') || text.includes('call')) {
    return 'follow_up'
  }

  if (text.includes('complete') || text.includes('finish') || text.includes('fill')) {
    return 'complete'
  }

  if (text.includes('verify') || text.includes('confirm') || text.includes('check')) {
    return 'verify'
  }

  return 'continue'
}

function contextString(
  context: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  const value = context?.[key]
  return typeof value === 'string' ? cleanText(value) : null
}

function cleanText(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeIso(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) {
    return null
  }

  return new Date(time).toISOString()
}

function sourceLabel(kind: ResumeTrailSourceKind): string {
  return kind.replace(/_/g, ' ')
}
