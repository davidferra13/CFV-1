// Google OAuth - Connect, Token Refresh, Disconnect
// Handles the workspace OAuth flow for Gmail/Calendar API access.
// This is SEPARATE from the Supabase Google sign-in flow.

'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { randomBytes } from 'crypto'
import type { GoogleConnectionStatus } from './types'

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.cheflowhq.com'
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
  const supabase = createServerClient({ admin: true })

  const { data: conn, error } = await supabase
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
    await supabase
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

  const { data } = await supabase
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
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: conn } = await supabase
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

  const { error } = await supabase
    .from('google_connections')
    .update(updates)
    .eq('chef_id', user.entityId)

  if (error) throw new Error(error.message)
  return { success: true }
}
