import { pgClient } from '@/lib/db'
import {
  mapDiscoveryOutcomeToCulinaryProfileSignals,
  type CulinaryProfileDiscoveryOutcome,
  type CulinaryProfileDiscoveryOutcomeType,
} from '@/lib/discovery/culinary-profile-outcomes'
import {
  createPreferenceSignalEntry,
  type PreferenceSignalLedgerEntry,
} from '@/lib/discovery/preference-contract'
import type { FoodTaxonomyKind } from '@/lib/discovery/preference-taxonomy'

export interface SanitizedCulinaryOutcomeInput {
  itemId: string
  itemLabel: string
  itemKind?: FoodTaxonomyKind
  outcome: CulinaryProfileDiscoveryOutcomeType
  sessionId?: string | null
  surface?: CulinaryProfileDiscoveryOutcome['surface']
  occurredAt?: string
}

const OUTCOMES = new Set<CulinaryProfileDiscoveryOutcomeType>([
  'chose',
  'skipped',
  'liked',
  'not_again',
  'add_to_profile',
  'hide_from_chef',
])

const FOOD_KINDS = new Set<FoodTaxonomyKind>([
  'allergen',
  'budget',
  'craving',
  'cuisine',
  'dietary',
  'dish',
  'ingredient',
  'restaurant',
  'service_style',
  'tag',
])

export function sanitizeCulinaryOutcomeInput(
  input: Record<string, unknown>
): SanitizedCulinaryOutcomeInput | null {
  const itemId = coerceString(input.item_id ?? input.itemId ?? input.item_value ?? input.itemValue)
  const itemLabel = coerceString(input.item_label ?? input.itemLabel ?? input.label)
  const outcome = coerceString(input.outcome)
  if (!itemId || !itemLabel || !OUTCOMES.has(outcome as CulinaryProfileDiscoveryOutcomeType)) {
    return null
  }

  const itemKind = coerceString(input.item_kind ?? input.itemKind ?? input.kind)
  const surface = coerceString(input.surface)

  return {
    itemId: itemId.slice(0, 160),
    itemLabel: itemLabel.slice(0, 160),
    itemKind: FOOD_KINDS.has(itemKind as FoodTaxonomyKind)
      ? (itemKind as FoodTaxonomyKind)
      : undefined,
    outcome: outcome as CulinaryProfileDiscoveryOutcomeType,
    sessionId: coerceString(input.session_id ?? input.sessionId)?.slice(0, 128) ?? null,
    surface: isOutcomeSurface(surface) ? surface : 'unknown',
    occurredAt: normalizeTimestamp(coerceString(input.occurred_at ?? input.occurredAt)),
  }
}

export async function recordCulinaryProfileOutcome(input: {
  ownerId: string
  actorId?: string | null
  outcome: SanitizedCulinaryOutcomeInput
}): Promise<{ outcome: CulinaryProfileDiscoveryOutcome; signalCount: number }> {
  const occurredAt = input.outcome.occurredAt ?? new Date().toISOString()
  const decision: CulinaryProfileDiscoveryOutcome = {
    id: [
      'outcome',
      input.ownerId,
      input.outcome.itemId,
      input.outcome.outcome,
      Date.parse(occurredAt) || occurredAt.replace(/\D/g, ''),
    ]
      .join(':')
      .replace(/[^a-zA-Z0-9:_-]/g, '_'),
    ownerId: input.ownerId,
    actorId: input.actorId ?? input.ownerId,
    itemId: input.outcome.itemId,
    itemLabel: input.outcome.itemLabel,
    itemKind: input.outcome.itemKind,
    outcome: input.outcome.outcome,
    occurredAt,
    sessionId: input.outcome.sessionId ?? null,
    surface: input.outcome.surface ?? 'unknown',
  }
  const mapped = mapDiscoveryOutcomeToCulinaryProfileSignals(decision)

  await pgClient`
    INSERT INTO culinary_profile_outcomes
      (owner_id, actor_id, item_id, item_label, item_kind, outcome, surface, session_id, occurred_at)
    VALUES
      (
        ${input.ownerId}::uuid,
        ${input.actorId ?? input.ownerId}::uuid,
        ${input.outcome.itemId},
        ${input.outcome.itemLabel},
        ${input.outcome.itemKind ?? null},
        ${input.outcome.outcome},
        ${input.outcome.surface ?? 'unknown'},
        ${input.outcome.sessionId ?? null},
        ${occurredAt}
      )
  `

  await persistPreferenceSignals(mapped.signals)
  return { outcome: decision, signalCount: mapped.signals.length }
}

export async function recordSavedChefPreferenceSignal(input: {
  ownerId: string
  chefId: string
  chefLabel?: string | null
  saved: boolean
  observedAt?: string
}): Promise<void> {
  const observedAt = input.observedAt ?? new Date().toISOString()
  const signal = createPreferenceSignalEntry({
    id: `saved-chef:${input.ownerId}:${input.chefId}`,
    ownerId: input.ownerId,
    domain: 'discovery',
    source: 'saved_item',
    rawValue: input.chefLabel ?? input.chefId,
    kind: 'tag',
    polarity: input.saved ? 'like' : 'context',
    strength: input.saved ? 0.72 : 0.1,
    confidence: input.saved ? 0.74 : 0.35,
    explicit: true,
    reviewState: input.saved ? 'accepted' : 'superseded',
    shareCategory: 'private',
    consent: {
      profileUse: input.saved,
      chefSharing: false,
      analyticsUse: false,
    },
    observedAt,
    createdAt: observedAt,
    metadata: {
      culinaryProfileCategory: 'service_style',
      favoriteChefId: input.chefId,
      saved: input.saved,
    },
  })

  await persistPreferenceSignals([signal])
}

export async function persistPreferenceSignals(
  signals: PreferenceSignalLedgerEntry[]
): Promise<void> {
  for (const signal of signals) {
    await pgClient`
      INSERT INTO culinary_profile_signals
        (
          owner_id,
          signal_id,
          signal_payload,
          review_state,
          share_category,
          hidden_from_chef,
          observed_at,
          updated_at
        )
      VALUES
        (
          ${signal.ownerId}::uuid,
          ${signal.id},
          ${JSON.stringify(signal)}::jsonb,
          ${signal.reviewState},
          ${signal.shareCategory},
          ${signal.metadata.hiddenFromChef === true || signal.metadata.private === true},
          ${signal.observedAt},
          now()
        )
      ON CONFLICT (owner_id, signal_id)
      DO UPDATE SET
        signal_payload = EXCLUDED.signal_payload,
        review_state = EXCLUDED.review_state,
        share_category = EXCLUDED.share_category,
        hidden_from_chef = EXCLUDED.hidden_from_chef,
        observed_at = EXCLUDED.observed_at,
        updated_at = now()
    `
  }
}

function normalizeTimestamp(value: string | null | undefined): string {
  const date = value ? new Date(value) : new Date()
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function coerceString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function isOutcomeSurface(value: unknown): value is CulinaryProfileDiscoveryOutcome['surface'] {
  return (
    value === 'homepage' ||
    value === 'eat' ||
    value === 'chef_profile' ||
    value === 'meal_board' ||
    value === 'unknown'
  )
}
