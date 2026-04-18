import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { cacheGet, cacheSet } from '@/lib/cache/upstash'
import { db } from '@/lib/db'
import { authUsers } from '@/lib/db/schema/auth'
import { createServerClient } from '@/lib/db/server'
import { getClientIp } from '@/lib/geo/ip-api'
import {
  ACCOUNT_ACCESS_AUDIT_TABLE,
  ACCOUNT_ACCESS_CONTROL_AUDIT_TABLE,
  ACCOUNT_ACCESS_SIGN_IN_KIND,
  applyAccessReviewState,
  buildAccessAlertCopy,
  buildLocationKey,
  buildLocationLabel,
  computeAccessRisk,
  countPendingAccessReviews,
  extractSessionControlState,
  getPendingAccessRiskLevel,
  maskIpAddress,
  parseUserAgent,
  resolveLocationFromHeaders,
  type AccountAccessControlEvent,
  type AccountAccessControlType,
  type AccountAccessEvent,
  type AccessRiskLevel,
  type SessionControlState,
} from './account-access-core'

type AuditRow = {
  id: string
  record_id?: string | null
  changed_at?: string | null
  after_values?: Record<string, unknown> | null
}

type SessionControlRow = {
  rawAppMetaData: unknown
  bannedUntil: Date | null
  deletedAt: Date | null
}

type CachedSessionControlState = SessionControlState & {
  bannedUntil: string | null
  deletedAt: string | null
}

const SESSION_CONTROL_CACHE_TTL_SECONDS = 15

export type AccountAccessOverview = {
  events: AccountAccessEvent[]
  securityActions: AccountAccessControlEvent[]
  currentFingerprint: string
  currentDeviceLabel: string
  currentLocationLabel: string
  knownDevices: number
  knownLocations: number
  flaggedLast30Days: number
  pendingReviewCount: number
  overallRisk: AccessRiskLevel
  lastSecuredAt: string | null
}

export async function recordSuccessfulAccountAccess(input: {
  authUserId: string
  tenantId: string | null
  authProvider: string | null
  requestHeaders: Headers
}): Promise<void> {
  const history = await listRecentAccountAccessEvents(input.authUserId, 12)
  const accessContext = getRequestAccessContext(input.requestHeaders)
  const occurredAt = new Date().toISOString()
  const id = crypto.randomUUID()

  const risk = computeAccessRisk(
    {
      occurredAt,
      device: accessContext.device,
      location: accessContext.location,
      locationKey: accessContext.locationKey,
      ipAddress: accessContext.ipAddress,
    },
    history
  )

  const event: AccountAccessEvent = {
    id,
    occurredAt,
    kind: ACCOUNT_ACCESS_SIGN_IN_KIND,
    authProvider: input.authProvider,
    ipAddress: accessContext.ipAddress,
    ipMasked: accessContext.ipMasked,
    location: accessContext.location,
    locationLabel: accessContext.locationLabel,
    locationKey: accessContext.locationKey,
    device: accessContext.device,
    riskSignals: risk.riskSignals,
    riskScore: risk.riskScore,
    riskLevel: risk.riskLevel,
    signalSummary: risk.signalSummary,
  }

  const dbClient: any = createServerClient({ admin: true })
  const { error } = await dbClient.from('audit_log').insert({
    tenant_id: input.tenantId,
    table_name: ACCOUNT_ACCESS_AUDIT_TABLE,
    record_id: event.id,
    action: 'INSERT',
    changed_by: input.authUserId,
    change_summary: summarizeAccessEvent(event),
    after_values: serializeAccessEvent(event),
  })

  if (error) {
    console.error('[account-access] Failed to write access audit row:', error.message)
  }

  await db
    .update(authUsers)
    .set({
      lastSignInAt: new Date(event.occurredAt),
      updatedAt: new Date(event.occurredAt),
    })
    .where(eq(authUsers.id, input.authUserId))
    .catch((updateError) => {
      console.error('[account-access] Failed to update auth.users.last_sign_in_at:', updateError)
    })

  // Also stamp chefs.last_login_at for dormancy detection
  if (input.tenantId) {
    const dbAdmin: any = createServerClient({ admin: true })
    await dbAdmin
      .from('chefs')
      .update({ last_login_at: event.occurredAt })
      .eq('id', input.tenantId)
      .then(() => {})
      .catch((chefErr: unknown) => {
        console.error('[account-access] Failed to update chefs.last_login_at:', chefErr)
      })
  }

  if (event.riskLevel !== 'normal' && input.tenantId) {
    const alert = buildAccessAlertCopy(event)
    const { createNotification } = await import('@/lib/notifications/actions')
    await createNotification({
      tenantId: input.tenantId,
      recipientId: input.authUserId,
      category: 'system',
      action: 'account_access_alert',
      title: alert.title,
      body: alert.body,
      actionUrl: `/account-security#access-event-${event.id}`,
      metadata: {
        access_event_id: event.id,
        auth_provider: event.authProvider,
        device_label: event.device.label,
        ip_masked: event.ipMasked,
        location_label: event.locationLabel,
        risk_level: event.riskLevel,
        risk_score: event.riskScore,
        signals: event.riskSignals,
      },
    }).catch((notificationError) => {
      console.error('[account-access] Failed to send access alert notification:', notificationError)
    })
  }
}

export async function listRecentAccountAccessEvents(
  authUserId: string,
  limit = 8
): Promise<AccountAccessEvent[]> {
  const dbClient: any = createServerClient({ admin: true })
  const { data, error } = await dbClient
    .from('audit_log')
    .select('id, record_id, changed_at, after_values')
    .eq('changed_by', authUserId)
    .eq('table_name', ACCOUNT_ACCESS_AUDIT_TABLE)
    .order('changed_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[account-access] Failed to load recent access events:', error.message)
    return []
  }

  return ((data ?? []) as AuditRow[])
    .map((row: AuditRow) => parseAccountAccessEvent(row))
    .filter((event): event is AccountAccessEvent => Boolean(event))
}

export async function getAccountAccessEventForReview(
  authUserId: string,
  accessEventId: string
): Promise<AccountAccessEvent | null> {
  const [event, controlEvents] = await Promise.all([
    getAccountAccessEventById(authUserId, accessEventId),
    listRecentAccountSecurityControlEvents(authUserId, 24),
  ])

  if (!event) return null

  return applyAccessReviewState([event], controlEvents)[0] ?? null
}

const FALLBACK_SESSION_CONTROL: CachedSessionControlState = {
  sessionVersion: 0,
  invalidBefore: null,
  bannedUntil: null,
  deletedAt: null,
}

export async function getSessionControlRow(authUserId: string): Promise<CachedSessionControlState> {
  const cacheKey = getSessionControlCacheKey(authUserId)

  try {
    const cached = await cacheGet<CachedSessionControlState>(cacheKey)
    if (cached) return cached
  } catch {
    // Cache failures must never block auth.
  }

  // DB query with a 3-second timeout. In Edge Runtime, postgres.js may hang
  // indefinitely rather than throwing (TCP sockets not available). The timeout
  // prevents the JWT callback from blocking middleware forever.
  try {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
    const query = db
      .select({
        rawAppMetaData: authUsers.rawAppMetaData,
        bannedUntil: authUsers.bannedUntil,
        deletedAt: authUsers.deletedAt,
      })
      .from(authUsers)
      .where(eq(authUsers.id, authUserId))
      .limit(1)

    const result = await Promise.race([query, timeout])

    if (!result) {
      // Timeout - return safe default rather than blocking
      return FALLBACK_SESSION_CONTROL
    }

    const [row] = result
    const state = buildCachedSessionControlState(row)
    await cacheSet(cacheKey, state, SESSION_CONTROL_CACHE_TTL_SECONDS).catch(() => {})
    return state
  } catch (error) {
    console.error('[account-access] Failed to load session control row:', error)
    return FALLBACK_SESSION_CONTROL
  }
}

export async function revokeAllSessionsForUser(authUserId: string): Promise<SessionControlState> {
  const [row] = await db
    .select({
      rawAppMetaData: authUsers.rawAppMetaData,
      bannedUntil: authUsers.bannedUntil,
      deletedAt: authUsers.deletedAt,
    })
    .from(authUsers)
    .where(eq(authUsers.id, authUserId))
    .limit(1)

  const currentState = extractSessionControlState(row?.rawAppMetaData)
  const nextState: SessionControlState = {
    sessionVersion: currentState.sessionVersion + 1,
    invalidBefore: new Date().toISOString(),
  }

  const nextMeta = {
    ...(isObject(row?.rawAppMetaData) ? row.rawAppMetaData : {}),
    chefflow_session_version: nextState.sessionVersion,
    chefflow_session_invalid_before: nextState.invalidBefore,
  }

  await db
    .update(authUsers)
    .set({
      rawAppMetaData: nextMeta,
      updatedAt: new Date(),
    })
    .where(eq(authUsers.id, authUserId))

  await cacheSet(
    getSessionControlCacheKey(authUserId),
    {
      ...nextState,
      bannedUntil: row?.bannedUntil?.toISOString() ?? null,
      deletedAt: row?.deletedAt?.toISOString() ?? null,
    },
    SESSION_CONTROL_CACHE_TTL_SECONDS
  ).catch(() => {})

  return nextState
}

export async function appendAccountSecurityControlEvent(input: {
  authUserId: string
  tenantId: string | null
  type: AccountAccessControlType
  reason: string
  accessEventId?: string | null
}): Promise<void> {
  const dbClient: any = createServerClient({ admin: true })
  const { error } = await dbClient.from('audit_log').insert({
    tenant_id: input.tenantId,
    table_name: ACCOUNT_ACCESS_CONTROL_AUDIT_TABLE,
    record_id: crypto.randomUUID(),
    action: 'INSERT',
    changed_by: input.authUserId,
    change_summary: input.reason,
    after_values: {
      type: input.type,
      reason: input.reason,
      occurred_at: new Date().toISOString(),
      access_event_id: input.accessEventId ?? null,
    },
  })

  if (error) {
    console.error('[account-access] Failed to write security control audit row:', error.message)
  }
}

export async function getAccountAccessOverview(
  authUserId: string,
  requestHeaders: Headers
): Promise<AccountAccessOverview> {
  const [events, controlEvents, sessionControl] = await Promise.all([
    listRecentAccountAccessEvents(authUserId, 16),
    listRecentAccountSecurityControlEvents(authUserId, 24),
    getSessionControlRow(authUserId),
  ])

  const currentContext = getRequestAccessContext(requestHeaders)
  const currentFingerprint = currentContext.device.fingerprint
  const currentLocationKey = currentContext.locationKey
  let currentMarked = false

  const reviewedEvents = applyAccessReviewState(events, controlEvents)
  const hydratedEvents = reviewedEvents.map((event) => {
    if (!currentMarked && event.device.fingerprint === currentFingerprint) {
      currentMarked = true
      return { ...event, current: true }
    }
    return event
  })

  const deviceFingerprints = new Set(hydratedEvents.map((event) => event.device.fingerprint))
  deviceFingerprints.add(currentFingerprint)

  const locationKeys = new Set(
    hydratedEvents
      .map((event) => event.locationKey)
      .filter((value): value is string => Boolean(value))
  )
  if (currentLocationKey) {
    locationKeys.add(currentLocationKey)
  }
  const flaggedLast30Days = hydratedEvents.filter((event) => {
    if (event.riskLevel === 'normal') return false
    return Date.now() - new Date(event.occurredAt).getTime() <= 30 * 24 * 60 * 60 * 1000
  }).length
  const pendingReviewCount = countPendingAccessReviews(hydratedEvents)
  const overallRisk = getPendingAccessRiskLevel(hydratedEvents)

  return {
    events: hydratedEvents.slice(0, 8),
    securityActions: controlEvents.filter(isVisibleSecurityAction).slice(0, 6),
    currentFingerprint,
    currentDeviceLabel: currentContext.device.label,
    currentLocationLabel: currentContext.locationLabel,
    knownDevices: deviceFingerprints.size,
    knownLocations: locationKeys.size,
    flaggedLast30Days,
    pendingReviewCount,
    overallRisk,
    lastSecuredAt: sessionControl.invalidBefore,
  }
}

function getRequestAccessContext(requestHeaders: Headers): {
  ipAddress: string | null
  ipMasked: string
  location: AccountAccessEvent['location']
  locationLabel: string
  locationKey: string | null
  device: AccountAccessEvent['device']
} {
  const ipAddress = getClientIp(requestHeaders)
  const location = resolveLocationFromHeaders(requestHeaders)
  const device = parseUserAgent(requestHeaders.get('user-agent'))

  return {
    ipAddress,
    ipMasked: maskIpAddress(ipAddress),
    location,
    locationLabel: buildLocationLabel(location),
    locationKey: buildLocationKey(location),
    device,
  }
}

function parseAccountAccessEvent(row: AuditRow): AccountAccessEvent | null {
  const after = row.after_values
  if (!after || after.type !== ACCOUNT_ACCESS_SIGN_IN_KIND) return null

  const occurredAt =
    typeof after.occurred_at === 'string'
      ? after.occurred_at
      : row.changed_at || new Date().toISOString()
  const device = isObject(after.device) ? after.device : null
  const location = isObject(after.location) ? after.location : null
  const riskSignals = Array.isArray(after.risk_signals)
    ? after.risk_signals.filter(
        (value): value is AccountAccessEvent['riskSignals'][number] => typeof value === 'string'
      )
    : []

  if (!device || !location) return null

  return {
    id: typeof after.id === 'string' ? after.id : row.record_id || row.id,
    occurredAt,
    kind: ACCOUNT_ACCESS_SIGN_IN_KIND,
    authProvider: typeof after.auth_provider === 'string' ? after.auth_provider : null,
    ipAddress: typeof after.ip_address === 'string' ? after.ip_address : null,
    ipMasked:
      typeof after.ip_masked === 'string'
        ? after.ip_masked
        : maskIpAddress(typeof after.ip_address === 'string' ? after.ip_address : null),
    location: {
      countryCode: asNullableString(location.countryCode),
      country: asNullableString(location.country),
      region: asNullableString(location.region),
      city: asNullableString(location.city),
      latitude: asNullableNumber(location.latitude),
      longitude: asNullableNumber(location.longitude),
      source: location.source === 'headers' ? 'headers' : 'unknown',
    },
    locationLabel:
      typeof after.location_label === 'string'
        ? after.location_label
        : buildLocationLabel({
            countryCode: asNullableString(location.countryCode),
            country: asNullableString(location.country),
            region: asNullableString(location.region),
            city: asNullableString(location.city),
            latitude: asNullableNumber(location.latitude),
            longitude: asNullableNumber(location.longitude),
            source: location.source === 'headers' ? 'headers' : 'unknown',
          }),
    locationKey: typeof after.location_key === 'string' ? after.location_key : null,
    device: {
      browser: asString(device.browser, 'Unknown browser'),
      os: asString(device.os, 'Unknown OS'),
      deviceType: asDeviceType(device.deviceType),
      userAgent: asNullableString(device.userAgent),
      label: asString(device.label, 'Unrecognized device'),
      fingerprint: asString(device.fingerprint, 'unknown'),
    },
    riskSignals,
    riskScore: asNumber(after.risk_score, 0),
    riskLevel: asRiskLevel(after.risk_level),
    signalSummary: asString(after.signal_summary, 'Matched your usual access pattern.'),
  }
}

async function getAccountAccessEventById(
  authUserId: string,
  accessEventId: string
): Promise<AccountAccessEvent | null> {
  const dbClient: any = createServerClient({ admin: true })
  const { data, error } = await dbClient
    .from('audit_log')
    .select('id, record_id, changed_at, after_values')
    .eq('changed_by', authUserId)
    .eq('table_name', ACCOUNT_ACCESS_AUDIT_TABLE)
    .eq('record_id', accessEventId)
    .limit(1)

  if (error) {
    console.error('[account-access] Failed to load account access event:', error.message)
    return null
  }

  const [row] = (data ?? []) as AuditRow[]
  return row ? parseAccountAccessEvent(row) : null
}

async function listRecentAccountSecurityControlEvents(
  authUserId: string,
  limit = 24
): Promise<AccountAccessControlEvent[]> {
  const dbClient: any = createServerClient({ admin: true })
  const { data, error } = await dbClient
    .from('audit_log')
    .select('id, record_id, changed_at, after_values')
    .eq('changed_by', authUserId)
    .eq('table_name', ACCOUNT_ACCESS_CONTROL_AUDIT_TABLE)
    .order('changed_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[account-access] Failed to load security control events:', error.message)
    return []
  }

  return ((data ?? []) as AuditRow[])
    .map((row: AuditRow) => parseAccountAccessControlEvent(row))
    .filter((event): event is AccountAccessControlEvent => Boolean(event))
}

function parseAccountAccessControlEvent(row: AuditRow): AccountAccessControlEvent | null {
  const after = row.after_values
  const type = asControlType(after?.type)
  if (!after || !type) return null

  return {
    id: typeof after.id === 'string' ? after.id : row.record_id || row.id,
    occurredAt:
      typeof after.occurred_at === 'string'
        ? after.occurred_at
        : row.changed_at || new Date().toISOString(),
    type,
    accessEventId: asNullableString(after.access_event_id),
    reason: asString(after.reason, 'Security control applied.'),
  }
}

function serializeAccessEvent(event: AccountAccessEvent) {
  return {
    id: event.id,
    type: event.kind,
    occurred_at: event.occurredAt,
    auth_provider: event.authProvider,
    ip_address: event.ipAddress,
    ip_masked: event.ipMasked,
    location: event.location,
    location_label: event.locationLabel,
    location_key: event.locationKey,
    device: event.device,
    risk_level: event.riskLevel,
    risk_score: event.riskScore,
    risk_signals: event.riskSignals,
    signal_summary: event.signalSummary,
  }
}

function summarizeAccessEvent(event: AccountAccessEvent): string {
  if (event.riskLevel === 'normal') {
    return `Sign-in via ${event.authProvider || 'credentials'} matched baseline`
  }

  return `Sign-in via ${event.authProvider || 'credentials'} flagged for ${event.riskSignals.join(', ')}`
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function asNullableNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function asRiskLevel(value: unknown): AccessRiskLevel {
  return value === 'critical' || value === 'review' ? value : 'normal'
}

function asControlType(value: unknown): AccountAccessControlType | null {
  return value === 'sign_out_all_sessions' ||
    value === 'access_event_confirmed_safe' ||
    value === 'access_event_secured' ||
    value === 'password_changed' ||
    value === 'email_change_requested' ||
    value === 'email_changed'
    ? value
    : null
}

function isVisibleSecurityAction(event: AccountAccessControlEvent): boolean {
  return (
    event.type === 'sign_out_all_sessions' ||
    event.type === 'access_event_secured' ||
    event.type === 'password_changed' ||
    event.type === 'email_change_requested' ||
    event.type === 'email_changed'
  )
}

function asDeviceType(value: unknown): AccountAccessEvent['device']['deviceType'] {
  return value === 'mobile' ||
    value === 'tablet' ||
    value === 'desktop' ||
    value === 'bot' ||
    value === 'unknown'
    ? value
    : 'unknown'
}

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getSessionControlCacheKey(authUserId: string): string {
  return `auth:session-control:${authUserId}`
}

function buildCachedSessionControlState(
  row: SessionControlRow | undefined
): CachedSessionControlState {
  const state = extractSessionControlState(row?.rawAppMetaData)
  return {
    ...state,
    bannedUntil: row?.bannedUntil?.toISOString() ?? null,
    deletedAt: row?.deletedAt?.toISOString() ?? null,
  }
}
