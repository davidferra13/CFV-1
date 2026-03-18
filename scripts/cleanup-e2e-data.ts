// @ts-nocheck
// Cleanup E2E test data from remote Supabase
// Usage: npm run cleanup:e2e
//
// Deletes all auth users whose email ends with @chefflow.test.
// Because every table cascades on chef/client deletion, this removes
// all seeded events, clients, quotes, menus, etc. in one operation.
// Safe to run at any time - only targets @chefflow.test addresses.

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

async function main() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  if (process.env.SUPABASE_E2E_ALLOW_REMOTE !== 'true') {
    throw new Error(
      'Set SUPABASE_E2E_ALLOW_REMOTE=true in .env.local to run cleanup.\n' +
        'This guard prevents accidental deletion on non-test environments.'
    )
  }

  const admin = createClient(url, key, { auth: { persistSession: false } })

  const { data: users, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(`Failed to list users: ${error.message}`)

  const e2eUsers = users.users.filter((u) => u.email?.endsWith('@chefflow.test'))

  if (e2eUsers.length === 0) {
    console.log('No E2E test users found (@chefflow.test). Nothing to clean up.')
    return
  }

  console.log(`\nFound ${e2eUsers.length} E2E test user(s) to delete:`)
  for (const user of e2eUsers) {
    console.log(`  - ${user.email}`)
  }
  console.log('')

  let deleted = 0
  let failed = 0

  for (const user of e2eUsers) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error(`  ✗ Failed to delete ${user.email}: ${deleteError.message}`)
      failed++
    } else {
      console.log(`  ✓ Deleted ${user.email}`)
      deleted++
    }
  }

  console.log(`\nCleanup complete: ${deleted} deleted, ${failed} failed.`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('[cleanup:e2e] Fatal error:', err)
  process.exit(1)
})
