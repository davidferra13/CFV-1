import { getOllamaConfig, type ModelTier } from '@/lib/ai/providers'
import {
  getPlatformRuntimeMetadata,
  type PlatformRuntimeMetadata,
} from '@/lib/platform-observability/context'
import {
  PUBLIC_INTAKE_LANE_KEYS,
  PUBLIC_INTAKE_LANE_LABELS,
  isPublicIntakeLaneKey,
  type PublicIntakeLaneKey,
} from '@/lib/public/intake-lane-config'

// Source Provenance Helper
// Pure derivation function: maps inquiry fields to a canonical intake-lane key and label.
// No database calls, no auth, no side effects.
// Used by analytics actions so all grouping goes through one consistent precedence order.

export type ProvenanceLaneKey =
  | PublicIntakeLaneKey
  | 'take_a_chef'
  | 'phone'
  | 'email'
  | 'text'
  | 'referral'
  | 'walk_in'
  | 'instagram'
  | 'other'

export type SourceProvenance = {
  key: ProvenanceLaneKey
  label: string
}

export type DerivedOutputDerivationMethod = 'deterministic' | 'ai-assisted' | 'hybrid'

export type DerivedOutputFreshnessStatus = 'fresh' | 'stale' | 'point-in-time'

export type DerivedOutputSourceKind =
  | 'chef'
  | 'client'
  | 'event'
  | 'menu'
  | 'quote'
  | 'report'
  | 'document'
  | 'recipe'
  | 'ingredient'
  | 'prompt'
  | 'template'
  | 'other'

export type DerivedOutputSourceInput = {
  kind: DerivedOutputSourceKind
  asOf?: string | null
  id?: string | null
  label?: string | null
}

export type DerivedOutputSource = {
  kind: DerivedOutputSourceKind
  asOf: string | null
  id: string | null
  label: string | null
}

export type DerivedOutputFreshness = {
  ageSeconds: number
  asOf: string
  status: DerivedOutputFreshnessStatus
  windowSeconds: number | null
}

export type DerivedOutputModelMetadata = {
  endpointName: 'local' | 'cloud'
  executionLocation: 'local' | 'cloud'
  mode: string
  model: string
  modelTier: ModelTier
  provider: 'ollama'
  taskType: string | null
}

export type DerivedOutputProvenance = {
  contractVersion: 'derived-output.v1'
  derivationMethod: DerivedOutputDerivationMethod
  derivationSource: string
  freshness: DerivedOutputFreshness
  generatedAt: string
  inputs: DerivedOutputSource[]
  model: DerivedOutputModelMetadata | null
  moduleId: string
  runtime: PlatformRuntimeMetadata
}

export type CreateDerivedOutputProvenanceInput = {
  asOf?: string | null
  derivationMethod: DerivedOutputDerivationMethod
  derivationSource: string
  freshnessWindowMs?: number | null
  generatedAt?: string
  inputs?: Array<DerivedOutputSourceInput | null | undefined>
  model?: DerivedOutputModelMetadata | null
  moduleId: string
}

const LANE_LABELS: Record<ProvenanceLaneKey, string> = {
  ...PUBLIC_INTAKE_LANE_LABELS,
  take_a_chef: 'Take a Chef',
  phone: 'Phone',
  email: 'Email',
  text: 'Text',
  referral: 'Referral',
  walk_in: 'Walk-In',
  instagram: 'Instagram',
  other: 'Other',
}

export type InquiryProvenanceInput = {
  channel?: string | null
  // unknown_fields can be an object {open_booking: true, embed_source: true, ...}
  // or a legacy array of blocking question strings - handle both safely
  unknown_fields?: Record<string, unknown> | unknown[] | null
  utm_medium?: string | null
  external_platform?: string | null
  // Linked event booking_source - only relevant when event context is available
  event_booking_source?: string | null
}

function safeFields(
  raw: Record<string, unknown> | unknown[] | null | undefined
): Record<string, unknown> {
  if (!raw || Array.isArray(raw)) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  return {}
}

function toValidDateString(value: string | null | undefined, fallback: string) {
  if (!value) return fallback
  const normalized = new Date(value)
  return Number.isNaN(normalized.getTime()) ? fallback : normalized.toISOString()
}

function normalizeDerivedOutputInputs(
  inputs: Array<DerivedOutputSourceInput | null | undefined> | undefined
): DerivedOutputSource[] {
  return (inputs ?? [])
    .filter((input): input is DerivedOutputSourceInput => Boolean(input))
    .map((input) => ({
      kind: input.kind,
      asOf:
        input.asOf && !Number.isNaN(new Date(input.asOf).getTime())
          ? new Date(input.asOf).toISOString()
          : null,
      id: input.id?.trim() || null,
      label: input.label?.trim() || null,
    }))
}

export function resolveAiDerivedOutputModelMetadata(input?: {
  modelTier?: ModelTier
  preferredLocation?: 'local' | 'cloud'
  taskType?: string
}): DerivedOutputModelMetadata {
  const config = getOllamaConfig({
    modelTier: input?.modelTier ?? 'standard',
    preferredLocation: input?.preferredLocation,
    taskType: input?.taskType,
  })

  return {
    endpointName: config.endpointName,
    executionLocation: config.executionLocation,
    mode: config.mode,
    model: config.model,
    modelTier: input?.modelTier ?? 'standard',
    provider: 'ollama',
    taskType: input?.taskType ?? null,
  }
}

export function createDerivedOutputProvenance(
  input: CreateDerivedOutputProvenanceInput
): DerivedOutputProvenance {
  const generatedAt = toValidDateString(input.generatedAt ?? null, new Date().toISOString())
  const asOf = toValidDateString(input.asOf ?? null, generatedAt)
  const ageSeconds = Math.max(
    0,
    Math.round((new Date(generatedAt).getTime() - new Date(asOf).getTime()) / 1000)
  )
  const windowSeconds =
    typeof input.freshnessWindowMs === 'number' && Number.isFinite(input.freshnessWindowMs)
      ? Math.max(0, Math.round(input.freshnessWindowMs / 1000))
      : null

  return {
    contractVersion: 'derived-output.v1',
    derivationMethod: input.derivationMethod,
    derivationSource: input.derivationSource,
    freshness: {
      ageSeconds,
      asOf,
      status:
        windowSeconds == null ? 'point-in-time' : ageSeconds <= windowSeconds ? 'fresh' : 'stale',
      windowSeconds,
    },
    generatedAt,
    inputs: normalizeDerivedOutputInputs(input.inputs),
    model: input.model ?? null,
    moduleId: input.moduleId,
    runtime: getPlatformRuntimeMetadata(),
  }
}

export function attachDerivedOutputProvenance<T extends object>(
  output: T,
  input: CreateDerivedOutputProvenanceInput
): T & { provenance: DerivedOutputProvenance } {
  return {
    ...output,
    provenance: createDerivedOutputProvenance(input),
  }
}

// Precedence order (highest to lowest):
// 1. explicit submission_source lane key in unknown_fields
// 2. open_booking markers (unknown_fields.open_booking or utm_medium)
// 3. embed marker (unknown_fields.embed_source)
// 4. wix channel
// 5. kiosk channel
// 6. instant_book from linked event booking_source
// 7. external_platform (third-party marketplace)
// 8. coarse channel label (phone, email, text, referral, walk_in, instagram, take_a_chef)
// 9. website channel -> public_profile_inquiry (direct chef profile inquiry)
// 10. fallback: other
export function deriveProvenance(input: InquiryProvenanceInput): SourceProvenance {
  const fields = safeFields(input.unknown_fields)

  // 1. Explicit lane key
  const explicit = fields.submission_source as string | undefined
  if (isPublicIntakeLaneKey(explicit)) {
    return { key: explicit, label: LANE_LABELS[explicit] }
  }

  // 2. Open booking
  if (fields.open_booking === true || input.utm_medium === 'open_booking') {
    return {
      key: PUBLIC_INTAKE_LANE_KEYS.open_booking,
      label: LANE_LABELS[PUBLIC_INTAKE_LANE_KEYS.open_booking],
    }
  }

  // 3. Embed
  if (fields.embed_source === true) {
    return {
      key: PUBLIC_INTAKE_LANE_KEYS.embed_inquiry,
      label: LANE_LABELS[PUBLIC_INTAKE_LANE_KEYS.embed_inquiry],
    }
  }

  // 4. Wix
  if (input.channel === 'wix') {
    return {
      key: PUBLIC_INTAKE_LANE_KEYS.wix_form,
      label: LANE_LABELS[PUBLIC_INTAKE_LANE_KEYS.wix_form],
    }
  }

  // 5. Kiosk
  if (input.channel === 'kiosk') {
    return {
      key: PUBLIC_INTAKE_LANE_KEYS.kiosk_inquiry,
      label: LANE_LABELS[PUBLIC_INTAKE_LANE_KEYS.kiosk_inquiry],
    }
  }

  // 6. Instant book (event-side signal)
  if (input.event_booking_source === 'instant_book') {
    return {
      key: PUBLIC_INTAKE_LANE_KEYS.instant_book,
      label: LANE_LABELS[PUBLIC_INTAKE_LANE_KEYS.instant_book],
    }
  }

  // 7. External marketplace
  if (input.external_platform) {
    if (input.external_platform === 'take_a_chef') {
      return { key: 'take_a_chef', label: LANE_LABELS.take_a_chef }
    }
    // Other known marketplaces fall back with their raw name as label
    return { key: 'other', label: input.external_platform }
  }

  // 8. Coarse channel
  const ch = input.channel
  switch (ch) {
    case 'phone':
      return { key: 'phone', label: LANE_LABELS.phone }
    case 'email':
      return { key: 'email', label: LANE_LABELS.email }
    case 'text':
      return { key: 'text', label: LANE_LABELS.text }
    case 'referral':
      return { key: 'referral', label: LANE_LABELS.referral }
    case 'walk_in':
      return { key: 'walk_in', label: LANE_LABELS.walk_in }
    case 'instagram':
      return { key: 'instagram', label: LANE_LABELS.instagram }
    case 'take_a_chef':
      return { key: 'take_a_chef', label: LANE_LABELS.take_a_chef }
    case 'website':
      // 9. Website channel without open_booking/embed markers = direct profile inquiry
      return {
        key: PUBLIC_INTAKE_LANE_KEYS.public_profile_inquiry,
        label: LANE_LABELS[PUBLIC_INTAKE_LANE_KEYS.public_profile_inquiry],
      }
  }

  // 10. Fallback
  return { key: 'other', label: ch || 'Other' }
}
