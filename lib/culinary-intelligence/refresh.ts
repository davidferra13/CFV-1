import type { CulinaryFactType } from './domain'

export type CulinarySourceType =
  | 'api'
  | 'scraper'
  | 'receipt'
  | 'invoice'
  | 'distributor_catalog'
  | 'public_dataset'
  | 'product_feed'
  | 'image'
  | 'ocr'
  | 'pdf'
  | 'chef_correction'
  | 'manual_review'
  | 'recall_feed'
  | 'equipment_spec'
  | 'property_walkthrough'
  | 'license'
  | 'insurance'
  | 'inspection'

export type { CulinaryFactType } from './domain'

export type FreshnessState = 'fresh' | 'aging' | 'stale' | 'expired'
export type WatchdogSubject = 'capture' | 'review'

export interface RefreshPolicy {
  sourceType: CulinarySourceType
  refreshIntervalMs: number | null
  agingAfterMs: number
  staleAfterMs: number
  expiresAfterMs: number
  retryBaseDelayMs: number
  retryMaxDelayMs: number
  captureWatchdogMs: number
  reviewWatchdogMs: number
  expiryLeadTimeMs?: number
}

export interface RefreshRecord {
  sourceType: CulinarySourceType
  factType?: CulinaryFactType
  capturedAt: Date | string | number
  lastRefreshedAt?: Date | string | number | null
  expiresAt?: Date | string | number | null
  status?:
    | 'capturing'
    | 'captured'
    | 'parsing'
    | 'needs_review'
    | 'reviewing'
    | 'verified'
    | 'failed'
  statusChangedAt?: Date | string | number | null
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const SOURCE_POLICIES: Record<CulinarySourceType, RefreshPolicy> = {
  api: policy('api', 6 * HOUR_MS, 3 * HOUR_MS, 12 * HOUR_MS, 3 * DAY_MS, 30_000, 6 * HOUR_MS),
  scraper: policy(
    'scraper',
    12 * HOUR_MS,
    6 * HOUR_MS,
    24 * HOUR_MS,
    5 * DAY_MS,
    60_000,
    12 * HOUR_MS
  ),
  receipt: policy(
    'receipt',
    null,
    14 * DAY_MS,
    30 * DAY_MS,
    180 * DAY_MS,
    5 * 60_000,
    24 * HOUR_MS
  ),
  invoice: policy(
    'invoice',
    null,
    30 * DAY_MS,
    60 * DAY_MS,
    365 * DAY_MS,
    5 * 60_000,
    24 * HOUR_MS
  ),
  distributor_catalog: policy(
    'distributor_catalog',
    7 * DAY_MS,
    3 * DAY_MS,
    10 * DAY_MS,
    45 * DAY_MS,
    2 * 60_000,
    12 * HOUR_MS
  ),
  public_dataset: policy(
    'public_dataset',
    30 * DAY_MS,
    14 * DAY_MS,
    45 * DAY_MS,
    180 * DAY_MS,
    10 * 60_000,
    24 * HOUR_MS
  ),
  product_feed: policy(
    'product_feed',
    24 * HOUR_MS,
    12 * HOUR_MS,
    36 * HOUR_MS,
    7 * DAY_MS,
    60_000,
    12 * HOUR_MS
  ),
  image: policy('image', null, 30 * DAY_MS, 90 * DAY_MS, 365 * DAY_MS, 5 * 60_000, 24 * HOUR_MS),
  ocr: policy('ocr', null, 30 * DAY_MS, 90 * DAY_MS, 365 * DAY_MS, 5 * 60_000, 24 * HOUR_MS),
  pdf: policy('pdf', null, 60 * DAY_MS, 120 * DAY_MS, 2 * 365 * DAY_MS, 5 * 60_000, 24 * HOUR_MS),
  chef_correction: policy(
    'chef_correction',
    null,
    90 * DAY_MS,
    180 * DAY_MS,
    2 * 365 * DAY_MS,
    5 * 60_000,
    24 * HOUR_MS
  ),
  manual_review: policy(
    'manual_review',
    null,
    90 * DAY_MS,
    180 * DAY_MS,
    2 * 365 * DAY_MS,
    5 * 60_000,
    24 * HOUR_MS
  ),
  recall_feed: policy(
    'recall_feed',
    24 * HOUR_MS,
    12 * HOUR_MS,
    30 * HOUR_MS,
    3 * DAY_MS,
    5 * 60_000,
    6 * HOUR_MS
  ),
  equipment_spec: policy(
    'equipment_spec',
    180 * DAY_MS,
    90 * DAY_MS,
    240 * DAY_MS,
    3 * 365 * DAY_MS,
    10 * 60_000,
    24 * HOUR_MS
  ),
  property_walkthrough: policy(
    'property_walkthrough',
    90 * DAY_MS,
    30 * DAY_MS,
    120 * DAY_MS,
    365 * DAY_MS,
    5 * 60_000,
    24 * HOUR_MS
  ),
  license: {
    ...policy(
      'license',
      30 * DAY_MS,
      14 * DAY_MS,
      30 * DAY_MS,
      60 * DAY_MS,
      10 * 60_000,
      24 * HOUR_MS
    ),
    expiryLeadTimeMs: 45 * DAY_MS,
  },
  insurance: {
    ...policy(
      'insurance',
      30 * DAY_MS,
      14 * DAY_MS,
      30 * DAY_MS,
      60 * DAY_MS,
      10 * 60_000,
      24 * HOUR_MS
    ),
    expiryLeadTimeMs: 45 * DAY_MS,
  },
  inspection: {
    ...policy(
      'inspection',
      90 * DAY_MS,
      30 * DAY_MS,
      120 * DAY_MS,
      365 * DAY_MS,
      10 * 60_000,
      24 * HOUR_MS
    ),
    expiryLeadTimeMs: 30 * DAY_MS,
  },
}

const HIGH_RISK_FACTS = new Set<CulinaryFactType>([
  'allergen',
  'equipment_recall_status',
  'equipment_utility_requirement',
  'inspection_status',
  'insurance_coverage',
  'license_validity',
  'permit_validity',
  'price_cents',
  'property_access_constraint',
  'property_kitchen_constraint',
  'recall',
])

export function getRefreshPolicy(
  sourceType: CulinarySourceType,
  factType?: CulinaryFactType
): RefreshPolicy {
  const base = SOURCE_POLICIES[sourceType]

  if (!factType || !HIGH_RISK_FACTS.has(factType) || sourceType === 'recall_feed') {
    return { ...base }
  }

  return {
    ...base,
    refreshIntervalMs:
      base.refreshIntervalMs === null
        ? null
        : Math.max(HOUR_MS, Math.floor(base.refreshIntervalMs / 2)),
    agingAfterMs: Math.max(HOUR_MS, Math.floor(base.agingAfterMs / 2)),
    staleAfterMs: Math.max(2 * HOUR_MS, Math.floor(base.staleAfterMs / 2)),
    expiresAfterMs: Math.max(6 * HOUR_MS, Math.floor(base.expiresAfterMs / 2)),
  }
}

export function getFreshnessState(
  record: RefreshRecord,
  now: Date | string | number
): FreshnessState {
  const policyForRecord = getRefreshPolicy(record.sourceType, record.factType)
  const ageMs = Math.max(0, toMs(now) - toMs(record.lastRefreshedAt ?? record.capturedAt))

  if (record.expiresAt && toMs(record.expiresAt) <= toMs(now)) {
    return 'expired'
  }

  if (ageMs >= policyForRecord.expiresAfterMs) {
    return 'expired'
  }

  if (ageMs >= policyForRecord.staleAfterMs) {
    return 'stale'
  }

  if (ageMs >= policyForRecord.agingAfterMs) {
    return 'aging'
  }

  return 'fresh'
}

export function getStaleTimeMs(record: RefreshRecord, now: Date | string | number): number {
  const policyForRecord = getRefreshPolicy(record.sourceType, record.factType)
  const ageMs = Math.max(0, toMs(now) - toMs(record.lastRefreshedAt ?? record.capturedAt))

  return Math.max(0, ageMs - policyForRecord.staleAfterMs)
}

export function getStaleDecay(record: RefreshRecord, now: Date | string | number): number {
  const policyForRecord = getRefreshPolicy(record.sourceType, record.factType)
  const staleTimeMs = getStaleTimeMs(record, now)
  const decayWindowMs = Math.max(1, policyForRecord.expiresAfterMs - policyForRecord.staleAfterMs)

  return clamp(1 - staleTimeMs / decayWindowMs, 0, 1)
}

export function getNextRefreshTime(record: RefreshRecord): Date | null {
  const policyForRecord = getRefreshPolicy(record.sourceType, record.factType)
  const baseMs = toMs(record.lastRefreshedAt ?? record.capturedAt)
  const scheduledMs =
    policyForRecord.refreshIntervalMs === null ? null : baseMs + policyForRecord.refreshIntervalMs
  const expiryRefreshMs =
    record.expiresAt && policyForRecord.expiryLeadTimeMs
      ? Math.max(baseMs, toMs(record.expiresAt) - policyForRecord.expiryLeadTimeMs)
      : null

  if (scheduledMs === null && expiryRefreshMs === null) {
    return null
  }

  if (scheduledMs === null) {
    return new Date(expiryRefreshMs as number)
  }

  if (expiryRefreshMs === null) {
    return new Date(scheduledMs)
  }

  return new Date(Math.min(scheduledMs, expiryRefreshMs))
}

export function getRetryDelayMs(
  sourceType: CulinarySourceType,
  failedAttemptCount: number,
  factType?: CulinaryFactType
): number {
  const policyForRecord = getRefreshPolicy(sourceType, factType)
  const attempts = Math.max(0, Math.floor(failedAttemptCount))
  const delayMs = policyForRecord.retryBaseDelayMs * 2 ** attempts

  return Math.min(delayMs, policyForRecord.retryMaxDelayMs)
}

export function shouldWatchdogFlag(
  record: RefreshRecord,
  now: Date | string | number,
  subject: WatchdogSubject = 'capture'
): boolean {
  const policyForRecord = getRefreshPolicy(record.sourceType, record.factType)
  const status = record.status

  if (subject === 'capture' && status !== 'capturing' && status !== 'parsing') {
    return false
  }

  if (subject === 'review' && status !== 'needs_review' && status !== 'reviewing') {
    return false
  }

  const changedAtMs = toMs(record.statusChangedAt ?? record.capturedAt)
  const limitMs =
    subject === 'capture' ? policyForRecord.captureWatchdogMs : policyForRecord.reviewWatchdogMs

  return toMs(now) - changedAtMs >= limitMs
}

function policy(
  sourceType: CulinarySourceType,
  refreshIntervalMs: number | null,
  agingAfterMs: number,
  staleAfterMs: number,
  expiresAfterMs: number,
  retryBaseDelayMs: number,
  retryMaxDelayMs: number
): RefreshPolicy {
  return {
    sourceType,
    refreshIntervalMs,
    agingAfterMs,
    staleAfterMs,
    expiresAfterMs,
    retryBaseDelayMs,
    retryMaxDelayMs,
    captureWatchdogMs: 2 * HOUR_MS,
    reviewWatchdogMs: 48 * HOUR_MS,
  }
}

function toMs(value: Date | string | number): number {
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime()

  if (!Number.isFinite(ms)) {
    throw new Error('Invalid date value')
  }

  return ms
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
