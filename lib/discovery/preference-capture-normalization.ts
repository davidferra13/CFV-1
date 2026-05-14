import {
  createPreferenceSignalEntry,
  type PreferencePolarity,
  type PreferenceScope,
  type PreferenceShareCategory,
  type PreferenceSignalConsent,
  type PreferenceSignalDomain,
  type PreferenceSignalLedgerEntry,
  type PreferenceSignalSource,
} from '@/lib/discovery/preference-contract'
import type { FoodTaxonomyKind } from '@/lib/discovery/preference-taxonomy'

export type VisualTasteChoice = 'yes' | 'no' | 'sometimes' | 'not_tonight'

export interface VisualTasteCaptureChoice {
  id?: string
  rawValue: string
  kind?: FoodTaxonomyKind
  choice: VisualTasteChoice
  domain?: PreferenceSignalDomain
  source?: PreferenceSignalSource
  itemId?: string | null
  observedAt?: string
  confidence?: number
  metadata?: Record<string, unknown>
}

export interface VisualTasteCaptureContext {
  ownerId: string
  actorId?: string | null
  scope?: Partial<PreferenceScope>
  eventId?: string | null
  source?: PreferenceSignalSource
  domain?: PreferenceSignalDomain
  consent?: Partial<PreferenceSignalConsent>
  shareCategory?: PreferenceShareCategory
  observedAt?: string
}

const DEFAULT_CAPTURED_AT = '1970-01-01T00:00:00.000Z'

const CHOICE_POLICY: Record<
  VisualTasteChoice,
  {
    polarity: PreferencePolarity
    strength: number
    confidence: number
    profileUse: boolean
    requiresEventScope: boolean
  }
> = {
  yes: {
    polarity: 'like',
    strength: 1,
    confidence: 1,
    profileUse: true,
    requiresEventScope: false,
  },
  no: {
    polarity: 'dislike',
    strength: 0.9,
    confidence: 1,
    profileUse: true,
    requiresEventScope: false,
  },
  sometimes: {
    polarity: 'context',
    strength: 0.55,
    confidence: 0.82,
    profileUse: true,
    requiresEventScope: false,
  },
  not_tonight: {
    polarity: 'dislike',
    strength: 0.8,
    confidence: 0.92,
    profileUse: false,
    requiresEventScope: true,
  },
}

export function normalizeVisualTasteOnboardingChoices(
  choices: VisualTasteCaptureChoice[],
  context: VisualTasteCaptureContext
): PreferenceSignalLedgerEntry[] {
  return choices
    .filter((choice) => choice.rawValue.trim())
    .map((choice) => createVisualTasteSignal(choice, context))
}

export function createVisualTasteSignal(
  choice: VisualTasteCaptureChoice,
  context: VisualTasteCaptureContext
): PreferenceSignalLedgerEntry {
  const policy = CHOICE_POLICY[choice.choice]
  const eventId = context.eventId ?? context.scope?.eventId ?? null
  const eventScope =
    policy.requiresEventScope && eventId
      ? {
          level: 'event' as const,
          eventId,
          label: context.scope?.label ?? 'Event preference',
        }
      : {}
  const scope = {
    ...context.scope,
    ...eventScope,
  }
  const profileUse = policy.requiresEventScope ? Boolean(eventId) : policy.profileUse

  return createPreferenceSignalEntry({
    id: choice.id,
    ownerId: context.ownerId,
    scope,
    domain: choice.domain ?? context.domain ?? (policy.requiresEventScope ? 'event' : 'profile'),
    source: choice.source ?? context.source ?? 'user_entered',
    actorId: context.actorId ?? null,
    actorType: 'client',
    rawValue: choice.rawValue,
    kind: choice.kind,
    polarity: policy.polarity,
    strength: policy.strength,
    confidence: choice.confidence ?? policy.confidence,
    explicit: true,
    reviewState: 'accepted',
    consent: {
      profileUse,
      chefSharing: false,
      analyticsUse: false,
      ...context.consent,
    },
    shareCategory:
      context.shareCategory ?? (policy.requiresEventScope ? 'event_visible' : 'private'),
    observedAt: choice.observedAt ?? context.observedAt ?? DEFAULT_CAPTURED_AT,
    metadata: {
      captureFlow: 'visual_taste_onboarding',
      captureChoice: choice.choice,
      itemId: choice.itemId ?? null,
      eventScoped: policy.requiresEventScope,
      ...(choice.metadata ?? {}),
    },
  })
}
