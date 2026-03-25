// @ts-nocheck - standalone script, database client type mismatch with generated types
// Developer Account Reset
// Wipes ALL business data + chef profile for the developer's real account.
// Preserves the auth.users record so login still works.
// Re-creates a minimal chef record so the dashboard is accessible.
//
// Usage: npx tsx scripts/reset-developer-account.ts
// Prereq: .auth/developer.json must exist with email + password

import { createAdminClient } from '@/lib/db/admin'
import { readFileSync, writeFileSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  // Read developer credentials
  let devCreds: { email: string; password: string }
  try {
    devCreds = JSON.parse(readFileSync('.auth/developer.json', 'utf-8'))
  } catch {
    throw new Error('[dev-reset] .auth/developer.json not found. Create it first.')
  }

  if (!devCreds.email || !devCreds.password || devCreds.password === 'FILL_IN_YOUR_PASSWORD_HERE') {
    throw new Error('[dev-reset] Developer credentials not configured in .auth/developer.json')
  }

  const admin = createAdminClient()

  console.log(`[dev-reset] Resetting account: ${devCreds.email}`)
  console.log('')

  // 1. Find the auth user
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listError) throw new Error(`[dev-reset] Failed to list auth users: ${listError.message}`)

  const authUser = listed.users.find((u) => u.email?.toLowerCase() === devCreds.email.toLowerCase())

  if (!authUser) {
    console.log('[dev-reset] No auth user found - account is already clean.')
    console.log('[dev-reset] Creating fresh chef record...')
    await createFreshChef(admin, devCreds)
    return
  }

  const authUserId = authUser.id
  console.log(`[dev-reset] Found auth user: ${authUserId}`)

  // 2. Find the chef record
  const { data: chef } = await admin
    .from('chefs')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (!chef?.id) {
    console.log('[dev-reset] No chef record found - creating fresh one...')
    await createFreshChef(admin, devCreds, authUserId)
    return
  }

  const chefId = chef.id as string
  console.log(`[dev-reset] Found chef: ${chefId} (this is also the tenant_id)`)
  console.log('')

  // 3. Delete all business data
  // Strategy: delete tables with RESTRICT FKs first (leaf → root),
  // then delete the chef record itself which cascades everything else.

  console.log('[dev-reset] Phase 1: Clearing RESTRICT-FK tables...')

  // Ledger entries have immutability triggers - service role bypasses RLS but
  // we need to handle the trigger. Delete via raw SQL using rpc or direct delete.
  // The service role client can delete even with triggers in the database.
  const restrictTables = [
    // These have ON DELETE RESTRICT from various parent tables
    { table: 'ledger_entries', col: 'tenant_id' },
    { table: 'platform_fee_ledger', col: 'tenant_id' },
    { table: 'quote_state_transitions', col: 'tenant_id' },
    { table: 'event_state_transitions', col: 'tenant_id' },
    { table: 'inquiry_state_transitions', col: 'tenant_id' },
    { table: 'menu_state_transitions', col: 'tenant_id' },
    { table: 'quote_selected_addons', col: 'tenant_id' },
    { table: 'expenses', col: 'tenant_id' },
    { table: 'commerce_payments', col: 'tenant_id' },
    { table: 'commerce_refunds', col: 'tenant_id' },
    { table: 'commerce_payment_schedules', col: 'tenant_id' },
    { table: 'quotes', col: 'tenant_id' },
    { table: 'components', col: 'tenant_id' },
    { table: 'dishes', col: 'tenant_id' },
    { table: 'recipe_ingredients', col: 'tenant_id' },
    { table: 'events', col: 'tenant_id' },
    { table: 'inquiries', col: 'tenant_id' },
    { table: 'clients', col: 'tenant_id' },
    { table: 'ingredients', col: 'tenant_id' },
  ]

  for (const { table, col } of restrictTables) {
    const { data, error } = await admin.from(table).delete().eq(col, chefId).select('id')
    if (error) {
      // Some tables may not exist or have different column names - try chef_id
      const { data: d2, error: e2 } = await admin
        .from(table)
        .delete()
        .eq('chef_id', chefId)
        .select('id')
      if (e2) {
        console.warn(`  ⚠ ${table}: ${error.message}`)
      } else {
        const count = d2?.length ?? 0
        if (count > 0) console.log(`  ✓ ${table}: ${count} rows deleted`)
      }
    } else {
      const count = data?.length ?? 0
      if (count > 0) console.log(`  ✓ ${table}: ${count} rows deleted`)
    }
  }

  console.log('')
  console.log('[dev-reset] Phase 2: Deleting chef record (cascades remaining tables)...')

  // Delete the chef record - ON DELETE CASCADE handles most other tables
  const { error: deleteChefError } = await admin.from('chefs').delete().eq('id', chefId)

  if (deleteChefError) {
    console.error(`  ✗ Failed to delete chef: ${deleteChefError.message}`)
    console.error('  Trying to clean up remaining FK blockers...')

    // If cascade fails, try deleting more tables manually
    const fallbackTables = [
      'after_action_reviews',
      'messages',
      'menus',
      'recipes',
      'chef_calendar_entries',
      'notifications',
      'response_templates',
      'chef_preferences',
      'user_roles',
    ]
    for (const table of fallbackTables) {
      try {
        await admin.from(table).delete().eq('tenant_id', chefId)
      } catch {}
      try {
        await admin.from(table).delete().eq('chef_id', chefId)
      } catch {}
    }

    // Retry chef deletion
    const { error: retryError } = await admin.from('chefs').delete().eq('id', chefId)
    if (retryError) {
      throw new Error(`[dev-reset] Cannot delete chef record: ${retryError.message}`)
    }
  }

  console.log('  ✓ Chef record deleted (cascade cleaned up remaining data)')

  // 3. Clean up user_roles (may not cascade from chef deletion)
  await admin.from('user_roles').delete().eq('auth_user_id', authUserId)
  console.log('  ✓ User roles cleared')

  console.log('')
  console.log('[dev-reset] Phase 3: Creating fresh chef record...')
  await createFreshChef(admin, devCreds, authUserId)
}

async function createFreshChef(
  admin: any,
  devCreds: { email: string; password: string },
  authUserId?: string
) {
  // If no auth user yet, create one
  if (!authUserId) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: devCreds.email,
      password: devCreds.password,
      email_confirm: true,
      user_metadata: { role: 'chef' },
    })
    if (error || !created.user) {
      throw new Error(`[dev-reset] Failed to create auth user: ${error?.message}`)
    }
    authUserId = created.user.id
    console.log(`  ✓ Created auth user: ${authUserId}`)
  } else {
    // Update password in case it changed
    await admin.auth.admin.updateUserById(authUserId, {
      password: devCreds.password,
      email_confirm: true,
      user_metadata: { role: 'chef' },
    })
    console.log(`  ✓ Auth user preserved: ${authUserId}`)
  }

  // Create minimal chef record
  const { data: newChef, error: chefError } = await admin
    .from('chefs')
    .insert({
      auth_user_id: authUserId,
      business_name: '',
      display_name: '',
      email: devCreds.email,
      slug: 'dev-' + Date.now(),
      preferred_inquiry_destination: 'both',
    })
    .select('id')
    .single()

  if (chefError || !newChef) {
    throw new Error(`[dev-reset] Failed to create chef: ${chefError?.message}`)
  }

  const chefId = newChef.id as string
  console.log(`  ✓ Created fresh chef: ${chefId}`)

  // Assign role
  const { error: roleError } = await admin
    .from('user_roles')
    .upsert(
      { auth_user_id: authUserId, role: 'chef', entity_id: chefId },
      { onConflict: 'auth_user_id' }
    )
  if (roleError) {
    throw new Error(`[dev-reset] Failed to assign role: ${roleError.message}`)
  }
  console.log('  ✓ Chef role assigned')

  // Create preferences
  const { error: prefError } = await admin
    .from('chef_preferences')
    .upsert({ chef_id: chefId, tenant_id: chefId }, { onConflict: 'chef_id' })
  if (prefError) {
    console.warn(`  ⚠ chef_preferences: ${prefError.message}`)
  } else {
    console.log('  ✓ Chef preferences created')
  }

  // Update developer.json with IDs
  const updatedCreds = {
    ...devCreds,
    authUserId,
    chefId,
    tenantId: chefId,
  }
  writeFileSync('.auth/developer.json', JSON.stringify(updatedCreds, null, 2))
  console.log('  ✓ Updated .auth/developer.json with IDs')

  console.log('')
  console.log('=== Account Reset Complete ===')
  console.log(`  Email:     ${devCreds.email}`)
  console.log(`  Auth ID:   ${authUserId}`)
  console.log(`  Chef ID:   ${chefId}`)
  console.log(`  Tenant ID: ${chefId}`)
  console.log('')
  console.log('  Your dashboard is now a clean slate.')
  console.log('  Log in via Mission Control → "My Dashboard" button.')
}

main().catch((err) => {
  console.error('[dev-reset] FAILED:', err.message)
  process.exit(1)
})
