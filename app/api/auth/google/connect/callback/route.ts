// Google OAuth Callback for workspace services (Gmail, Calendar)
// Exchanges the auth code for tokens and stores them in google_connections.
// This is SEPARATE from the Google OAuth callback at /auth/callback.

import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/db/server'
import { getCurrentUser } from '@/lib/auth/get-user'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const errorParam = searchParams.get('error')
  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

  // Google may redirect with an error (user denied consent, etc.)
  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/settings?error=${encodeURIComponent('Google authorization was denied')}`
    )
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(
      `${origin}/settings?error=${encodeURIComponent('Missing authorization code')}`
    )
  }

  // Decode and validate state
  let state: { chefId: string; csrf: string }
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64').toString())
  } catch {
    return NextResponse.redirect(
      `${origin}/settings?error=${encodeURIComponent('Invalid state parameter')}`
    )
  }

  // CSRF validation
  const cookieStore = cookies()
  const storedCsrf = cookieStore.get('google-oauth-csrf')?.value
  if (!storedCsrf || storedCsrf !== state.csrf) {
    return NextResponse.redirect(
      `${origin}/settings?error=${encodeURIComponent('CSRF validation failed')}`
    )
  }

  // Verify the authenticated user owns this chef ID (prevents tenant hijacking)
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'chef' || currentUser.entityId !== state.chefId) {
    return NextResponse.redirect(
      `${origin}/settings?error=${encodeURIComponent('Unauthorized: Chef account mismatch')}`
    )
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google/connect/callback`

  // Exchange code for tokens
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text()
    console.error('[Google OAuth] Token exchange failed:', errText)

    // Parse specific Google error for a better user-facing message
    let userMessage = 'Failed to exchange authorization code'
    try {
      const errJson = JSON.parse(errText)
      if (errJson.error === 'redirect_uri_mismatch') {
        userMessage =
          'Redirect URI mismatch. The callback URL must be registered in Google Cloud Console. ' +
          'Go to Settings to see the exact URI to add.'
      } else if (errJson.error === 'invalid_grant') {
        userMessage = 'Authorization code expired or already used. Please try connecting again.'
      } else if (errJson.error === 'invalid_client') {
        userMessage = 'Google Client ID or Secret is invalid. Check your environment variables.'
      } else if (errJson.error_description) {
        userMessage = errJson.error_description
      }
    } catch {
      // Not JSON - use the raw text if short enough
      if (errText.length < 200) userMessage = errText
    }

    return NextResponse.redirect(`${origin}/settings?error=${encodeURIComponent(userMessage)}`)
  }

  const tokens = await tokenResponse.json()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Fetch the connected user's email
  const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })

  let connectedEmail = 'unknown'
  if (userInfoResponse.ok) {
    const userInfo = await userInfoResponse.json()
    connectedEmail = userInfo.email || 'unknown'
  }

  // Determine which services were connected based on granted scopes
  const grantedScopes = (tokens.scope || '').split(' ')
  const gmailConnected = grantedScopes.some(
    (s: string) =>
      s.includes('gmail.readonly') || s.includes('gmail.send') || s.includes('gmail.modify')
  )
  const calendarConnected = grantedScopes.some((s: string) => s.includes('calendar'))

  // Merge with existing connection so we don't overwrite the other service's flag.
  // E.g. if Gmail is already connected and we're adding Calendar, keep gmail_connected = true.
  const db = createServerClient({ admin: true })

  const { data: existing } = await db
    .from('google_connections')
    .select('gmail_connected, calendar_connected, scopes, refresh_token')
    .eq('chef_id', state.chefId)
    .single()

  const mergedGmail = gmailConnected
  const mergedCalendar = calendarConnected || (existing?.calendar_connected ?? false)
  const mergedScopes = Array.from(new Set([...(existing?.scopes ?? []), ...grantedScopes]))
  // Google only returns refresh_token on first consent; preserve the existing one
  const refreshToken = tokens.refresh_token || existing?.refresh_token || null

  const { error: upsertError } = await db.from('google_connections').upsert(
    {
      chef_id: state.chefId,
      tenant_id: currentUser.tenantId || state.chefId,
      access_token: tokens.access_token,
      refresh_token: refreshToken,
      token_expires_at: expiresAt,
      connected_email: connectedEmail,
      gmail_connected: mergedGmail,
      calendar_connected: mergedCalendar,
      scopes: mergedScopes,
      gmail_sync_errors: 0,
    },
    { onConflict: 'chef_id' }
  )

  if (upsertError) {
    console.error('[Google OAuth] Failed to save connection:', upsertError)
    return NextResponse.redirect(
      `${origin}/settings?error=${encodeURIComponent('Failed to save Google connection')}`
    )
  }

  const service = gmailConnected ? 'gmail' : calendarConnected ? 'calendar' : 'google'
  const response = NextResponse.redirect(`${origin}/settings?connected=${service}`)
  // Clear the CSRF cookie now that OAuth is complete
  response.cookies.delete('google-oauth-csrf')
  return response
}
