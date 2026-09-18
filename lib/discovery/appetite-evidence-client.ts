'use client'

import {
  inferAppetiteTagIds,
  type AppetiteEvidence,
  type AppetiteEvidenceAction,
} from '@/lib/discovery/appetite-engine'
import type { ConsumerResultCard } from '@/lib/public-consumer/discovery-actions'

const EVIDENCE_KEY = 'chefflow:appetite-evidence:v1'
const EVIDENCE_LIMIT = 500

function isEvidenceAction(value: unknown): value is AppetiteEvidenceAction {
  return (
    value === 'spin_seen' ||
    value === 'lock' ||
    value === 'unlock' ||
    value === 'reject' ||
    value === 'result_open' ||
    value === 'shortlist' ||
    value === 'conversion' ||
    value === 'repeat'
  )
}

export function readAppetiteEvidence(): AppetiteEvidence[] {
  if (typeof window === 'undefined') return []

  try {
    const parsed = JSON.parse(window.localStorage.getItem(EVIDENCE_KEY) || '[]')
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(
        (item): item is AppetiteEvidence =>
          Boolean(
            item &&
              typeof item === 'object' &&
              typeof item.tagId === 'string' &&
              isEvidenceAction(item.action) &&
              typeof item.occurredAt === 'string'
          )
      )
      .slice(-EVIDENCE_LIMIT)
  } catch {
    return []
  }
}

export function recordAppetiteEvidence(items: readonly AppetiteEvidence[]) {
  if (typeof window === 'undefined' || items.length === 0) return
  const next = [...readAppetiteEvidence(), ...items].slice(-EVIDENCE_LIMIT)

  try {
    window.localStorage.setItem(EVIDENCE_KEY, JSON.stringify(next))
  } catch {
    // Appetite learning is optional when browser storage is unavailable.
  }
}

export function currentSessionAppetiteTagIds(): string[] {
  if (typeof window === 'undefined') return []

  const params = new URLSearchParams(window.location.search)
  return (params.get('appetite') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function appetiteTagIdsForResult(card: ConsumerResultCard): string[] {
  return inferAppetiteTagIds([
    card.title,
    card.subtitle,
    card.eyebrow,
    card.priceLabel,
    ...card.dietaryTags,
    ...card.serviceModes,
  ])
}

export function recordAppetiteResultEvidence(
  card: ConsumerResultCard,
  action: Extract<AppetiteEvidenceAction, 'result_open' | 'shortlist' | 'conversion' | 'repeat'>
) {
  const tagIds = new Set([...currentSessionAppetiteTagIds(), ...appetiteTagIdsForResult(card)])
  const occurredAt = new Date().toISOString()
  const decisionId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : occurredAt + ':' + action

  recordAppetiteEvidence(
    [...tagIds].map((tagId) => ({
      tagId,
      action,
      occurredAt,
      decisionId,
    }))
  )
}
