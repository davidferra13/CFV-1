import { createHash } from 'crypto'

export const ACCOUNT_ACCESS_AUDIT_TABLE = 'account_access_events'
export const ACCOUNT_ACCESS_CONTROL_AUDIT_TABLE = 'account_access_controls'
export const ACCOUNT_ACCESS_SIGN_IN_KIND = 'sign_in'

export type AccessRiskSignal = 'new_device' | 'new_location' | 'impossible_travel' | 'session_burst'

export type AccessRiskLevel = 'normal' | 'review' | 'critical'

export type AccessDeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown'

export type AccessLocationSnapshot = {
  countryCode: string | null
  country: string | null
  region: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  source: 'headers' | 'unknown'
}

export type AccessDeviceSnapshot = {
  browser: string
  os: string
  deviceType: AccessDeviceType
  userAgent: string | null
  label: string
  fingerprint: string
}

export type AccountAccessEvent = {
  id: string
  occurredAt: string
  kind: typeof ACCOUNT_ACCESS_SIGN_IN_KIND
  authProvider: string | null
  ipAddress: string | null
  ipMasked: string
  location: AccessLocationSnapshot
  locationLabel: string
  locationKey: string | null
  device: AccessDeviceSnapshot
  riskSignals: AccessRiskSignal[]
  riskScore: number
  riskLevel: AccessRiskLevel
  signalSummary: string
  review?: AccountAccessReview
  current?: boolean
}

export type SessionControlState = {
  sessionVersion: number
  invalidBefore: string | null
}

export type AccountAccessReviewStatus = 'pending' | 'confirmed_safe' | 'secured'

export type AccountAccessReview = {
  status: AccountAccessReviewStatus
  resolvedAt: string | null
}

export type AccountAccessControlType =
  | 'sign_out_all_sessions'
  | 'access_event_confirmed_safe'
  | 'access_event_secured'
  | 'password_changed'
  | 'email_change_requested'
  | 'email_changed'

export type AccountAccessControlEvent = {
  id: string
  occurredAt: string
  type: AccountAccessControlType
  accessEventId: string | null
  reason: string
}

export function parseUserAgent(userAgent: string | null | undefined): AccessDeviceSnapshot {
  const ua = String(userAgent || '').trim()
  const lower = ua.toLowerCase()

  let browser = 'Unknown browser'
  if (lower.includes('edg/')) browser = 'Edge'
  else if (lower.includes('opr/') || lower.includes('opera/')) browser = 'Opera'
  else if (lower.includes('crios/')) browser = 'Chrome'
  else if (lower.includes('fxios/')) browser = 'Firefox'
  else if (lower.includes('chrome/')) browser = 'Chrome'
  else if (lower.includes('firefox/')) browser = 'Firefox'
  else if (lower.includes('safari/')) browser = 'Safari'

  let os = 'Unknown OS'
  if (lower.includes('windows')) os = 'Windows'
  else if (lower.includes('iphone') || lower.includes('ipad') || lower.includes('ipod')) os = 'iOS'
  else if (lower.includes('android')) os = 'Android'
  else if (lower.includes('mac os x') || lower.includes('macintosh')) os = 'macOS'
  else if (lower.includes('linux')) os = 'Linux'

  let deviceType: AccessDeviceType = 'unknown'
  if (/(bot|spider|crawler|headless)/i.test(ua)) deviceType = 'bot'
  else if (/(ipad|tablet)/i.test(ua)) deviceType = 'tablet'
  else if (/(mobi|iphone|android)/i.test(ua)) deviceType = 'mobile'
  else if (ua.length > 0) deviceType = 'desktop'

  const fingerprint = createHash('sha256')
    .update([browser, os, deviceType].join('|'))
    .digest('hex')
    .slice(0, 16)

  const label =
    browser === 'Unknown browser' && os === 'Unknown OS'
      ? 'Unrecognized device'
      : `${browser} on ${os}`

  return {
    browser,
    os,
    deviceType,
    userAgent: ua || null,
    label,
    fingerprint,
  }
}

export function resolveLocationFromHeaders(headers: Headers): AccessLocationSnapshot {
  const countryCode =
    headers.get('cf-ipcountry')?.trim() || headers.get('x-vercel-ip-country')?.trim() || null
  const country =
    headers.get('x-vercel-ip-country-name')?.trim() ||
    headers.get('cf-country-name')?.trim() ||
    countryCode
  const region =
    headers.get('x-vercel-ip-country-region')?.trim() ||
    headers.get('cf-region-code')?.trim() ||
    headers.get('cf-region')?.trim() ||
    null
  const city = headers.get('x-vercel-ip-city')?.trim() || headers.get('cf-ipcity')?.trim() || null

  return {
    countryCode,
    country,
    region,
    city,
    latitude: null,
    longitude: null,
    source: countryCode || country || region || city ? 'headers' : 'unknown',
  }
}

export function buildLocationKey(location: AccessLocationSnapshot): string | null {
  const parts = [location.countryCode || location.country, location.region, location.city]
    .map((value) => value?.trim().toLowerCase() || null)
    .filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join('|') : null
}

export function buildLocationLabel(location: AccessLocationSnapshot): string {
  const parts = [location.city, location.region, location.countryCode || location.country].filter(
    (value): value is string => Boolean(value && value.trim().length > 0)
  )

  if (parts.length === 0) return 'Location unavailable'
  return parts.join(', ')
}

export function maskIpAddress(ipAddress: string | null | undefined): string {
  const ip = String(ipAddress || '').trim()
  if (!ip) return 'Unknown IP'

  if (ip.includes('.')) {
    const octets = ip.split('.')
    if (octets.length === 4) {
      return `${octets[0]}.${octets[1]}.${octets[2]}.xxx`
    }
  }

  if (ip.includes(':')) {
    const parts = ip.split(':')
    return `${parts.slice(0, 4).join(':')}:xxxx`
  }

  return ip
}

export function summarizeRiskSignals(signals: AccessRiskSignal[]): string {
  if (signals.length === 0) return 'Matched your usual access pattern.'

  const labels = signals.map((signal) => ACCESS_SIGNAL_LABELS[signal].toLowerCase())
  if (labels.length === 1) return `Flagged for ${labels[0]}.`
  if (labels.length === 2) return `Flagged for ${labels[0]} and ${labels[1]}.`
  return `Flagged for ${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}.`
}

export const ACCESS_SIGNAL_LABELS: Record<AccessRiskSignal, string> = {
  new_device: 'new device',
  new_location: 'new location',
  impossible_travel: 'impossible travel',
  session_burst: 'abnormal session burst',
}

export function computeAccessRisk(
  candidate: Pick<
    AccountAccessEvent,
    'occurredAt' | 'device' | 'location' | 'locationKey' | 'ipAddress'
  >,
  history: AccountAccessEvent[]
): {
  riskSignals: AccessRiskSignal[]
  riskScore: number
  riskLevel: AccessRiskLevel
  signalSummary: string
} {
  const priorEvents = [...history]
    .filter((event) => event.kind === ACCOUNT_ACCESS_SIGN_IN_KIND)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())

  if (priorEvents.length === 0) {
    return {
      riskSignals: [],
      riskScore: 0,
      riskLevel: 'normal',
      signalSummary: summarizeRiskSignals([]),
    }
  }

  const candidateTime = new Date(candidate.occurredAt).getTime()
  const signals: AccessRiskSignal[] = []
  let score = 0

  const seenDevice = priorEvents.some(
    (event) => event.device.fingerprint === candidate.device.fingerprint
  )
  if (!seenDevice) {
    signals.push('new_device')
    score += 45
  }

  const historyWithLocation = priorEvents.filter((event) => event.locationKey)
  const seenLocation =
    candidate.locationKey &&
    historyWithLocation.some((event) => event.locationKey === candidate.locationKey)
  if (candidate.locationKey && historyWithLocation.length > 0 && !seenLocation) {
    signals.push('new_location')
    score += 25
  }

  const previousEvent = priorEvents[0]
  if (previousEvent && isImpossibleTravel(previousEvent, candidate, candidateTime)) {
    signals.push('impossible_travel')
    score += 55
  }

  const burstWindow = priorEvents.filter((event) => {
    const diffMs = Math.abs(candidateTime - new Date(event.occurredAt).getTime())
    return diffMs <= 60 * 60 * 1000
  })

  const distinctBursts = new Set(
    burstWindow.map(
      (event) => `${event.device.fingerprint}:${event.locationKey || event.ipAddress || 'unknown'}`
    )
  )
  distinctBursts.add(
    `${candidate.device.fingerprint}:${candidate.locationKey || candidate.ipAddress || 'unknown'}`
  )

  if (burstWindow.length >= 2 && distinctBursts.size >= 3) {
    signals.push('session_burst')
    score += 20
  }

  const riskLevel: AccessRiskLevel = score >= 80 ? 'critical' : score >= 40 ? 'review' : 'normal'

  return {
    riskSignals: signals,
    riskScore: score,
    riskLevel,
    signalSummary: summarizeRiskSignals(signals),
  }
}

function isImpossibleTravel(
  previousEvent: Pick<AccountAccessEvent, 'occurredAt' | 'location' | 'locationKey'>,
  candidate: Pick<AccountAccessEvent, 'location' | 'locationKey'>,
  candidateTimeMs: number
): boolean {
  const previousTimeMs = new Date(previousEvent.occurredAt).getTime()
  const diffHours = Math.abs(candidateTimeMs - previousTimeMs) / (60 * 60 * 1000)
  if (diffHours > 6) return false

  const previousCoords =
    previousEvent.location.latitude != null && previousEvent.location.longitude != null
      ? [previousEvent.location.latitude, previousEvent.location.longitude]
      : null
  const candidateCoords =
    candidate.location.latitude != null && candidate.location.longitude != null
      ? [candidate.location.latitude, candidate.location.longitude]
      : null

  if (previousCoords && candidateCoords) {
    const distanceKm = haversineKm(
      previousCoords[0],
      previousCoords[1],
      candidateCoords[0],
      candidateCoords[1]
    )
    return distanceKm > 500 && diffHours < distanceKm / 800
  }

  if (
    previousEvent.location.countryCode &&
    candidate.location.countryCode &&
    previousEvent.location.countryCode !== candidate.location.countryCode
  ) {
    return diffHours <= 6
  }

  if (
    previousEvent.location.city &&
    candidate.location.city &&
    previousEvent.location.city !== candidate.location.city &&
    previousEvent.location.region &&
    candidate.location.region &&
    previousEvent.location.region !== candidate.location.region
  ) {
    return diffHours <= 2
  }

  return false
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const originLat = toRad(lat1)
  const targetLat = toRad(lat2)

  const a =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(originLat) * Math.cos(targetLat)

  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export function buildAccessAlertCopy(event: AccountAccessEvent): {
  title: string
  body: string
} {
  const location = event.locationLabel
  const signalText = event.riskSignals.map((signal) => ACCESS_SIGNAL_LABELS[signal]).join(', ')

  if (event.riskSignals.includes('impossible_travel')) {
    return {
      title: 'Suspicious sign-in pattern detected',
      body: `${event.device.label} signed in from ${location}. Signals: ${signalText}. If this was not you, sign out all sessions immediately.`,
    }
  }

  if (event.riskSignals.includes('new_device')) {
    return {
      title: 'New device sign-in detected',
      body: `${event.device.label} signed in from ${location}. Signals: ${signalText}. Review it from Account & Security if this looks unfamiliar.`,
    }
  }

  return {
    title: 'Account access needs review',
    body: `${event.device.label} signed in from ${location}. Signals: ${signalText}. Review recent access and secure the account if needed.`,
  }
}

export function applyAccessReviewState(
  events: AccountAccessEvent[],
  controlEvents: AccountAccessControlEvent[]
): AccountAccessEvent[] {
  const latestReviewControlByEventId = new Map<string, AccountAccessControlEvent>()
  const orderedControls = [...controlEvents].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )

  for (const controlEvent of orderedControls) {
    if (!controlEvent.accessEventId) continue
    if (latestReviewControlByEventId.has(controlEvent.accessEventId)) continue
    if (
      controlEvent.type !== 'access_event_confirmed_safe' &&
      controlEvent.type !== 'access_event_secured'
    ) {
      continue
    }

    latestReviewControlByEventId.set(controlEvent.accessEventId, controlEvent)
  }

  return events.map((event) => {
    if (event.riskLevel === 'normal') {
      return event
    }

    const reviewControl = latestReviewControlByEventId.get(event.id)
    if (!reviewControl) {
      return {
        ...event,
        review: {
          status: 'pending',
          resolvedAt: null,
        },
      }
    }

    return {
      ...event,
      review: {
        status: reviewControl.type === 'access_event_secured' ? 'secured' : 'confirmed_safe',
        resolvedAt: reviewControl.occurredAt,
      },
    }
  })
}

export function countPendingAccessReviews(events: AccountAccessEvent[]): number {
  return events.filter((event) => event.review?.status === 'pending').length
}

export function getPendingAccessRiskLevel(events: AccountAccessEvent[]): AccessRiskLevel {
  if (
    events.some((event) => event.review?.status === 'pending' && event.riskLevel === 'critical')
  ) {
    return 'critical'
  }

  if (events.some((event) => event.review?.status === 'pending' && event.riskLevel === 'review')) {
    return 'review'
  }

  return 'normal'
}

export function extractSessionControlState(rawMetaData: unknown): SessionControlState {
  const raw =
    rawMetaData && typeof rawMetaData === 'object' && !Array.isArray(rawMetaData)
      ? (rawMetaData as Record<string, unknown>)
      : {}

  const versionValue = Number(raw.chefflow_session_version)
  const invalidBefore =
    typeof raw.chefflow_session_invalid_before === 'string'
      ? raw.chefflow_session_invalid_before
      : null

  return {
    sessionVersion: Number.isFinite(versionValue) ? versionValue : 0,
    invalidBefore,
  }
}

export function shouldInvalidateJwtSession(
  token: {
    sessionVersion?: unknown
    sessionAuthenticatedAt?: unknown
    iat?: unknown
  },
  controlState: SessionControlState & {
    bannedUntil?: string | Date | null
    deletedAt?: string | Date | null
  },
  now = new Date()
): boolean {
  if (controlState.deletedAt) return true

  if (controlState.bannedUntil) {
    const bannedUntil = new Date(controlState.bannedUntil)
    if (!Number.isNaN(bannedUntil.getTime()) && bannedUntil.getTime() > now.getTime()) {
      return true
    }
  }

  const tokenVersion = Number(token.sessionVersion)
  if (Number.isFinite(tokenVersion) && tokenVersion < controlState.sessionVersion) {
    return true
  }

  const issuedAtMs = resolveTokenIssuedAtMs(token)
  if (controlState.invalidBefore) {
    const invalidBeforeMs = new Date(controlState.invalidBefore).getTime()
    if (!Number.isNaN(invalidBeforeMs) && (!issuedAtMs || issuedAtMs < invalidBeforeMs)) {
      return true
    }
  }

  return false
}

function resolveTokenIssuedAtMs(token: {
  sessionAuthenticatedAt?: unknown
  iat?: unknown
}): number | null {
  const authenticatedAt = Number(token.sessionAuthenticatedAt)
  if (Number.isFinite(authenticatedAt) && authenticatedAt > 0) {
    return authenticatedAt
  }

  const issuedAt = Number(token.iat)
  if (Number.isFinite(issuedAt) && issuedAt > 0) {
    return issuedAt * 1000
  }

  return null
}
