import { writeFileSync } from 'fs'
import { createClient } from './lib/supabase.mjs'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// Find client users via user_roles table
const { data: roles, error: rolesErr } = await admin
  .from('user_roles')
  .select('auth_user_id, role, entity_id')
  .eq('role', 'client')
  .limit(5)

if (rolesErr) {
  console.error('user_roles error:', rolesErr.message)
  process.exit(1)
}

console.log('Client roles found:', JSON.stringify(roles, null, 2))

if (!roles || roles.length === 0) {
  console.error('No client users found in user_roles')
  process.exit(1)
}

const clientAuthId = roles[0].auth_user_id
console.log('Using auth_user_id:', clientAuthId)

// Reset password so we can sign in
const NEW_PASS = 'TempTest!2026'
const { error: updateErr } = await admin.auth.admin.updateUserById(clientAuthId, {
  password: NEW_PASS
})
if (updateErr) {
  console.error('Password update failed:', updateErr.message)
  process.exit(1)
}

// Get the email
const { data: userInfo } = await admin.auth.admin.getUserById(clientAuthId)
const email = userInfo?.user?.email
console.log('Email:', email)

// Sign in with the new password
const anonClient = createClient(SUPABASE_URL, ANON_KEY)
const { data: session, error: signErr } = await anonClient.auth.signInWithPassword({
  email,
  password: NEW_PASS
})
if (signErr || !session.session) {
  console.error('Sign-in failed:', signErr?.message)
  process.exit(1)
}

console.log('Signed in as:', email)
console.log('Token expires:', new Date(session.session.expires_at * 1000).toISOString())

const token = session.session.access_token
const refresh = session.session.refresh_token
const expiresAt = session.session.expires_at

// Build storageState for Playwright
const cookieVal = Buffer.from(JSON.stringify({
  access_token: token,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: expiresAt,
  refresh_token: refresh,
  user: session.session.user
})).toString('base64')

const storageState = {
  cookies: [
    {
      name: 'sb-127-auth-token',
      value: `base64-${cookieVal}`,
      domain: 'localhost',
      path: '/',
      expires: expiresAt + 86400,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax'
    },
    {
      name: 'chefflow-role-cache',
      value: 'client',
      domain: 'localhost',
      path: '/',
      expires: expiresAt + 86400,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    }
  ],
  origins: []
}

writeFileSync('.auth/client.json', JSON.stringify(storageState, null, 2))
console.log('\n.auth/client.json refreshed successfully')
