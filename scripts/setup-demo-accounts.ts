// @ts-nocheck - standalone script, database client type mismatch with generated types
// Demo Account Bootstrap
// Creates/updates persistent demo chef + demo client accounts in the database.
// Idempotent - safe to run multiple times.
//
// Usage: npx tsx scripts/setup-demo-accounts.ts
//
// Follows the same patterns as scripts/setup-agent-account.ts:
//   ensureAuthUser → upsertChef → ensureChefRole → ensureChefPreferences
//   ensureAuthUser → upsertClient → ensureClientRole

import { createAdminClient } from '@/lib/db/admin'
import { mkdirSync, writeFileSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const DEMO_CHEF_EMAIL = 'demo@chefflow.test'
const DEMO_CHEF_PASSWORD = 'DemoChefFlow!2026'
const DEMO_CLIENT_EMAIL = 'demo-client@chefflow.test'
const DEMO_CLIENT_PASSWORD = 'DemoClientFlow!2026'
const DEMO_STAFF_EMAIL = 'demo-staff@chefflow.test'
const DEMO_STAFF_PASSWORD = 'DemoStaffFlow!2026'
const DEMO_PARTNER_EMAIL = 'demo-partner@chefflow.test'
const DEMO_PARTNER_PASSWORD = 'DemoPartnerFlow!2026'
const DEMO_CHEF_B_EMAIL = 'demo-chef-b@chefflow.test'
const DEMO_CHEF_B_PASSWORD = 'DemoChefB!2026'

async function ensureAuthUser(
  admin: any,
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
  const admin = createAdminClient()

  console.log(`[demo-setup] Setting up demo accounts`)

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

  // Ensure chef preferences (with archetype so layout doesn't show archetype selector)
  const { error: prefError } = await admin.from('chef_preferences').upsert(
    {
      chef_id: chefId,
      tenant_id: chefId,
      home_city: 'Boston',
      home_state: 'MA',
      network_discoverable: true,
      archetype: 'private-chef',
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
  // 3. Demo Staff Member
  // ──────────────────────────────────────────────────────────────────────────

  const staffAuthId = await ensureAuthUser(admin, {
    email: DEMO_STAFF_EMAIL,
    password: DEMO_STAFF_PASSWORD,
    metadata: { role: 'staff', demo: true },
  })

  // Ensure staff_members record linked to demo chef
  const { data: existingStaff } = await admin
    .from('staff_members')
    .select('id')
    .eq('chef_id', chefId)
    .eq('email', DEMO_STAFF_EMAIL)
    .maybeSingle()
  let staffMemberId: string

  if (existingStaff?.id) {
    staffMemberId = existingStaff.id as string
    console.log(`[demo-setup] Existing staff member: ${staffMemberId}`)
  } else {
    const { data: inserted, error } = await admin
      .from('staff_members')
      .insert({
        chef_id: chefId,
        name: 'Maria Santos',
        email: DEMO_STAFF_EMAIL,
        phone: '617-555-0301',
        role: 'sous_chef',
        hourly_rate_cents: 3500,
        status: 'active',
        notes: 'Lead sous chef. 5 years experience. Specializes in pastry and garde manger.',
      })
      .select('id')
      .single()
    if (error || !inserted)
      throw new Error(`[demo-setup] Failed to create staff member: ${error?.message}`)
    staffMemberId = inserted.id as string
    console.log(`[demo-setup] Created staff member: ${staffMemberId}`)
  }

  // Ensure staff role
  const { error: staffRoleError } = await admin
    .from('user_roles')
    .upsert(
      { auth_user_id: staffAuthId, role: 'staff', entity_id: staffMemberId },
      { onConflict: 'auth_user_id' }
    )
  if (staffRoleError)
    throw new Error(`[demo-setup] Failed to upsert staff role: ${staffRoleError.message}`)
  console.log(`[demo-setup] Staff role assigned`)

  // Write .auth/demo-staff.json
  const staffState = {
    email: DEMO_STAFF_EMAIL,
    password: DEMO_STAFF_PASSWORD,
    authUserId: staffAuthId,
    staffMemberId,
    chefId,
    tenantId: chefId,
  }
  writeFileSync('.auth/demo-staff.json', JSON.stringify(staffState, null, 2))
  console.log(`[demo-setup] Wrote .auth/demo-staff.json`)

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Demo Partner (Venue)
  // ──────────────────────────────────────────────────────────────────────────

  const partnerAuthId = await ensureAuthUser(admin, {
    email: DEMO_PARTNER_EMAIL,
    password: DEMO_PARTNER_PASSWORD,
    metadata: { role: 'partner', demo: true },
  })

  // Ensure referral_partners record
  const { data: existingPartner } = await admin
    .from('referral_partners')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('email', DEMO_PARTNER_EMAIL)
    .maybeSingle()
  let partnerId: string

  if (existingPartner?.id) {
    partnerId = existingPartner.id as string
    console.log(`[demo-setup] Existing partner: ${partnerId}`)
  } else {
    const { data: inserted, error } = await admin
      .from('referral_partners')
      .insert({
        tenant_id: chefId,
        auth_user_id: partnerAuthId,
        name: 'The Langham Boston',
        contact_name: 'Rachel Kim',
        email: DEMO_PARTNER_EMAIL,
        phone: '617-555-0401',
        partner_type: 'venue',
        status: 'active',
        description:
          'Luxury hotel in the Back Bay. Refers guests seeking private dining for special occasions, corporate retreats, and intimate celebrations.',
        website: 'https://www.langhamhotels.com/boston',
        commission_notes: '10% referral commission on booked events',
      })
      .select('id')
      .single()
    if (error || !inserted)
      throw new Error(`[demo-setup] Failed to create partner: ${error?.message}`)
    partnerId = inserted.id as string
    console.log(`[demo-setup] Created partner: ${partnerId}`)
  }

  // Ensure partner role
  const { error: partnerRoleError } = await admin
    .from('user_roles')
    .upsert(
      { auth_user_id: partnerAuthId, role: 'partner', entity_id: partnerId },
      { onConflict: 'auth_user_id' }
    )
  if (partnerRoleError)
    throw new Error(`[demo-setup] Failed to upsert partner role: ${partnerRoleError.message}`)
  console.log(`[demo-setup] Partner role assigned`)

  // Write .auth/demo-partner.json
  const partnerState = {
    email: DEMO_PARTNER_EMAIL,
    password: DEMO_PARTNER_PASSWORD,
    authUserId: partnerAuthId,
    partnerId,
    tenantId: chefId,
  }
  writeFileSync('.auth/demo-partner.json', JSON.stringify(partnerState, null, 2))
  console.log(`[demo-setup] Wrote .auth/demo-partner.json`)

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Demo Chef B (for event handoff video)
  // ──────────────────────────────────────────────────────────────────────────

  const chefBAuthId = await ensureAuthUser(admin, {
    email: DEMO_CHEF_B_EMAIL,
    password: DEMO_CHEF_B_PASSWORD,
    metadata: { role: 'chef', demo: true },
  })

  const chefBFields = {
    business_name: 'Oak & Olive Catering',
    display_name: 'Chef Marcus Rivera',
    email: DEMO_CHEF_B_EMAIL,
    phone: '617-555-0501',
    slug: 'chef-demo-b',
    tagline: 'Modern Mediterranean cuisine for gatherings of any size',
    bio: 'Chef Marcus Rivera specializes in Mediterranean and Middle Eastern cuisine, bringing bold flavors to corporate events and private celebrations across Greater Boston.',
    show_website_on_public_profile: false,
    preferred_inquiry_destination: 'both' as const,
    subscription_status: 'active',
    onboarding_completed_at: new Date().toISOString(),
    timezone: 'America/New_York',
  }

  const { data: existingChefB } = await admin
    .from('chefs')
    .select('id')
    .eq('auth_user_id', chefBAuthId)
    .maybeSingle()
  let chefBId: string

  if (existingChefB?.id) {
    await admin.from('chefs').update(chefBFields).eq('id', existingChefB.id)
    chefBId = existingChefB.id as string
    console.log(`[demo-setup] Updated Chef B: ${chefBId}`)
  } else {
    const { data: inserted, error } = await admin
      .from('chefs')
      .insert({ auth_user_id: chefBAuthId, ...chefBFields })
      .select('id')
      .single()
    if (error || !inserted)
      throw new Error(`[demo-setup] Failed to create Chef B: ${error?.message}`)
    chefBId = inserted.id as string
    console.log(`[demo-setup] Created Chef B: ${chefBId}`)
  }

  // Chef B role
  await admin
    .from('user_roles')
    .upsert(
      { auth_user_id: chefBAuthId, role: 'chef', entity_id: chefBId },
      { onConflict: 'auth_user_id' }
    )

  // Chef B preferences
  await admin.from('chef_preferences').upsert(
    {
      chef_id: chefBId,
      tenant_id: chefBId,
      home_city: 'Boston',
      home_state: 'MA',
      network_discoverable: true,
      archetype: 'caterer',
    },
    { onConflict: 'chef_id' }
  )
  console.log(`[demo-setup] Chef B role + preferences set`)

  // Write .auth/demo-chef-b.json
  const chefBState = {
    email: DEMO_CHEF_B_EMAIL,
    password: DEMO_CHEF_B_PASSWORD,
    authUserId: chefBAuthId,
    chefId: chefBId,
    tenantId: chefBId,
    slug: 'chef-demo-b',
  }
  writeFileSync('.auth/demo-chef-b.json', JSON.stringify(chefBState, null, 2))
  console.log(`[demo-setup] Wrote .auth/demo-chef-b.json`)

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
  console.log('  Demo Staff:')
  console.log(`    Email:     ${DEMO_STAFF_EMAIL}`)
  console.log(`    Password:  ${DEMO_STAFF_PASSWORD}`)
  console.log(`    Staff ID:  ${staffMemberId}`)
  console.log(`    State:     .auth/demo-staff.json`)
  console.log('')
  console.log('  Demo Partner:')
  console.log(`    Email:     ${DEMO_PARTNER_EMAIL}`)
  console.log(`    Password:  ${DEMO_PARTNER_PASSWORD}`)
  console.log(`    Partner:   ${partnerId} (The Langham Boston)`)
  console.log(`    State:     .auth/demo-partner.json`)
  console.log('')
  console.log('  Demo Chef B:')
  console.log(`    Email:     ${DEMO_CHEF_B_EMAIL}`)
  console.log(`    Password:  ${DEMO_CHEF_B_PASSWORD}`)
  console.log(`    Chef ID:   ${chefBId}`)
  console.log(`    Slug:      chef-demo-b`)
  console.log(`    State:     .auth/demo-chef-b.json`)
  console.log('')
  console.log('  Public Profile: /chef/chef-demo-showcase')
  console.log('  Demo Panel:     /demo (requires DEMO_MODE_ENABLED=true)')
  console.log('')
  console.log('  Next steps:')
  console.log('    npm run demo:load   - load rich sample data')
  console.log('    npm run demo:clear  - clear all demo data')
  console.log('    npm run demo:reset  - clear + reload fresh')
}

main().catch((err) => {
  console.error('[demo-setup] FAILED:', err.message)
  process.exit(1)
})
