/**
 * Supabase Connection Verification Script
 * Tests connectivity, table availability, and reports key row counts.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

config({ path: resolve(process.cwd(), '.env.local') })

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

async function verifySupabase() {
  console.log('Verifying Supabase connection...\n')

  const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseKey = serviceRoleKey || anonKey

  if (!supabaseKey) {
    throw new Error('Missing key: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const usingServiceRole = Boolean(serviceRoleKey)

  console.log(`URL: ${supabaseUrl}`)
  console.log(`Auth mode: ${usingServiceRole ? 'service_role' : 'anon'}\n`)

  const supabase = createClient<Database>(supabaseUrl, supabaseKey)

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
    const { count, error } = await supabase.from(table as any).select('*', { head: true, count: 'exact' })
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
