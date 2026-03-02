// Reset inbox + Gmail sync pipeline data for the developer tenant.
// Destructive for the target tenant only.
//
// Run:
//   npx tsx scripts/reset-inbox-sync-data.ts

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

type DevIdentity = {
  email: string
  password: string
  authUserId?: string
  chefId?: string
  tenantId?: string
}

function loadDevIdentity(): DevIdentity {
  try {
    return JSON.parse(readFileSync('.auth/developer.json', 'utf-8'))
  } catch {
    throw new Error('.auth/developer.json not found')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = ReturnType<typeof createClient<any>>

function getAdminClient(): AdminClient {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
}

async function resolveTenant(admin: AdminClient, dev: DevIdentity) {
  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const authUser = listed?.users.find((u) => u.email?.toLowerCase() === dev.email.toLowerCase())
  if (!authUser) throw new Error(`No auth user found for ${dev.email}`)

  const { data: chef } = await (admin as any)
    .from('chefs')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (!chef?.id) throw new Error(`No chef record found for ${dev.email}`)
  return chef.id as string
}

async function deleteByTenant(
  admin: AdminClient,
  table: string,
  tenantId: string,
  extraFilters?: (q: any) => any
) {
  let query = admin
    .from(table as any)
    .delete()
    .eq('tenant_id', tenantId)
    .select('tenant_id')
  if (extraFilters) query = extraFilters(query)
  const { data, error } = await query
  if (error) {
    console.error(`  ${table}: ERROR ${error.message}`)
    return 0
  }
  const count = data?.length ?? 0
  console.log(`  ${table}: ${count} rows deleted`)
  return count
}

async function main() {
  console.log('Resetting inbox/sync data for developer tenant...')
  const admin = getAdminClient()
  const dev = loadDevIdentity()
  const tenantId = await resolveTenant(admin, dev)
  console.log(`  tenant_id: ${tenantId}`)

  // Communication pipeline (delete children first)
  await deleteByTenant(admin, 'communication_action_log', tenantId)
  await deleteByTenant(admin, 'suggested_links', tenantId)
  await deleteByTenant(admin, 'follow_up_timers', tenantId)
  await deleteByTenant(admin, 'conversation_thread_reads', tenantId)
  await deleteByTenant(admin, 'communication_events', tenantId)
  await deleteByTenant(admin, 'conversation_threads', tenantId)

  // Gmail sync pipeline
  await deleteByTenant(admin, 'gmail_historical_findings', tenantId)
  await deleteByTenant(admin, 'gmail_sync_log', tenantId)

  // Messages: email-origin rows only
  const messageChannels = ['email']
  for (const channel of messageChannels) {
    await deleteByTenant(admin, 'messages', tenantId, (q) => q.eq('channel', channel))
  }

  // Inquiries created from email + platforms
  const inquiryChannels = [
    'email',
    'take_a_chef',
    'yhangry',
    'thumbtack',
    'theknot',
    'bark',
    'cozymeal',
    'gigsalad',
    'google_business',
  ]
  for (const channel of inquiryChannels) {
    await deleteByTenant(admin, 'inquiries', tenantId, (q) => q.eq('channel', channel))
  }

  // Inquiry notifications for clean dashboard signal
  await deleteByTenant(admin, 'notifications', tenantId, (q) => q.eq('category', 'inquiry'))

  // Reset Gmail sync cursors/state (keep OAuth connection/tokens)
  const { error: connErr } = await admin
    .from('google_connections')
    .update({
      gmail_history_id: null,
      gmail_last_sync_at: null,
      gmail_sync_errors: 0,
      historical_scan_page_token: null,
      historical_scan_total_processed: 0,
      historical_scan_status: 'idle',
      historical_scan_started_at: null,
      historical_scan_completed_at: null,
      historical_scan_last_run_at: null,
    })
    .eq('chef_id', tenantId)

  if (connErr) {
    console.error(`  google_connections: ERROR ${connErr.message}`)
  } else {
    console.log('  google_connections: sync state reset')
  }

  console.log('Done. You can now press Sync from a clean state.')
}

main().catch((err) => {
  console.error('Fatal reset error:', err)
  process.exit(1)
})
