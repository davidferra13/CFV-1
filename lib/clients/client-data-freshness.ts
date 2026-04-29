export const CLIENT_DATA_FRESHNESS_FIELDS = [
  'allergies',
  'dietary_restrictions',
  'address',
  'phone',
  'email',
  'access_instructions',
  'kitchen_constraints',
] as const

export type ClientDataFreshnessField = (typeof CLIENT_DATA_FRESHNESS_FIELDS)[number]

export type ClientFactSource = 'client' | 'chef' | 'import' | 'system' | 'unknown' | string

export type ClientFactFreshnessStatus = 'missing' | 'stale' | 'current' | 'unconfirmed'

export type ClientFactFreshnessInput = {
  field: ClientDataFreshnessField
  valuePresent?: boolean
  value?: unknown
  updatedAt?: Date | string | number | null
  confirmedAt?: Date | string | number | null
  source?: ClientFactSource
}

export type ClientFactFreshnessOptions = {
  now?: Date | string | number
  staleAfterDaysByField?: Partial<Record<ClientDataFreshnessField, number>>
}

export type ClientFactFreshnessResult = {
  field: ClientDataFreshnessField
  status: ClientFactFreshnessStatus
  isCritical: boolean
  source?: ClientFactSource
  daysSinceUpdate: number | null
  daysSinceConfirmation: number | null
  reviewAgeDays: number | null
  staleAfterDays: number
}

export type ClientDataFreshnessSummary = {
  staleCount: number
  missingCount: number
  unconfirmedCriticalCount: number
  nextReviewField: ClientDataFreshnessField | null
}

export type ClientDataFreshnessReport = {
  fields: ClientFactFreshnessResult[]
  byField: Record<ClientDataFreshnessField, ClientFactFreshnessResult>
  summary: ClientDataFreshnessSummary
}

export type ClientFactFreshnessInputMap = Partial<
  Record<ClientDataFreshnessField, Omit<ClientFactFreshnessInput, 'field'> | null | undefined>
>

const MS_PER_DAY = 24 * 60 * 60 * 1000

const DEFAULT_STALE_AFTER_DAYS: Record<ClientDataFreshnessField, number> = {
  allergies: 30,
  dietary_restrictions: 30,
  address: 180,
  phone: 180,
  email: 180,
  access_instructions: 90,
  kitchen_constraints: 90,
}

const CRITICAL_FIELDS = new Set<ClientDataFreshnessField>([
  'allergies',
  'dietary_restrictions',
  'access_instructions',
  'kitchen_constraints',
])

const STATUS_PRIORITY: Record<ClientFactFreshnessStatus, number> = {
  unconfirmed: 0,
  missing: 1,
  stale: 2,
  current: 3,
}

export function isCriticalClientDataField(field: ClientDataFreshnessField): boolean {
  return CRITICAL_FIELDS.has(field)
}

export function assessClientDataFreshness(
  facts: ClientFactFreshnessInput[] | ClientFactFreshnessInputMap,
  options: ClientFactFreshnessOptions = {}
): ClientDataFreshnessReport {
  const now = parseDate(options.now) ?? new Date()
  const factMap = normalizeFacts(facts)
  const staleAfterDaysByField = {
    ...DEFAULT_STALE_AFTER_DAYS,
    ...options.staleAfterDaysByField,
  }

  const fields = CLIENT_DATA_FRESHNESS_FIELDS.map((field) => {
    const fact = factMap.get(field)
    return assessFieldFreshness(field, fact, now, staleAfterDaysByField[field])
  })

  const byField = Object.fromEntries(fields.map((field) => [field.field, field])) as Record<
    ClientDataFreshnessField,
    ClientFactFreshnessResult
  >

  return {
    fields,
    byField,
    summary: summarizeFreshness(fields),
  }
}

export function summarizeFreshness(
  fields: ClientFactFreshnessResult[]
): ClientDataFreshnessSummary {
  const staleCount = fields.filter((field) => field.status === 'stale').length
  const missingCount = fields.filter((field) => field.status === 'missing').length
  const unconfirmedCriticalCount = fields.filter(
    (field) => field.isCritical && field.status === 'unconfirmed'
  ).length

  return {
    staleCount,
    missingCount,
    unconfirmedCriticalCount,
    nextReviewField: pickNextReviewField(fields),
  }
}

function assessFieldFreshness(
  field: ClientDataFreshnessField,
  fact: ClientFactFreshnessInput | undefined,
  now: Date,
  staleAfterDays: number
): ClientFactFreshnessResult {
  const updatedAt = parseDate(fact?.updatedAt)
  const confirmedAt = parseDate(fact?.confirmedAt)
  const daysSinceUpdate = daysBetween(updatedAt, now)
  const daysSinceConfirmation = daysBetween(confirmedAt, now)
  const valuePresent = hasValue(fact)
  const isCritical = isCriticalClientDataField(field)
  const reviewAgeDays = isCritical ? daysSinceConfirmation : daysSinceUpdate

  let status: ClientFactFreshnessStatus
  if (!valuePresent) {
    status = 'missing'
  } else if (isCritical && !confirmedAt) {
    status = 'unconfirmed'
  } else if (reviewAgeDays === null || reviewAgeDays > staleAfterDays) {
    status = 'stale'
  } else {
    status = 'current'
  }

  return {
    field,
    status,
    isCritical,
    source: fact?.source,
    daysSinceUpdate,
    daysSinceConfirmation,
    reviewAgeDays,
    staleAfterDays,
  }
}

function normalizeFacts(
  facts: ClientFactFreshnessInput[] | ClientFactFreshnessInputMap
): Map<ClientDataFreshnessField, ClientFactFreshnessInput> {
  if (Array.isArray(facts)) {
    return new Map(facts.map((fact) => [fact.field, fact]))
  }

  return new Map(
    CLIENT_DATA_FRESHNESS_FIELDS.flatMap((field) => {
      const fact = facts[field]
      return fact ? [[field, { ...fact, field }]] : []
    })
  )
}

function hasValue(fact: ClientFactFreshnessInput | undefined): boolean {
  if (!fact) {
    return false
  }

  if (typeof fact.valuePresent === 'boolean') {
    return fact.valuePresent
  }

  if (Array.isArray(fact.value)) {
    return fact.value.length > 0
  }

  if (typeof fact.value === 'string') {
    return fact.value.trim().length > 0
  }

  return fact.value !== null && fact.value !== undefined
}

function parseDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysBetween(then: Date | null, now: Date): number | null {
  if (!then) {
    return null
  }

  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / MS_PER_DAY))
}

function pickNextReviewField(fields: ClientFactFreshnessResult[]): ClientDataFreshnessField | null {
  const needsReview = fields.filter((field) => field.status !== 'current')
  if (needsReview.length === 0) {
    return null
  }

  const [nextReview] = needsReview.sort((a, b) => {
    const statusDelta = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
    if (statusDelta !== 0) {
      return statusDelta
    }

    const criticalDelta = Number(b.isCritical) - Number(a.isCritical)
    if (criticalDelta !== 0) {
      return criticalDelta
    }

    return (b.reviewAgeDays ?? -1) - (a.reviewAgeDays ?? -1)
  })

  return nextReview.field
}
