// Codex Account Bootstrap
// Creates or updates a persistent Codex-owned ChefFlow account.
// Usage: npx tsx scripts/setup-codex-account.ts

import dotenv from 'dotenv'
import { mkdirSync, writeFileSync } from 'fs'

dotenv.config({ path: '.env.local' })

const CODEX_EMAIL = process.env.CODEX_EMAIL || 'codex@local.chefflow'
const CODEX_PASSWORD = process.env.CODEX_PASSWORD || 'CodexChefFlow!2026'

async function main() {
  const adminModule = (await import('@/lib/db/admin')) as Awaited<
    typeof import('@/lib/db/admin')
  > & {
    default?: Awaited<typeof import('@/lib/db/admin')>
  }
  const { createAdminClient } = adminModule.default ?? adminModule
  const admin = createAdminClient()

  console.log(`[codex-setup] Setting up Codex account: ${CODEX_EMAIL}`)

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listError) throw new Error(`[codex-setup] Failed to list auth users: ${listError.message}`)

  const existing = listed.users.find(
    (user) => user.email?.toLowerCase() === CODEX_EMAIL.toLowerCase()
  )
  let authUserId: string

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: CODEX_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'chef', codex: true, internal_agent: true },
    })
    if (error) throw new Error(`[codex-setup] Failed to update auth user: ${error.message}`)
    authUserId = existing.id
    console.log(`[codex-setup] Updated existing auth user: ${authUserId}`)
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: CODEX_EMAIL,
      password: CODEX_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'chef', codex: true, internal_agent: true },
    })
    if (error || !created.user) {
      throw new Error(`[codex-setup] Failed to create auth user: ${error?.message}`)
    }
    authUserId = created.user.id
    console.log(`[codex-setup] Created new auth user: ${authUserId}`)
  }

  const chefFields = {
    business_name: 'CODEX - ChefFlow Agent',
    display_name: 'Codex',
    email: CODEX_EMAIL,
    slug: 'codex-agent',
    tagline: 'Internal ChefFlow Codex account. Not a real chef.',
    bio: 'This private account is used by Codex for authenticated ChefFlow inspection and verification.',
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
    const { error } = await admin.from('chefs').update(chefFields).eq('id', existingChef.id)
    if (error) throw new Error(`[codex-setup] Failed to update chef: ${error.message}`)
    chefId = existingChef.id as string
    console.log(`[codex-setup] Updated existing chef: ${chefId}`)
  } else {
    const { data: inserted, error } = await admin
      .from('chefs')
      .insert({ auth_user_id: authUserId, ...chefFields })
      .select('id')
      .single()
    if (error || !inserted)
      throw new Error(`[codex-setup] Failed to create chef: ${error?.message}`)
    chefId = inserted.id as string
    console.log(`[codex-setup] Created new chef: ${chefId}`)
  }

  const { error: roleError } = await admin
    .from('user_roles')
    .upsert(
      { auth_user_id: authUserId, role: 'chef', entity_id: chefId },
      { onConflict: 'auth_user_id' }
    )
  if (roleError) throw new Error(`[codex-setup] Failed to upsert chef role: ${roleError.message}`)

  const { error: prefError } = await admin
    .from('chef_preferences')
    .upsert(
      { chef_id: chefId, tenant_id: chefId, network_discoverable: false },
      { onConflict: 'chef_id' }
    )
  if (prefError) {
    throw new Error(`[codex-setup] Failed to upsert chef preferences: ${prefError.message}`)
  }

  mkdirSync('.auth', { recursive: true })
  writeFileSync(
    '.auth/codex.json',
    `${JSON.stringify(
      {
        email: CODEX_EMAIL,
        password: CODEX_PASSWORD,
        authUserId,
        chefId,
        tenantId: chefId,
      },
      null,
      2
    )}\n`
  )

  console.log('[codex-setup] Wrote .auth/codex.json')
  console.log(`[codex-setup] Codex account ready: ${CODEX_EMAIL}`)
}

main().catch((error) => {
  console.error('[codex-setup] FAILED:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
