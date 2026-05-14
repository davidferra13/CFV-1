export type OperatorSourceIdentity = {
  sourceRecordId: string
  sourceType: string
  name?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  latitude?: number | null
  longitude?: number | null
  phone?: string | null
  websiteUrl?: string | null
  email?: string | null
  socialUrls?: string[]
  menuUrl?: string | null
  claimedAccountId?: string | null
}

export type OperatorResolutionSignal =
  | 'claimed_account_exact'
  | 'email_exact'
  | 'phone_exact'
  | 'website_host_exact'
  | 'menu_host_exact'
  | 'social_url_exact'
  | 'address_exact'
  | 'geo_close'
  | 'name_exact'
  | 'name_similar'
  | 'location_conflict'
  | 'claimed_account_conflict'

export type OperatorResolutionDecision = 'auto_link' | 'review_required' | 'reject' | 'quarantine'

export type OperatorResolutionResult = {
  decision: OperatorResolutionDecision
  confidence: number
  signals: OperatorResolutionSignal[]
  reason: string
}

const SIGNAL_WEIGHTS: Record<OperatorResolutionSignal, number> = {
  claimed_account_exact: 0.62,
  email_exact: 0.42,
  phone_exact: 0.34,
  website_host_exact: 0.32,
  menu_host_exact: 0.2,
  social_url_exact: 0.2,
  address_exact: 0.28,
  geo_close: 0.18,
  name_exact: 0.18,
  name_similar: 0.08,
  location_conflict: -0.45,
  claimed_account_conflict: -1,
}

export function resolveOperatorSourceIdentity(
  left: OperatorSourceIdentity,
  right: OperatorSourceIdentity
): OperatorResolutionResult {
  const signals = collectOperatorResolutionSignals(left, right)
  const confidence = clamp(signals.reduce((score, signal) => score + SIGNAL_WEIGHTS[signal], 0))

  if (signals.includes('claimed_account_conflict')) {
    return decision('reject', 0, signals, 'Claimed account conflict blocks automatic linking.')
  }

  if (signals.includes('location_conflict') && confidence < 0.8) {
    return decision(
      'quarantine',
      confidence,
      signals,
      'Strong source signals conflict with location.'
    )
  }

  if (confidence >= 0.86 && hasStrongCorroboration(signals)) {
    return decision('auto_link', confidence, signals, 'Strong corroborated match.')
  }

  if (confidence >= 0.45) {
    return decision('review_required', confidence, signals, 'Possible match needs human review.')
  }

  return decision('reject', confidence, signals, 'Insufficient evidence to link records.')
}

export function collectOperatorResolutionSignals(
  left: OperatorSourceIdentity,
  right: OperatorSourceIdentity
): OperatorResolutionSignal[] {
  const signals: OperatorResolutionSignal[] = []

  if (left.claimedAccountId && right.claimedAccountId) {
    signals.push(
      left.claimedAccountId === right.claimedAccountId
        ? 'claimed_account_exact'
        : 'claimed_account_conflict'
    )
  }
  if (normalizeEmail(left.email) && normalizeEmail(left.email) === normalizeEmail(right.email)) {
    signals.push('email_exact')
  }
  if (normalizePhone(left.phone) && normalizePhone(left.phone) === normalizePhone(right.phone)) {
    signals.push('phone_exact')
  }
  if (
    normalizeHost(left.websiteUrl) &&
    normalizeHost(left.websiteUrl) === normalizeHost(right.websiteUrl)
  ) {
    signals.push('website_host_exact')
  }
  if (normalizeHost(left.menuUrl) && normalizeHost(left.menuUrl) === normalizeHost(right.menuUrl)) {
    signals.push('menu_host_exact')
  }
  if (sharedSocialUrl(left.socialUrls, right.socialUrls)) {
    signals.push('social_url_exact')
  }
  if (normalizedAddress(left) && normalizedAddress(left) === normalizedAddress(right)) {
    signals.push('address_exact')
  }
  if (isGeoClose(left, right)) {
    signals.push('geo_close')
  } else if (hasLocation(left) && hasLocation(right) && !sameCityState(left, right)) {
    signals.push('location_conflict')
  }

  const leftName = normalizeName(left.name)
  const rightName = normalizeName(right.name)
  if (leftName && leftName === rightName) {
    signals.push('name_exact')
  } else if (leftName && rightName && tokenOverlap(leftName, rightName) >= 0.67) {
    signals.push('name_similar')
  }

  return Array.from(new Set(signals))
}

function hasStrongCorroboration(signals: OperatorResolutionSignal[]): boolean {
  const strong = signals.filter((signal) =>
    ['claimed_account_exact', 'email_exact', 'phone_exact', 'website_host_exact'].includes(signal)
  )
  const place = signals.some((signal) => ['address_exact', 'geo_close'].includes(signal))
  const name = signals.some((signal) => ['name_exact', 'name_similar'].includes(signal))
  return strong.length >= 2 || (strong.length >= 1 && place && name)
}

function decision(
  decision: OperatorResolutionDecision,
  confidence: number,
  signals: OperatorResolutionSignal[],
  reason: string
): OperatorResolutionResult {
  return { decision, confidence, signals, reason }
}

function normalizedAddress(record: OperatorSourceIdentity): string {
  return [record.address, record.city, record.state, record.postalCode]
    .map((part) => normalizeName(part))
    .filter(Boolean)
    .join('|')
}

function normalizeName(value?: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(restaurant|cafe|kitchen|llc|inc)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeEmail(value?: string | null): string {
  return (value ?? '').trim().toLowerCase()
}

function normalizePhone(value?: string | null): string {
  return (value ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
}

function normalizeHost(value?: string | null): string {
  if (!value) return ''
  try {
    const withProtocol = /^[a-z]+:\/\//i.test(value) ? value : `https://${value}`
    return new URL(withProtocol).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return ''
  }
}

function sharedSocialUrl(left?: string[], right?: string[]): boolean {
  const normalized = new Set((left ?? []).map((url) => normalizeUrl(url)).filter(Boolean))
  return (right ?? []).some((url) => normalized.has(normalizeUrl(url)))
}

function normalizeUrl(value?: string | null): string {
  if (!value) return ''
  try {
    const withProtocol = /^[a-z]+:\/\//i.test(value) ? value : `https://${value}`
    const url = new URL(withProtocol)
    return `${url.hostname.replace(/^www\./i, '').toLowerCase()}${url.pathname.replace(/\/$/, '')}`
  } catch {
    return value.trim().toLowerCase()
  }
}

function isGeoClose(left: OperatorSourceIdentity, right: OperatorSourceIdentity): boolean {
  if (
    typeof left.latitude !== 'number' ||
    typeof left.longitude !== 'number' ||
    typeof right.latitude !== 'number' ||
    typeof right.longitude !== 'number'
  ) {
    return false
  }

  return distanceMeters(left.latitude, left.longitude, right.latitude, right.longitude) <= 80
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radiusMeters = 6371000
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2
  return radiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function hasLocation(record: OperatorSourceIdentity): boolean {
  return Boolean(record.city || record.state || record.latitude || record.longitude)
}

function sameCityState(left: OperatorSourceIdentity, right: OperatorSourceIdentity): boolean {
  const leftCity = normalizeName(left.city)
  const rightCity = normalizeName(right.city)
  const leftState = normalizeName(left.state)
  const rightState = normalizeName(right.state)
  return Boolean(leftCity && rightCity && leftCity === rightCity && leftState === rightState)
}

function tokenOverlap(left: string, right: string): number {
  const leftTokens = new Set(left.split(' ').filter(Boolean))
  const rightTokens = new Set(right.split(' ').filter(Boolean))
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0
  const shared = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length
  return shared / Math.max(leftTokens.size, rightTokens.size)
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100))
}
