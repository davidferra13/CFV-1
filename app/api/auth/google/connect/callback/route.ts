// Google OAuth Callback for workspace services (Gmail, Calendar)
// Exchanges the auth code for tokens and stores them in google_connections.
// This is SEPARATE from the Supabase Google sign-in callback at /auth/callback.

import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { syncLegacyGoogleConnectionFromPrimary } from '@/lib/google/mailboxes'

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
      // Not JSON — use the raw text if short enough
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
  const normalizedEmail = connectedEmail.toLowerCase().trim()

  // Merge with existing connection so we don't overwrite the other service's flag.
  // E.g. if Gmail is already connected and we're adding Calendar, keep gmail_connected = true.
  const supabase: any = createServerClient({ admin: true })

  const { data: existing } = await supabase
    .from('google_connections')
    .select(
      'connected_email, access_token, refresh_token, token_expires_at, gmail_connected, gmail_sync_errors, calendar_connected, scopes'
    )
    .eq('chef_id', state.chefId)
    .maybeSingle()

  const existingNormalizedEmail =
    typeof existing?.connected_email === 'string'
      ? existing.connected_email.toLowerCase().trim()
      : null

  let activeDuplicateMailbox: { chef_id: string } | null = null
  try {
    const { data: duplicateMailboxes, error: duplicateMailboxError } = await supabase
      .from('google_mailboxes')
      .select('chef_id')
      .eq('normalized_email', normalizedEmail)
      .eq('is_active', true)
      .eq('gmail_connected', true)
      .neq('chef_id', state.chefId)
      .limit(1)

    if (duplicateMailboxError) throw duplicateMailboxError
    activeDuplicateMailbox = duplicateMailboxes?.[0] ?? null
  } catch {
    const { data: duplicateConnections, error: duplicateError } = await supabase
      .from('google_connections')
      .select('chef_id, gmail_connected, calendar_connected')
      .ilike('connected_email', connectedEmail)
      .neq('chef_id', state.chefId)
      .limit(5)

    if (duplicateError) {
      console.error(
        '[Google OAuth] Failed to check for duplicate Google connections:',
        duplicateError
      )
      return NextResponse.redirect(
        `${origin}/settings?error=${encodeURIComponent(
          'Failed to verify Google connection ownership'
        )}`
      )
    }

    activeDuplicateMailbox =
      (duplicateConnections ?? []).find(
        (row: { gmail_connected: boolean; calendar_connected: boolean }) =>
          row.gmail_connected || row.calendar_connected
      ) ?? null
  }

  if (activeDuplicateMailbox) {
    return NextResponse.redirect(
      `${origin}/settings?error=${encodeURIComponent(
        `${connectedEmail} is already connected to another ChefFlow account. Disconnect it there first to avoid split inbox data.`
      )}`
    )
  }

  const mergedCalendar = calendarConnected || (existing?.calendar_connected ?? false)
  const mergedScopes = Array.from(new Set([...(existing?.scopes ?? []), ...grantedScopes]))
  // Google only returns refresh_token on first consent; preserve the existing one
  const refreshToken = tokens.refresh_token || existing?.refresh_token || null
  const tenantId = currentUser.tenantId || state.chefId

  if (gmailConnected) {
    const { data: existingMailbox } = await supabase
      .from('google_mailboxes')
      .select('id, is_primary')
      .eq('chef_id', state.chefId)
      .eq('normalized_email', normalizedEmail)
      .maybeSingle()

    const { data: activeMailboxes } = await supabase
      .from('google_mailboxes')
      .select('id')
      .eq('chef_id', state.chefId)
      .eq('is_active', true)
      .eq('gmail_connected', true)
      .limit(5)

    const shouldBePrimary = Boolean(existingMailbox?.is_primary) || !(activeMailboxes?.length ?? 0)

    const mailboxPayload = {
      chef_id: state.chefId,
      tenant_id: tenantId,
      email: connectedEmail,
      normalized_email: normalizedEmail,
      access_token: tokens.access_token,
      refresh_token: refreshToken,
      token_expires_at: expiresAt,
      scopes: grantedScopes,
      gmail_connected: true,
      gmail_sync_errors: 0,
      is_primary: shouldBePrimary,
      is_active: true,
    }

    if (existingMailbox?.id) {
      const { error: mailboxError } = await supabase
        .from('google_mailboxes')
        .update(mailboxPayload)
        .eq('id', existingMailbox.id)
        .eq('chef_id', state.chefId)

      if (mailboxError) {
        console.error('[Google OAuth] Failed to save Google mailbox:', mailboxError)
        return NextResponse.redirect(
          `${origin}/settings?error=${encodeURIComponent('Failed to save Google mailbox')}`
        )
      }
    } else {
      const { error: mailboxError } = await supabase.from('google_mailboxes').insert(mailboxPayload)

      if (mailboxError) {
        console.error('[Google OAuth] Failed to create Google mailbox:', mailboxError)
        return NextResponse.redirect(
          `${origin}/settings?error=${encodeURIComponent('Failed to save Google mailbox')}`
        )
      }
    }
  }

  const { error: upsertError } = await supabase.from('google_connections').upsert(
    {
      chef_id: state.chefId,
      tenant_id: tenantId,
      access_token: calendarConnected ? tokens.access_token : (existing?.access_token ?? null),
      refresh_token: calendarConnected ? refreshToken : (existing?.refresh_token ?? refreshToken),
      token_expires_at: calendarConnected ? expiresAt : (existing?.token_expires_at ?? null),
      connected_email: calendarConnected
        ? connectedEmail
        : (existing?.connected_email ?? (gmailConnected ? connectedEmail : null)),
      gmail_connected: existing?.gmail_connected ?? false,
      calendar_connected: mergedCalendar,
      scopes: calendarConnected
        ? Array.from(
            new Set([
              ...(existingNormalizedEmail === normalizedEmail ? (existing?.scopes ?? []) : []),
              ...grantedScopes,
            ])
          )
        : mergedScopes,
      gmail_sync_errors: existing?.gmail_sync_errors ?? 0,
    },
    { onConflict: 'chef_id' }
  )

  if (upsertError) {
    console.error('[Google OAuth] Failed to save connection:', upsertError)
    return NextResponse.redirect(
      `${origin}/settings?error=${encodeURIComponent('Failed to save Google connection')}`
    )
  }

  if (gmailConnected) {
    await syncLegacyGoogleConnectionFromPrimary(state.chefId, tenantId)
  }

  const service = gmailConnected ? 'gmail' : calendarConnected ? 'calendar' : 'google'
  const response = NextResponse.redirect(`${origin}/settings?connected=${service}`)
  // Clear the CSRF cookie now that OAuth is complete
  response.cookies.delete('google-oauth-csrf')
  return response
}
