// Agent Account Bootstrap
// Creates/updates a persistent VS Code agent account in Supabase.
// Idempotent — safe to run multiple times.
//
// Usage: npx tsx scripts/setup-agent-account.ts
//
// Follows the same patterns as tests/helpers/e2e-seed.ts:
//   ensureAuthUser → upsertChef → ensureChefRole → ensureChefPreferences

import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const AGENT_EMAIL = process.env.AGENT_EMAIL || 'agent@chefflow.test'
const AGENT_PASSWORD = process.env.AGENT_PASSWORD || 'AgentChefFlow!2026'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`[agent-setup] Missing environment variable: ${name}`)
  return value
}

async function main() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`[agent-setup] Setting up agent account: ${AGENT_EMAIL}`)
  console.log(`[agent-setup] Supabase: ${supabaseUrl}`)

  // 1. Ensure auth user (create or update)
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listError) throw new Error(`[agent-setup] Failed to list auth users: ${listError.message}`)

  const existing = listed.users.find((u) => u.email?.toLowerCase() === AGENT_EMAIL.toLowerCase())
  let authUserId: string

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: AGENT_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'chef', agent: true },
    })
    if (error) throw new Error(`[agent-setup] Failed to update auth user: ${error.message}`)
    authUserId = existing.id
    console.log(`[agent-setup] Updated existing auth user: ${authUserId}`)
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: AGENT_EMAIL,
      password: AGENT_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'chef', agent: true },
    })
    if (error || !created.user)
      throw new Error(`[agent-setup] Failed to create auth user: ${error?.message}`)
    authUserId = created.user.id
    console.log(`[agent-setup] Created new auth user: ${authUserId}`)
  }

  // 2. Ensure chef record
  const chefFields = {
    business_name: 'AGENT - VS Code Claude',
    display_name: 'Agent',
    email: AGENT_EMAIL,
    slug: 'agent-vscode',
    tagline: 'VS Code Claude Code agent account. Not a real chef.',
    bio: 'This chef profile is used by the Claude Code agent for automated testing and debugging.',
    show_website_on_public_profile: false,
    preferred_inquiry_destination: 'both' as const,
  }

  const { data: existingChef } = await admin
    .from('chefs')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  let chefId: string

  if (existingChef?.id) {
    await admin.from('chefs').update(chefFields).eq('id', existingChef.id)
    chefId = existingChef.id as string
    console.log(`[agent-setup] Updated existing chef: ${chefId}`)
  } else {
    const { data: inserted, error } = await admin
      .from('chefs')
      .insert({ auth_user_id: authUserId, ...chefFields })
      .select('id')
      .single()
    if (error || !inserted)
      throw new Error(`[agent-setup] Failed to create chef: ${error?.message}`)
    chefId = inserted.id as string
    console.log(`[agent-setup] Created new chef: ${chefId}`)
  }

  // 3. Ensure user_roles
  const { error: roleError } = await admin
    .from('user_roles')
    .upsert(
      { auth_user_id: authUserId, role: 'chef', entity_id: chefId },
      { onConflict: 'auth_user_id' }
    )
  if (roleError) throw new Error(`[agent-setup] Failed to upsert chef role: ${roleError.message}`)
  console.log(`[agent-setup] Role assigned: chef`)

  // 4. Ensure chef_preferences
  const { error: prefError } = await admin
    .from('chef_preferences')
    .upsert(
      { chef_id: chefId, tenant_id: chefId, network_discoverable: false },
      { onConflict: 'chef_id' }
    )
  if (prefError)
    throw new Error(`[agent-setup] Failed to upsert chef preferences: ${prefError.message}`)
  console.log(`[agent-setup] Preferences set (network_discoverable: false)`)

  // 5. Write .auth/agent.json
  const agentState = {
    email: AGENT_EMAIL,
    password: AGENT_PASSWORD,
    authUserId,
    chefId,
    tenantId: chefId,
  }
  mkdirSync('.auth', { recursive: true })
  writeFileSync('.auth/agent.json', JSON.stringify(agentState, null, 2))
  console.log(`[agent-setup] Wrote .auth/agent.json`)

  // Summary
  console.log('')
  console.log('=== Agent Account Ready ===')
  console.log(`  Email:     ${AGENT_EMAIL}`)
  console.log(`  Password:  ${AGENT_PASSWORD}`)
  console.log(`  Auth ID:   ${authUserId}`)
  console.log(`  Chef ID:   ${chefId}`)
  console.log(`  Tenant ID: ${chefId}`)
  console.log(`  State:     .auth/agent.json`)
  console.log('')
  console.log('  Sign in via Playwright:')
  console.log('    POST http://localhost:3100/api/e2e/auth')
  console.log(`    { "email": "${AGENT_EMAIL}", "password": "${AGENT_PASSWORD}" }`)
  console.log('')
  console.log('  Ensure ADMIN_EMAILS includes this email for admin access.')
}

main().catch((err) => {
  console.error('[agent-setup] FAILED:', err.message)
  process.exit(1)
})
