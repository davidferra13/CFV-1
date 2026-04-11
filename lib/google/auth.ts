// Google OAuth - Connect, Token Refresh, Disconnect
// Handles the workspace OAuth flow for Gmail/Calendar API access.
// This is SEPARATE from the Google OAuth flow.

'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/db/server'
import { randomBytes } from 'crypto'
import type { GoogleConnectionStatus } from './types'
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
  options?: { skipSessionCheck?: boolean }
): Promise<string> {
  if (!options?.skipSessionCheck) {
    // Tenant isolation: verify chefId matches session when called from user context
    const { getCurrentUser } = await import('@/lib/auth/get-user')
    const sessionUser = await getCurrentUser()
    if (sessionUser && chefId !== sessionUser.tenantId && chefId !== sessionUser.entityId) {
      throw new Error('Unauthorized: tenant mismatch')
    }
  }
  const db = createServerClient({ admin: true })

  const { data: conn, error } = await db
    .from('google_connections')
    .select('access_token, refresh_token, token_expires_at, gmail_connected, gmail_sync_errors')
    .eq('chef_id', chefId)
    .single()

  if (error || !conn) {
    throw new Error('Google account not connected')
  }

  if (!conn.refresh_token) {
    throw new Error('No refresh token - please reconnect your Google account')
  }

  // Check if token is still valid (with 5-minute buffer)
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : new Date(0)
  const bufferMs = 5 * 60 * 1000
  if (conn.access_token && expiresAt.getTime() > Date.now() + bufferMs) {
    return conn.access_token
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
      refresh_token: conn.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    // Token was revoked - mark as disconnected
    await db
      .from('google_connections')
      .update({
        gmail_connected: false,
        gmail_sync_errors: (conn.gmail_sync_errors || 0) + 1,
      })
      .eq('chef_id', chefId)

    throw new Error('Gmail connection expired. Please reconnect your Google account in Settings.')
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

  return tokens.access_token
}

// ─── Get Connection Status ──────────────────────────────────────────────────

export async function getGoogleConnection(): Promise<GoogleConnectionStatus> {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('google_connections')
    .select(
      'connected_email, gmail_connected, gmail_last_sync_at, gmail_sync_errors, calendar_connected'
    )
    .eq('chef_id', user.entityId)
    .single()

  if (!data) {
    const disconnectedStatus = { connected: false, email: null, lastSync: null }
    return {
      gmail: { ...disconnectedStatus, errorCount: 0 },
      calendar: disconnectedStatus,
    }
  }

  return {
    gmail: {
      connected: data.gmail_connected || false,
      email: data.connected_email || null,
      lastSync: data.gmail_last_sync_at || null,
      errorCount: data.gmail_sync_errors || 0,
    },
    calendar: {
      connected: data.calendar_connected || false,
      email: data.connected_email || null,
      lastSync: null,
    },
  }
}

// ─── Disconnect Google Service ──────────────────────────────────────────────

export async function disconnectGoogle(service: 'gmail' | 'calendar') {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: conn } = await db
    .from('google_connections')
    .select('gmail_connected, calendar_connected, refresh_token')
    .eq('chef_id', user.entityId)
    .single()

  if (!conn) throw new Error('No Google connection found')

  const otherServiceConnected = service === 'gmail' ? conn.calendar_connected : conn.gmail_connected

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
  }

  const { error } = await db.from('google_connections').update(updates).eq('chef_id', user.entityId)

  if (error) throw new Error(error.message)
  return { success: true }
}
