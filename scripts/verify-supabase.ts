/**
 * Supabase Connection Verification Script
 * Tests connectivity, table availability, and reports key row counts.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '@/lib/supabase/admin'

config({ path: resolve(process.cwd(), '.env.local') })

async function verifySupabase() {
  console.log('Verifying Supabase connection...\n')

  console.log('Using createAdminClient() (direct DB connection)\n')

  const supabase = createAdminClient()

  const health = await supabase.from('chefs').select('id', { head: true, count: 'exact' })
  if (health.error) {
    throw new Error(`Database connectivity failed: ${health.error.message}`)
  }

  console.log('Connection OK\n')

  const tables = [
    'chefs',
    'clients',
    'user_roles',
    'client_invitations',
    'events',
    'inquiries',
    'messages',
    'integration_connections',
    'integration_events',
  ]

  console.log('Checking required tables...')
  for (const table of tables) {
    const { error } = await supabase.from(table as any).select('*', { head: true, count: 'exact' })
    if (error) {
      throw new Error(`Table check failed for ${table}: ${error.message}`)
    }
    console.log(`  OK ${table}`)
  }

  console.log('\nChecking required view...')
  const viewCheck = await supabase
    .from('event_financial_summary')
    .select('*', { head: true, count: 'exact' })

  if (viewCheck.error) {
    throw new Error(`View check failed for event_financial_summary: ${viewCheck.error.message}`)
  }
  console.log('  OK event_financial_summary')

  console.log('\nSample row counts:')
  const countsToShow = [
    'chefs',
    'clients',
    'inquiries',
    'events',
    'integration_connections',
    'integration_events',
  ]

  for (const table of countsToShow) {
    const { count, error } = await supabase
      .from(table as any)
      .select('*', { head: true, count: 'exact' })
    if (error) {
      console.log(`  ${table}: error (${error.message})`)
    } else {
      console.log(`  ${table}: ${count ?? 0}`)
    }
  }

  console.log('\nSupabase verification complete.')
}

verifySupabase().catch((error) => {
  console.error(`Verification failed: ${error.message}`)
  process.exit(1)
})
