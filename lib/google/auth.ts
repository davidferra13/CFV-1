// Google OAuth - Connect, Token Refresh, Disconnect
// Handles the workspace OAuth flow for Gmail/Calendar API access.
// This is SEPARATE from the Google OAuth flow.

'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/db/server'
import { randomBytes } from 'crypto'
import type { GoogleConnectionStatus } from './types'
import {
  getGoogleGmailControl,
  upsertGoogleMailboxFromLegacyConnection,
} from './mailbox-control'
import {
  buildGoogleConnectAuthorizeUrl,
  buildGoogleConnectCallbackUrl,
  GOOGLE_OAUTH_CSRF_COOKIE,
  resolveGoogleConnectOrigin,
} from './connect-server'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

// ─── Configuration Checks ───────────────────────────────────────────────────

export async function isGoogleOAuthConfigured(): Promise<boolean> {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export async function checkGoogleOAuthHealth(): Promise<{
  configured: boolean
  clientIdSet: boolean
  clientSecretSet: boolean
  redirectUri: string
  siteUrl: string
}> {
  const siteUrl = resolveGoogleConnectOrigin({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    requestOrigin: process.env.NODE_ENV !== 'production' ? 'http://localhost:3100' : undefined,
    nodeEnv: process.env.NODE_ENV,
  })
  const redirectUri = buildGoogleConnectCallbackUrl({ callbackOrigin: siteUrl })
  return {
    configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    clientIdSet: !!process.env.GOOGLE_CLIENT_ID,
    clientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
    siteUrl,
  }
}

// ─── Initiate Google Connect ────────────────────────────────────────────────

export async function initiateGoogleConnect(
  scopes: string[],
  options?: { returnTo?: string | null; requestOrigin?: string | null }
): Promise<{ redirectUrl: string }> {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('Google integration not configured')

  // CSRF token stored in cookie, included in state param
  const csrfToken = randomBytes(32).toString('hex')
  const cookieStore = cookies()
  cookieStore.set(GOOGLE_OAUTH_CSRF_COOKIE, csrfToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes
  })

  const callbackOrigin = resolveGoogleConnectOrigin({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    requestOrigin: options?.requestOrigin,
    nodeEnv: process.env.NODE_ENV,
  })

  return {
    redirectUrl: buildGoogleConnectAuthorizeUrl({
      callbackOrigin,
      chefId: user.entityId,
      clientId,
      csrfToken,
      returnTo: options?.returnTo,
      scopes,
    }),
  }
}

// ─── Get Valid Access Token (refresh if needed) ─────────────────────────────

export async function getGoogleAccessToken(
  chefId: string,
  options?: {
    skipSessionCheck?: boolean
    mailboxId?: string | null
    service?: 'gmail' | 'calendar'
  }
): Promise<string> {
  let sessionTenantId: string | null = null
  if (!options?.skipSessionCheck) {
    // Tenant isolation: verify chefId matches session when called from user context
    const { getCurrentUser } = await import('@/lib/auth/get-user')
    const sessionUser = await getCurrentUser()
    if (sessionUser && chefId !== sessionUser.tenantId && chefId !== sessionUser.entityId) {
      throw new Error('Unauthorized: tenant mismatch')
    }
    sessionTenantId = sessionUser?.tenantId || null
  }
  const db = createServerClient({ admin: true })

  let mailbox =
    options?.mailboxId
      ? (
          await db
            .from('google_mailboxes')
            .select(
              'id, chef_id, tenant_id, email, normalized_email, access_token, refresh_token, token_expires_at, scopes, gmail_connected, gmail_history_id, gmail_last_sync_at, gmail_sync_errors, historical_scan_enabled, historical_scan_include_spam_trash, historical_scan_status, historical_scan_page_token, historical_scan_total_processed, historical_scan_total_seen, historical_scan_result_size_estimate, historical_scan_lookback_days, historical_scan_started_at, historical_scan_completed_at, historical_scan_last_run_at, is_primary, is_active'
            )
            .eq('id', options.mailboxId)
            .eq('chef_id', chefId)
            .maybeSingle()
        ).data
      : null
  const control = await getGoogleGmailControl({
    chefId,
    tenantId: sessionTenantId,
    db,
  })
  const legacyConnection = control.legacyConnection

  if (!mailbox && control.mailbox) {
    mailbox = control.mailbox
  }

  if (!mailbox && legacyConnection?.normalizedEmail) {
    const repairedMailbox = await upsertGoogleMailboxFromLegacyConnection({
      chefId,
      tenantId: legacyConnection.tenantId,
      connectedEmail: legacyConnection.connectedEmail || legacyConnection.normalizedEmail,
      accessToken: legacyConnection.accessToken,
      refreshToken: legacyConnection.refreshToken,
      tokenExpiresAt: legacyConnection.tokenExpiresAt,
      scopes: legacyConnection.scopes,
      gmailConnected: legacyConnection.gmailConnected,
      gmailHistoryId: legacyConnection.gmailHistoryId,
      gmailLastSyncAt: legacyConnection.gmailLastSyncAt,
      gmailSyncErrors: legacyConnection.gmailSyncErrors,
      historicalScanEnabled: legacyConnection.historicalScanEnabled,
      historicalScanIncludeSpamTrash: legacyConnection.historicalScanIncludeSpamTrash,
      historicalScanStatus: legacyConnection.historicalScanStatus,
      historicalScanPageToken: legacyConnection.historicalScanPageToken,
      historicalScanTotalProcessed: legacyConnection.historicalScanTotalProcessed,
      historicalScanTotalSeen: legacyConnection.historicalScanTotalSeen,
      historicalScanResultSizeEstimate: legacyConnection.historicalScanResultSizeEstimate,
      historicalScanLookbackDays: legacyConnection.historicalScanLookbackDays,
      historicalScanStartedAt: legacyConnection.historicalScanStartedAt,
      historicalScanCompletedAt: legacyConnection.historicalScanCompletedAt,
      historicalScanLastRunAt: legacyConnection.historicalScanLastRunAt,
      db,
    })
    mailbox = repairedMailbox
  }

  const authRow = mailbox || legacyConnection
  if (!authRow) {
    throw new Error('Google account not connected')
  }

  if (!authRow.refreshToken) {
    throw new Error('No refresh token - please reconnect your Google account')
  }

  // Check if token is still valid (with 5-minute buffer)
  const expiresAt = authRow.tokenExpiresAt ? new Date(authRow.tokenExpiresAt) : new Date(0)
  const bufferMs = 5 * 60 * 1000
  if (authRow.accessToken && expiresAt.getTime() > Date.now() + bufferMs) {
    return authRow.accessToken
  }

  // Refresh the token
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: authRow.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    // Token was revoked for the requested service.
    const nextErrorCount = (authRow.gmailSyncErrors || 0) + 1
    const service = options?.service || 'gmail'
    const connectionUpdates: Record<string, unknown> =
      service === 'calendar'
        ? {
            calendar_connected: false,
          }
        : {
            gmail_connected: false,
            gmail_sync_errors: nextErrorCount,
          }

    await db.from('google_connections').update(connectionUpdates).eq('chef_id', chefId)

    if (service !== 'calendar' && (mailbox as any)?.id) {
      await db
        .from('google_mailboxes')
        .update({
          gmail_connected: false,
          gmail_sync_errors: nextErrorCount,
        })
        .eq('id', (mailbox as any).id)
    }

    throw new Error(
      `${
        service === 'calendar' ? 'Google Calendar' : 'Gmail'
      } connection expired. Please reconnect your Google account in Settings.`
    )
  }

  const tokens = await response.json()
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await db
    .from('google_connections')
    .update({
      access_token: tokens.access_token,
      token_expires_at: newExpiresAt,
    })
    .eq('chef_id', chefId)

  if ((mailbox as any)?.id) {
    await db
      .from('google_mailboxes')
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt,
      })
      .eq('id', (mailbox as any).id)
  }

  return tokens.access_token
}

// ─── Get Connection Status ──────────────────────────────────────────────────

export async function getGoogleConnection(): Promise<GoogleConnectionStatus> {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  const db: any = createServerClient()
  const control = await getGoogleGmailControl({
    chefId: user.entityId!,
    tenantId: user.tenantId!,
    db,
    allowRepair: true,
  })
  const legacy = control.legacyConnection

  const gmailStatus = control.mailbox
    ? {
        connected: control.mailbox.gmailConnected,
        email: control.mailbox.normalizedEmail,
        lastSync: control.mailbox.gmailLastSyncAt,
        errorCount: control.mailbox.gmailSyncErrors,
      }
    : legacy
      ? {
          connected: legacy.gmailConnected,
          email: legacy.connectedEmail,
          lastSync: legacy.gmailLastSyncAt,
          errorCount: legacy.gmailSyncErrors,
        }
      : {
          connected: false,
          email: null,
          lastSync: null,
          errorCount: 0,
        }

  let calendarStatus: GoogleConnectionStatus['calendar'] = {
    connected: legacy?.calendarConnected || false,
    email: legacy?.connectedEmail || null,
    lastSync: null,
    checkedAt: null,
    health: 'unknown',
    healthDetail: null,
    busyRangeCount: 0,
    conflictCount: 0,
    calendarCount: 0,
  }

  if (legacy?.calendarConnected) {
    try {
      const { getCalendarConnectionForChef } = await import('@/lib/scheduling/calendar-sync')
      calendarStatus = await getCalendarConnectionForChef(user.entityId!)
    } catch (err) {
      calendarStatus = {
        ...calendarStatus,
        health: 'error',
        healthDetail: err instanceof Error ? err.message : 'Google Calendar status unavailable',
      }
    }
  }

  return {
    gmail: gmailStatus,
    calendar: calendarStatus,
  }
}

// ─── Disconnect Google Service ──────────────────────────────────────────────

export async function disconnectGoogle(service: 'gmail' | 'calendar') {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  const db: any = createServerClient()
  const control = await getGoogleGmailControl({
    chefId: user.entityId!,
    tenantId: user.tenantId!,
    db,
    allowRepair: true,
  })
  const { data: conn } = await db
    .from('google_connections')
    .select('gmail_connected, calendar_connected, refresh_token')
    .eq('chef_id', user.entityId)
    .maybeSingle()

  if (!conn) throw new Error('No Google connection found')

  const otherServiceConnected =
    service === 'gmail' ? conn.calendar_connected : control.mailbox?.gmailConnected || conn.gmail_connected

  if (!otherServiceConnected && conn.refresh_token) {
    // Both services being disconnected - revoke the token with Google
    try {
      await fetch(`${GOOGLE_REVOKE_URL}?token=${conn.refresh_token}`, {
        method: 'POST',
      })
    } catch {
      // Best effort - continue with local disconnect even if revoke fails
    }
  }

  const updates: Record<string, unknown> = {}
  if (service === 'gmail') {
    updates.gmail_connected = false
    updates.gmail_history_id = null
    updates.gmail_last_sync_at = null
    updates.gmail_sync_errors = 0

    await db
      .from('google_mailboxes')
      .update({
        gmail_connected: false,
        gmail_history_id: null,
        gmail_last_sync_at: null,
        gmail_sync_errors: 0,
      })
      .eq('chef_id', user.entityId)
  } else {
    updates.calendar_connected = false
  }

  // If both disconnected, clear tokens entirely
  if (!otherServiceConnected) {
    updates.access_token = null
    updates.refresh_token = null
    updates.token_expires_at = null
    updates.connected_email = null
    updates.scopes = []

    if (service === 'gmail') {
      await db
        .from('google_mailboxes')
        .update({
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
          scopes: [],
        })
        .eq('chef_id', user.entityId)
    }
  }

  const { error } = await db.from('google_connections').update(updates).eq('chef_id', user.entityId)

  if (error) throw new Error(error.message)
  return { success: true }
}
