#!/usr/bin/env npx tsx
/**
 * Backfill marketplace profiles for existing clients.
 *
 * For every client with an auth_user_id:
 *  1. Creates a marketplace_profiles row (if not exists)
 *  2. Creates a marketplace_client_links row linking profile -> client -> tenant
 *
 * For every directory-approved chef:
 *  1. Creates a chef_marketplace_profiles row (if not exists)
 *
 * Safe to re-run (idempotent via ON CONFLICT DO NOTHING).
 *
 * Usage:
 *   npx tsx scripts/backfill-marketplace-profiles.ts
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function backfillMarketplaceProfiles() {
  console.log('=== Backfill Marketplace Profiles ===\n')

  // 1. Fetch all clients that have an auth_user_id (registered users)
  const { data: clients, error: clientErr } = await supabase
    .from('clients')
    .select('id, auth_user_id, email, full_name, tenant_id, phone')
    .not('auth_user_id', 'is', null)

  if (clientErr) {
    console.error('Failed to fetch clients:', clientErr)
    process.exit(1)
  }

  console.log(`Found ${clients.length} clients with auth accounts\n`)

  // Group by auth_user_id (one auth user may have multiple client records)
  const byAuthUser = new Map<string, typeof clients>()
  for (const client of clients) {
    const existing = byAuthUser.get(client.auth_user_id!) ?? []
    existing.push(client)
    byAuthUser.set(client.auth_user_id!, existing)
  }

  let profilesCreated = 0
  let linksCreated = 0

  for (const [authUserId, clientRecords] of byAuthUser) {
    const primary = clientRecords[0]

    // Upsert marketplace_profile
    const { data: profile, error: profileErr } = await supabase
      .from('marketplace_profiles')
      .upsert(
        {
          auth_user_id: authUserId,
          email: primary.email,
          display_name: primary.full_name,
          phone: primary.phone,
          primary_client_id: primary.id,
        },
        { onConflict: 'auth_user_id' }
      )
      .select('id')
      .single()

    if (profileErr) {
      console.warn(`  Skipping auth_user ${authUserId}: ${profileErr.message}`)
      continue
    }

    profilesCreated++

    // Create links for each client record
    for (const client of clientRecords) {
      const { error: linkErr } = await supabase.from('marketplace_client_links').upsert(
        {
          marketplace_profile_id: profile.id,
          client_id: client.id,
          tenant_id: client.tenant_id,
        },
        { onConflict: 'marketplace_profile_id,tenant_id' }
      )

      if (linkErr) {
        console.warn(`  Link error for client ${client.id}: ${linkErr.message}`)
      } else {
        linksCreated++
      }
    }
  }

  console.log(`Marketplace profiles created/updated: ${profilesCreated}`)
  console.log(`Client links created/updated: ${linksCreated}\n`)

  // 2. Backfill chef marketplace profiles for directory-approved chefs
  const { data: chefs, error: chefErr } = await supabase
    .from('chefs')
    .select('id, display_name, business_name, tagline, profile_image_url, slug')
    .eq('directory_approved', true)
    .eq('is_deleted', false)

  if (chefErr) {
    console.error('Failed to fetch chefs:', chefErr)
    process.exit(1)
  }

  console.log(`Found ${chefs.length} directory-approved chefs\n`)

  let chefProfilesCreated = 0

  for (const chef of chefs) {
    const { error: cmpErr } = await supabase.from('chef_marketplace_profiles').upsert(
      {
        chef_id: chef.id,
        hero_image_url: chef.profile_image_url,
        highlight_text: chef.tagline,
        accepting_inquiries: true,
      },
      { onConflict: 'chef_id' }
    )

    if (cmpErr) {
      console.warn(`  Chef profile error for ${chef.id}: ${cmpErr.message}`)
    } else {
      chefProfilesCreated++
    }
  }

  console.log(`Chef marketplace profiles created/updated: ${chefProfilesCreated}`)
  console.log('\n=== Backfill complete ===')
}

backfillMarketplaceProfiles().catch(console.error)
