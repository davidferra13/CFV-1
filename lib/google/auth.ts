// Google OAuth — Connect, Token Refresh, Disconnect
// Handles the workspace OAuth flow for Gmail/Calendar API access.
// This is SEPARATE from the Supabase Google sign-in flow.

'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { randomBytes } from 'crypto'
import type { GoogleConnectionStatus } from './types'
import {
  disconnectAllGoogleMailboxesForChef,
  disconnectGoogleMailboxForChef,
  getPrimaryGoogleMailboxForChef,
  listGoogleMailboxesForChef,
  setPrimaryGoogleMailboxForChef,
  syncLegacyGoogleConnectionFromPrimary,
  toGoogleMailboxSummary,
} from './mailboxes'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3100'
  const redirectUri = `${siteUrl}/api/auth/google/connect/callback`
  return {
    configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    clientIdSet: !!process.env.GOOGLE_CLIENT_ID,
    clientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
    siteUrl,
  }
}

// ─── Initiate Google Connect ────────────────────────────────────────────────

export async function initiateGoogleConnect(scopes: string[]): Promise<{ redirectUrl: string }> {
  const user = await requireChef()

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('Google integration not configured')

  // CSRF token stored in cookie, included in state param
  const csrfToken = randomBytes(32).toString('hex')
  const cookieStore = cookies()
  cookieStore.set('google-oauth-csrf', csrfToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes
  })

  const state = JSON.stringify({
    chefId: user.entityId,
    csrf: csrfToken,
  })

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google/connect/callback`

  // Always include email+profile so the callback can fetch the connected account's email
  const allScopes = Array.from(
    new Set([
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      ...scopes,
    ])
  )

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: allScopes.join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state: Buffer.from(state).toString('base64'),
  })

  return {
    redirectUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  }
}

// ─── Get Valid Access Token (refresh if needed) ─────────────────────────────

export async function getGoogleAccessToken(chefId: string): Promise<string> {
  const supabase: any = createServerClient({ admin: true })

  const { data: conn, error } = await supabase
    .from('google_connections')
    .select(
      'access_token, refresh_token, token_expires_at, gmail_connected, calendar_connected, connected_email, scopes'
    )
    .eq('chef_id', chefId)
    .single()

  if (error || !conn) {
    throw new Error('Google account not connected')
  }

  if (!conn.refresh_token) {
    throw new Error('No refresh token - please reconnect your Google account')
  }

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : new Date(0)
  const bufferMs = 5 * 60 * 1000
  if (conn.access_token && expiresAt.getTime() > Date.now() + bufferMs) {
    return conn.access_token
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Google integration not configured')
  }

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
    const disconnectUpdate: Record<string, unknown> = {
      calendar_connected: false,
      access_token: null,
      token_expires_at: null,
    }

    if (!conn.gmail_connected) {
      disconnectUpdate.connected_email = null
      disconnectUpdate.refresh_token = null
      disconnectUpdate.scopes = []
    }

    await supabase.from('google_connections').update(disconnectUpdate).eq('chef_id', chefId)
    throw new Error('Google connection expired. Please reconnect your Google account in Settings.')
  }

  const tokens = await response.json()
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase
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
  const user = await requireChef()
  const supabase: any = createServerClient()
  const [mailboxes, primaryMailbox, calendarRow] = await Promise.all([
    listGoogleMailboxesForChef(user.entityId),
    getPrimaryGoogleMailboxForChef(user.entityId),
    supabase
      .from('google_connections')
      .select('connected_email, calendar_connected')
      .eq('chef_id', user.entityId)
      .maybeSingle()
      .then((result: any) => result.data),
  ])

  const mailboxSummaries = mailboxes.map(toGoogleMailboxSummary)
  const connectedMailboxes = mailboxSummaries.filter(
    (mailbox) => mailbox.connected && mailbox.isActive
  )
  const totalErrors = connectedMailboxes.reduce((sum, mailbox) => sum + mailbox.errorCount, 0)

  return {
    gmail: {
      connected: connectedMailboxes.length > 0,
      email: primaryMailbox?.email ?? connectedMailboxes[0]?.email ?? null,
      lastSync: primaryMailbox?.gmailLastSyncAt ?? connectedMailboxes[0]?.lastSync ?? null,
      errorCount: totalErrors,
      connectedCount: connectedMailboxes.length,
      primaryMailboxId: primaryMailbox?.id ?? null,
      mailboxes: mailboxSummaries,
    },
    calendar: {
      connected: calendarRow?.calendar_connected || false,
      email: calendarRow?.connected_email || null,
      lastSync: null,
    },
  }
}

// ─── Disconnect Google Service ──────────────────────────────────────────────

export async function disconnectGoogle(service: 'gmail' | 'calendar') {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (service === 'gmail') {
    await disconnectAllGoogleMailboxesForChef(user.entityId)
    await syncLegacyGoogleConnectionFromPrimary(user.entityId, user.tenantId || user.entityId)
    return { success: true }
  }

  const { data: conn } = await supabase
    .from('google_connections')
    .select('calendar_connected, refresh_token')
    .eq('chef_id', user.entityId)
    .single()

  if (!conn) throw new Error('No Google connection found')

  const mailboxes = await listGoogleMailboxesForChef(user.entityId)
  const otherServiceConnected = mailboxes.some(
    (mailbox) => mailbox.gmailConnected && mailbox.isActive
  )

  if (!otherServiceConnected && conn.refresh_token) {
    // Both services being disconnected — revoke the token with Google
    try {
      await fetch(`${GOOGLE_REVOKE_URL}?token=${conn.refresh_token}`, {
        method: 'POST',
      })
    } catch {
      // Best effort — continue with local disconnect even if revoke fails
    }
  }

  const updates: Record<string, unknown> = {}
  updates.calendar_connected = false

  // If both disconnected, clear tokens entirely
  if (!otherServiceConnected) {
    updates.access_token = null
    updates.refresh_token = null
    updates.token_expires_at = null
    updates.connected_email = null
    updates.scopes = []
  }

  const { error } = await supabase
    .from('google_connections')
    .update(updates)
    .eq('chef_id', user.entityId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function disconnectGoogleMailbox(mailboxId: string) {
  const user = await requireChef()
  await disconnectGoogleMailboxForChef(user.entityId, mailboxId)
  return { success: true }
}

export async function setPrimaryGoogleMailbox(mailboxId: string) {
  const user = await requireChef()
  await setPrimaryGoogleMailboxForChef(user.entityId, mailboxId)
  await syncLegacyGoogleConnectionFromPrimary(user.entityId, user.tenantId || user.entityId)
  return { success: true }
}
