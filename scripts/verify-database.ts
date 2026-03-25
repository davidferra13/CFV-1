/**
 * Database Connection Verification Script
 * Tests connectivity, table availability, and reports key row counts.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '@/lib/db/admin'

config({ path: resolve(process.cwd(), '.env.local') })

async function verifyDatabase() {
  console.log('Verifying database connection...\n')

  console.log('Using createAdminClient() (direct DB connection)\n')

  const db = createAdminClient()

  const health = await db.from('chefs').select('id', { head: true, count: 'exact' })
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
    const { error } = await db.from(table as any).select('*', { head: true, count: 'exact' })
    if (error) {
      throw new Error(`Table check failed for ${table}: ${error.message}`)
    }
    console.log(`  OK ${table}`)
  }

  console.log('\nChecking required view...')
  const viewCheck = await db
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
    const { count, error } = await db.from(table as any).select('*', { head: true, count: 'exact' })
    if (error) {
      console.log(`  ${table}: error (${error.message})`)
    } else {
      console.log(`  ${table}: ${count ?? 0}`)
    }
  }

  console.log('\nDatabase verification complete.')
}

verifyDatabase().catch((error) => {
  console.error(`Verification failed: ${error.message}`)
  process.exit(1)
})
