// @ts-nocheck - standalone script, Supabase client type mismatch with generated types
// Demo Data Clear
// Removes all business data from the demo chef's tenant.
// Preserves the demo chef and demo client accounts themselves.
//
// Usage: npx tsx scripts/demo-data-clear.ts
// Prereq: npm run demo:setup (creates demo accounts first)

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`[demo-clear] Missing environment variable: ${name}`)
  return value
}

async function clearTable(
  admin: ReturnType<typeof createClient>,
  table: string,
  tenantId: string,
  tenantColumn = 'tenant_id'
): Promise<number> {
  const { data, error } = await admin.from(table).delete().eq(tenantColumn, tenantId).select('id')

  if (error) {
    console.warn(`  ⚠ ${table}: ${error.message}`)
    return 0
  }

  const count = data?.length ?? 0
  if (count > 0) {
    console.log(`  ✓ ${table}: ${count} rows deleted`)
  } else {
    console.log(`  · ${table}: already empty`)
  }
  return count
}

async function main() {
  // Read demo chef credentials
  let demoChef: { chefId: string; tenantId: string }
  try {
    demoChef = JSON.parse(readFileSync('.auth/demo-chef.json', 'utf-8'))
  } catch {
    throw new Error('[demo-clear] .auth/demo-chef.json not found. Run `npm run demo:setup` first.')
  }

  // Read demo client credentials (to preserve this client record)
  let demoClient: { clientId: string }
  try {
    demoClient = JSON.parse(readFileSync('.auth/demo-client.json', 'utf-8'))
  } catch {
    demoClient = { clientId: '' }
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { chefId, tenantId } = demoChef
  console.log(`[demo-clear] Clearing data for demo chef: ${chefId}`)
  console.log(`[demo-clear] Tenant: ${tenantId}`)
  console.log('')

  // Delete in reverse dependency order to avoid FK violations.
  // Tables with foreign keys to other tables must be deleted first.

  // Ledger entries (may have immutability triggers - use admin client)
  await clearTable(admin, 'ledger_entries', tenantId)

  // Expenses
  await clearTable(admin, 'expenses', tenantId)

  // Quotes
  await clearTable(admin, 'quotes', tenantId)

  // Dishes (FK → menus)
  await clearTable(admin, 'dishes', tenantId)

  // Events (FK → clients, inquiries)
  await clearTable(admin, 'events', tenantId)

  // Inquiries (FK → clients)
  await clearTable(admin, 'inquiries', tenantId)

  // Menus
  await clearTable(admin, 'menus', tenantId)

  // Recipes
  await clearTable(admin, 'recipes', tenantId)

  // Calendar entries (use chef_id, not tenant_id)
  await clearTable(admin, 'chef_calendar_entries', chefId, 'chef_id')

  // Clients - delete all EXCEPT the demo client account (which has an auth user)
  if (demoClient.clientId) {
    const { data, error } = await admin
      .from('clients')
      .delete()
      .eq('tenant_id', tenantId)
      .neq('id', demoClient.clientId)
      .select('id')

    if (error) {
      console.warn(`  ⚠ clients: ${error.message}`)
    } else {
      const count = data?.length ?? 0
      console.log(
        count > 0
          ? `  ✓ clients: ${count} rows deleted (preserved demo client)`
          : `  · clients: already empty (demo client preserved)`
      )
    }
  } else {
    await clearTable(admin, 'clients', tenantId)
  }

  console.log('')
  console.log('=== Demo Data Cleared ===')
  console.log('  Accounts preserved: demo chef + demo client')
  console.log('  All business data removed')
  console.log('')
  console.log('  To reload: npm run demo:load')
  console.log('  To reset:  npm run demo:reset')
}

main().catch((err) => {
  console.error('[demo-clear] FAILED:', err.message)
  process.exit(1)
})
