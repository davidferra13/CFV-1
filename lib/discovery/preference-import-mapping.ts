import {
  createPreferenceSignalEntry,
  type PreferencePolarity,
  type PreferenceScope,
  type PreferenceSignalConsent,
  type PreferenceSignalDomain,
  type PreferenceSignalLedgerEntry,
} from '@/lib/discovery/preference-contract'
import type { FoodTaxonomyKind } from '@/lib/discovery/preference-taxonomy'

export type PreferenceImportSourceKind =
  | 'allergy_record'
  | 'client_note'
  | 'past_menu'
  | 'served_dish_history'
  | 'menu_approval'
  | 'chat'
  | 'intake_form'
  | 'meal_request'
  | 'event_recap'

export interface PreferenceImportTerm {
  value: string
  kind?: FoodTaxonomyKind
  polarity: PreferencePolarity
  confidence?: number
  evidence?: string | null
}

export interface ExistingClientPreferenceImportRecord {
  id: string
  source: PreferenceImportSourceKind
  observedAt?: string
  terms: PreferenceImportTerm[]
  eventId?: string | null
  chefVisible?: boolean
  metadata?: Record<string, unknown>
}

export interface PreferenceImportContext {
  ownerId: string
  actorId?: string | null
  scope?: Partial<PreferenceScope>
  consent?: Partial<PreferenceSignalConsent>
}

const DEFAULT_IMPORTED_AT = '1970-01-01T00:00:00.000Z'

const IMPORT_DOMAIN: Record<PreferenceImportSourceKind, PreferenceSignalDomain> = {
  allergy_record: 'intake',
  client_note: 'profile',
  past_menu: 'menu',
  served_dish_history: 'menu',
  menu_approval: 'menu',
  chat: 'remy',
  intake_form: 'intake',
  meal_request: 'event',
  event_recap: 'event',
}

const IMPORT_BASE_CONFIDENCE: Record<PreferenceImportSourceKind, number> = {
  allergy_record: 0.86,
  client_note: 0.55,
  past_menu: 0.58,
  served_dish_history: 0.62,
  menu_approval: 0.7,
  chat: 0.45,
  intake_form: 0.78,
  meal_request: 0.6,
  event_recap: 0.58,
}

export function mapExistingClientDataToPreferenceSuggestions(
  records: ExistingClientPreferenceImportRecord[],
  context: PreferenceImportContext
): PreferenceSignalLedgerEntry[] {
  return records.flatMap((record) =>
    record.terms
      .filter((term) => term.value.trim())
      .map((term) => mapImportTermToSuggestion(record, term, context))
  )
}

export function mapImportTermToSuggestion(
  record: ExistingClientPreferenceImportRecord,
  term: PreferenceImportTerm,
  context: PreferenceImportContext
): PreferenceSignalLedgerEntry {
  const safetyCritical = isSafetyCritical(term.polarity)
  const eventScope = record.eventId
    ? {
        level: 'event' as const,
        eventId: record.eventId,
      }
    : {}

  return createPreferenceSignalEntry({
    id: `import:${record.source}:${record.id}:${term.polarity}:${term.value}`
      .toLowerCase()
      .replace(/[^a-z0-9:_-]/g, '_'),
    ownerId: context.ownerId,
    scope: {
      ...context.scope,
      ...eventScope,
    },
    domain: IMPORT_DOMAIN[record.source],
    source: 'import',
    actorId: context.actorId ?? null,
    actorType: 'import',
    rawValue: term.value,
    kind: term.kind,
    polarity: term.polarity,
    strength: safetyCritical ? 1 : 0.7,
    confidence: term.confidence ?? IMPORT_BASE_CONFIDENCE[record.source],
    explicit: false,
    reviewState: 'pending_review',
    consent: {
      profileUse: true,
      chefSharing: record.chefVisible ?? safetyCritical,
      analyticsUse: false,
      ...(context.consent ?? {}),
    },
    shareCategory: record.chefVisible || safetyCritical ? 'chef_visible' : 'private',
    observedAt: record.observedAt ?? DEFAULT_IMPORTED_AT,
    metadata: {
      importSource: record.source,
      sourceRecordId: record.id,
      reviewGate: safetyCritical ? 'safety_critical' : 'standard',
      evidence: term.evidence ?? null,
      ...(record.metadata ?? {}),
    },
  })
}

function isSafetyCritical(polarity: PreferencePolarity): boolean {
  return polarity === 'allergy' || polarity === 'restriction' || polarity === 'never_show'
}
