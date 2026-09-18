'use client'

import {
  getAppetiteTag,
  inferAppetiteTagIds,
  type AppetiteEvidence,
  type AppetiteEvidenceAction,
} from '@/lib/discovery/appetite-engine'
import type { ConsumerResultCard } from '@/lib/public-consumer/discovery-actions'
import {
  trackDiscoveryEvent,
  type DiscoveryInteractionAction,
} from '@/lib/discovery/track-discovery-click'

const EVIDENCE_KEY = 'chefflow:appetite-evidence:v1'
const EVIDENCE_LIMIT = 500

const DISCOVERY_ACTION_BY_APPETITE_ACTION: Record<AppetiteEvidenceAction, DiscoveryInteractionAction> = {
  spin_seen: 'impression',
  lock: 'click',
  unlock: 'click',
  reject: 'ignore',
  result_open: 'click',
  shortlist: 'click',
  conversion: 'booking',
  repeat: 'click',
}

function persistAppetiteEvidence(items: readonly AppetiteEvidence[]) {
  const groupedTagIds = [...new Set(items.map((item) => item.tagId))]
  for (const item of items) {
    const tag = getAppetiteTag(item.tagId)
    if (!tag) continue

    trackDiscoveryEvent({
      action: DISCOVERY_ACTION_BY_APPETITE_ACTION[item.action],
      itemType: 'culinary_signal',
      itemValue: item.tagId,
      itemLabel: tag.label,
      destinationPath: '/eat',
      eventContext: {
        source: 'eat_appetite',
        appetite_action: item.action,
        appetite_domain: tag.domain,
        appetite_tags: groupedTagIds,
        decision_id: item.decisionId ?? null,
      },
    })
  }
}

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
  const validItems = items.filter((item) => Boolean(getAppetiteTag(item.tagId)))
  if (validItems.length === 0) return

  const next = [...readAppetiteEvidence(), ...validItems].slice(-EVIDENCE_LIMIT)

  try {
    window.localStorage.setItem(EVIDENCE_KEY, JSON.stringify(next))
  } catch {
    // Appetite learning is optional when browser storage is unavailable.
  }

  persistAppetiteEvidence(validItems)
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
