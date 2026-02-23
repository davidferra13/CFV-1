// Demo Account Bootstrap
// Creates/updates persistent demo chef + demo client accounts in Supabase.
// Idempotent — safe to run multiple times.
//
// Usage: npx tsx scripts/setup-demo-accounts.ts
//
// Follows the same patterns as scripts/setup-agent-account.ts:
//   ensureAuthUser → upsertChef → ensureChefRole → ensureChefPreferences
//   ensureAuthUser → upsertClient → ensureClientRole

import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const DEMO_CHEF_EMAIL = 'demo@chefflow.test'
const DEMO_CHEF_PASSWORD = 'DemoChefFlow!2026'
const DEMO_CLIENT_EMAIL = 'demo-client@chefflow.test'
const DEMO_CLIENT_PASSWORD = 'DemoClientFlow!2026'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`[demo-setup] Missing environment variable: ${name}`)
  return value
}

async function ensureAuthUser(
  admin: ReturnType<typeof createClient>,
  input: { email: string; password: string; metadata: Record<string, unknown> }
): Promise<string> {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listError) throw new Error(`[demo-setup] Failed to list auth users: ${listError.message}`)

  const existing = listed.users.find((u) => u.email?.toLowerCase() === input.email.toLowerCase())

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: input.password,
      email_confirm: true,
      user_metadata: input.metadata,
    })
    if (error) throw new Error(`[demo-setup] Failed to update ${input.email}: ${error.message}`)
    console.log(`[demo-setup] Updated existing auth user: ${existing.id} (${input.email})`)
    return existing.id
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: input.metadata,
  })
  if (error || !created.user)
    throw new Error(`[demo-setup] Failed to create ${input.email}: ${error?.message}`)
  console.log(`[demo-setup] Created new auth user: ${created.user.id} (${input.email})`)
  return created.user.id
}

async function main() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`[demo-setup] Setting up demo accounts`)
  console.log(`[demo-setup] Supabase: ${supabaseUrl}`)

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Demo Chef
  // ──────────────────────────────────────────────────────────────────────────

  const chefAuthId = await ensureAuthUser(admin, {
    email: DEMO_CHEF_EMAIL,
    password: DEMO_CHEF_PASSWORD,
    metadata: { role: 'chef', demo: true },
  })

  // Upsert chef record with polished profile fields
  const chefFields = {
    business_name: 'Ember & Sage Kitchen',
    display_name: 'Chef Isabella Torres',
    email: DEMO_CHEF_EMAIL,
    phone: '617-555-0888',
    slug: 'chef-demo-showcase',
    tagline: 'Farm-to-table private dining experiences in the heart of New England',
    bio: 'Chef Isabella Torres brings 12 years of culinary artistry to intimate private dining. Trained at the Culinary Institute of America and seasoned through kitchens in Barcelona and Tokyo, she creates seasonal menus that tell a story through every course. Specializing in Mediterranean-Asian fusion with locally sourced ingredients.',
    show_website_on_public_profile: false,
    preferred_inquiry_destination: 'both' as const,
    portal_primary_color: '#c76f30',
    portal_background_color: '#faf7f4',
    show_availability_signals: true,
    subscription_status: 'active',
    onboarding_completed_at: new Date().toISOString(),
    timezone: 'America/New_York',
  }

  const { data: existingChef } = await admin
    .from('chefs')
    .select('id')
    .eq('auth_user_id', chefAuthId)
    .maybeSingle()
  let chefId: string

  if (existingChef?.id) {
    await admin.from('chefs').update(chefFields).eq('id', existingChef.id)
    chefId = existingChef.id as string
    console.log(`[demo-setup] Updated existing demo chef: ${chefId}`)
  } else {
    const { data: inserted, error } = await admin
      .from('chefs')
      .insert({ auth_user_id: chefAuthId, ...chefFields })
      .select('id')
      .single()
    if (error || !inserted)
      throw new Error(`[demo-setup] Failed to create demo chef: ${error?.message}`)
    chefId = inserted.id as string
    console.log(`[demo-setup] Created new demo chef: ${chefId}`)
  }

  // Ensure chef role
  const { error: roleError } = await admin
    .from('user_roles')
    .upsert(
      { auth_user_id: chefAuthId, role: 'chef', entity_id: chefId },
      { onConflict: 'auth_user_id' }
    )
  if (roleError) throw new Error(`[demo-setup] Failed to upsert chef role: ${roleError.message}`)
  console.log(`[demo-setup] Chef role assigned`)

  // Ensure chef preferences
  const { error: prefError } = await admin.from('chef_preferences').upsert(
    {
      chef_id: chefId,
      tenant_id: chefId,
      home_city: 'Boston',
      home_state: 'MA',
      network_discoverable: true,
    },
    { onConflict: 'chef_id' }
  )
  if (prefError)
    throw new Error(`[demo-setup] Failed to upsert chef preferences: ${prefError.message}`)
  console.log(`[demo-setup] Chef preferences set`)

  // Write .auth/demo-chef.json
  const chefState = {
    email: DEMO_CHEF_EMAIL,
    password: DEMO_CHEF_PASSWORD,
    authUserId: chefAuthId,
    chefId,
    tenantId: chefId,
    slug: 'chef-demo-showcase',
  }
  mkdirSync('.auth', { recursive: true })
  writeFileSync('.auth/demo-chef.json', JSON.stringify(chefState, null, 2))
  console.log(`[demo-setup] Wrote .auth/demo-chef.json`)

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Demo Client
  // ──────────────────────────────────────────────────────────────────────────

  const clientAuthId = await ensureAuthUser(admin, {
    email: DEMO_CLIENT_EMAIL,
    password: DEMO_CLIENT_PASSWORD,
    metadata: { role: 'client', demo: true },
  })

  // Upsert client record linked to demo chef's tenant
  const clientFields = {
    tenant_id: chefId,
    full_name: 'Sarah Chen',
    email: DEMO_CLIENT_EMAIL,
    phone: '617-555-0201',
    status: 'active',
    referral_source: 'website',
  }

  const { data: existingClient } = await admin
    .from('clients')
    .select('id')
    .eq('auth_user_id', clientAuthId)
    .maybeSingle()
  let clientId: string

  if (existingClient?.id) {
    await admin.from('clients').update(clientFields).eq('id', existingClient.id)
    clientId = existingClient.id as string
    console.log(`[demo-setup] Updated existing demo client: ${clientId}`)
  } else {
    const { data: inserted, error } = await admin
      .from('clients')
      .insert({ auth_user_id: clientAuthId, ...clientFields })
      .select('id')
      .single()
    if (error || !inserted)
      throw new Error(`[demo-setup] Failed to create demo client: ${error?.message}`)
    clientId = inserted.id as string
    console.log(`[demo-setup] Created new demo client: ${clientId}`)
  }

  // Ensure client role
  const { error: clientRoleError } = await admin
    .from('user_roles')
    .upsert(
      { auth_user_id: clientAuthId, role: 'client', entity_id: clientId },
      { onConflict: 'auth_user_id' }
    )
  if (clientRoleError)
    throw new Error(`[demo-setup] Failed to upsert client role: ${clientRoleError.message}`)
  console.log(`[demo-setup] Client role assigned`)

  // Write .auth/demo-client.json
  const clientState = {
    email: DEMO_CLIENT_EMAIL,
    password: DEMO_CLIENT_PASSWORD,
    authUserId: clientAuthId,
    clientId,
    tenantId: chefId,
  }
  writeFileSync('.auth/demo-client.json', JSON.stringify(clientState, null, 2))
  console.log(`[demo-setup] Wrote .auth/demo-client.json`)

  // ──────────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────────

  console.log('')
  console.log('=== Demo Accounts Ready ===')
  console.log('')
  console.log('  Demo Chef:')
  console.log(`    Email:     ${DEMO_CHEF_EMAIL}`)
  console.log(`    Password:  ${DEMO_CHEF_PASSWORD}`)
  console.log(`    Auth ID:   ${chefAuthId}`)
  console.log(`    Chef ID:   ${chefId}`)
  console.log(`    Tenant ID: ${chefId}`)
  console.log(`    Slug:      chef-demo-showcase`)
  console.log(`    State:     .auth/demo-chef.json`)
  console.log('')
  console.log('  Demo Client:')
  console.log(`    Email:     ${DEMO_CLIENT_EMAIL}`)
  console.log(`    Password:  ${DEMO_CLIENT_PASSWORD}`)
  console.log(`    Auth ID:   ${clientAuthId}`)
  console.log(`    Client ID: ${clientId}`)
  console.log(`    Tenant ID: ${chefId}`)
  console.log(`    State:     .auth/demo-client.json`)
  console.log('')
  console.log('  Public Profile: /chef/chef-demo-showcase')
  console.log('  Demo Panel:     /demo (requires DEMO_MODE_ENABLED=true)')
  console.log('')
  console.log('  Next steps:')
  console.log('    npm run demo:load   — load rich sample data')
  console.log('    npm run demo:clear  — clear all demo data')
  console.log('    npm run demo:reset  — clear + reload fresh')
}

main().catch((err) => {
  console.error('[demo-setup] FAILED:', err.message)
  process.exit(1)
})
