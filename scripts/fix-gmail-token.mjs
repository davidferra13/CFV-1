// Quick fix: reset Gmail error count, force token refresh, test API access
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAdminClient } from './lib/db.mjs'

const CHEF_ID = '166a7621-c81d-41a8-a510-c488ef53bb74'

const admin = createAdminClient()

// 1. Reset error count and clear cached token
const { data: resetData } = await admin
  .from('google_connections')
  .update({ gmail_sync_errors: 0, access_token: null, token_expires_at: null })
  .eq('chef_id', CHEF_ID)
  .select('connected_email, gmail_connected, gmail_sync_errors')
  .single()

console.log('Reset:', JSON.stringify(resetData))

// 2. Get refresh token
const { data: conn } = await admin
  .from('google_connections')
  .select('refresh_token')
  .eq('chef_id', CHEF_ID)
  .single()

if (!conn?.refresh_token) {
  console.log('No refresh token - full reconnect needed in Settings')
  process.exit(1)
}

console.log('Refresh token exists, attempting refresh...')

// 3. Refresh the token
const resp = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: conn.refresh_token,
    grant_type: 'refresh_token',
  }),
})

if (!resp.ok) {
  console.log('Token refresh FAILED:', await resp.text())
  console.log('Go to Settings > Gmail > Disconnect > Reconnect')
  process.exit(1)
}

const tokens = await resp.json()
console.log('Token refresh SUCCEEDED')
console.log('Expires in:', tokens.expires_in, 'seconds')
console.log('Scope:', tokens.scope)

// 4. Save new token
await admin
  .from('google_connections')
  .update({
    access_token: tokens.access_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  })
  .eq('chef_id', CHEF_ID)

console.log('Token saved')

// 5. Test label API
const labelResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
  headers: { Authorization: `Bearer ${tokens.access_token}` },
})

if (labelResp.ok) {
  const labels = await labelResp.json()
  const userLabels = (labels.labels || []).filter(l => l.type === 'user').map(l => l.name).sort()
  console.log('\nLabel API: WORKS')
  console.log('User labels:', userLabels.join(', '))
} else {
  console.log('\nLabel API: FAILED -', (await labelResp.json()).error?.message)
}

// 6. Test message API
const msgResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&q=in:inbox', {
  headers: { Authorization: `Bearer ${tokens.access_token}` },
})

if (msgResp.ok) {
  const msgs = await msgResp.json()
  console.log('Message API: WORKS - estimated', msgs.resultSizeEstimate, 'messages')
} else {
  console.log('Message API: FAILED -', (await msgResp.json()).error?.message)
}
