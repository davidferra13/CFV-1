// Gmail Reconnect - Local callback server approach
//
// 1. Starts a tiny HTTP server on port 3333
// 2. Opens Google OAuth with redirect_uri = http://localhost:3333/callback
// 3. Google redirects back with the auth code
// 4. We capture it, exchange for tokens, write to DB
//
// IMPORTANT: You must add http://localhost:3333/callback as an authorized
// redirect URI in Google Cloud Console if it's not already there.
// Or we use the existing redirect URI and just capture the code.
//
// Usage: node scripts/gmail-reconnect.mjs

import http from 'http'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const CHEF_ID = '166a7621-c81d-41a8-a510-c488ef53bb74'
const TENANT_ID = CHEF_ID

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
]

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
// Use the app's existing redirect URI (already registered in Google Cloud Console)
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google/connect/callback`

async function main() {
  console.log('Gmail Reconnect - Direct OAuth Flow')
  console.log('====================================')
  console.log('')
  console.log('Sign in with: dfprivatechef@gmail.com')
  console.log('Grant ALL permissions when prompted')
  console.log('')

  // Build Google OAuth URL
  const state = Buffer.from(JSON.stringify({ chefId: CHEF_ID, csrf: 'script-bypass' })).toString('base64')
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
    include_granted_scopes: 'true',
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`

  // Open browser
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'], // Less likely to trigger bot detection
  })
  const context = await browser.newContext({
    viewport: { width: 800, height: 700 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  let authCode = null

  // Intercept the callback URL before it loads (prevents app from consuming the code)
  await page.route('**/api/auth/google/connect/callback**', async (route) => {
    const url = route.request().url()
    try {
      const parsedUrl = new URL(url)
      authCode = parsedUrl.searchParams.get('code')
      if (authCode) {
        console.log('\nCaptured auth code from callback redirect!')
        // Return a simple success page instead of letting the app handle it
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<html><body><h1>Gmail Connected!</h1><p>You can close this tab. The script is finishing up...</p></body></html>',
        })
        return
      }
    } catch {}
    await route.continue()
  })

  console.log('Opening Google sign-in...')
  await page.goto(authUrl, { timeout: 60000 })

  // Wait for the code to be captured (up to 5 minutes)
  const deadline = Date.now() + 300000
  let dots = 0
  while (!authCode && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000))
    dots++
    if (dots % 5 === 0) {
      process.stdout.write('.')
    }
  }
  console.log('')

  await browser.close()

  if (!authCode) {
    console.error('Failed to capture auth code after 5 minutes.')
    console.error('Make sure you signed in with dfprivatechef@gmail.com and granted all permissions.')
    process.exit(1)
  }

  // Exchange auth code for tokens
  console.log('Exchanging auth code for tokens...')
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: authCode,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResp.ok) {
    const err = await tokenResp.text()
    console.error('Token exchange failed:', err)
    process.exit(1)
  }

  const tokens = await tokenResp.json()
  const grantedScopes = (tokens.scope || '').split(' ')
  console.log('Token exchange successful!')
  console.log('Scopes:', tokens.scope)

  // Verify Gmail scopes
  const hasGmailRead = grantedScopes.some(s => s.includes('gmail.readonly'))
  const hasGmailSend = grantedScopes.some(s => s.includes('gmail.send'))
  console.log(`  gmail.readonly: ${hasGmailRead ? 'YES' : 'MISSING'}`)
  console.log(`  gmail.send:     ${hasGmailSend ? 'YES' : 'MISSING'}`)

  if (!hasGmailRead) {
    console.error('\nFATAL: gmail.readonly scope not granted!')
    console.error('Go to https://myaccount.google.com/permissions, remove ChefFlow, and retry.')
    process.exit(1)
  }

  // Get connected email
  let connectedEmail = 'unknown'
  const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (userInfoResp.ok) {
    connectedEmail = (await userInfoResp.json()).email
  }
  console.log('Connected email:', connectedEmail)

  // Write to database
  console.log('Saving to database...')
  const { error: upsertErr } = await admin.from('google_connections').upsert(
    {
      chef_id: CHEF_ID,
      tenant_id: TENANT_ID,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      connected_email: connectedEmail,
      gmail_connected: true,
      calendar_connected: grantedScopes.some(s => s.includes('calendar')),
      scopes: grantedScopes,
      gmail_sync_errors: 0,
      gmail_history_id: null,
      gmail_last_sync_at: null,
    },
    { onConflict: 'chef_id' }
  )

  if (upsertErr) {
    console.error('Database write failed:', upsertErr.message)
    process.exit(1)
  }

  // Verify API access
  console.log('\nVerifying API access...')

  const labelResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (labelResp.ok) {
    const labels = await labelResp.json()
    const userLabels = (labels.labels || []).filter(l => l.type === 'user').map(l => l.name).sort()
    console.log('  Labels API:   WORKS')
    console.log('  User labels:', userLabels.join(', '))
  } else {
    console.log('  Labels API:   FAILED')
  }

  const msgResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&q=in:inbox', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (msgResp.ok) {
    const msgs = await msgResp.json()
    console.log('  Messages API: WORKS (~' + msgs.resultSizeEstimate + ' in inbox)')
  } else {
    console.log('  Messages API: FAILED')
  }

  console.log('')
  console.log('=== GMAIL RECONNECTED SUCCESSFULLY ===')
  console.log(`  Account:    ${connectedEmail}`)
  console.log(`  Gmail read: ${hasGmailRead}`)
  console.log(`  Gmail send: ${hasGmailSend}`)
  console.log('')
  console.log('Ready to run: npx tsx scripts/email-sync-validator.ts')
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
