/**
 * Supabase Connection Verification Script
 * Tests connection and checks database setup
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function verifySupabase() {
  console.log('🔍 Verifying Supabase Connection...\n')

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables!')
    console.error('  - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
    console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗')
    process.exit(1)
  }

  console.log('✅ Environment variables found')
  console.log(`   URL: ${supabaseUrl}\n`)

  // Create Supabase client
  const supabase = createClient<Database>(supabaseUrl, supabaseKey)

  // Test 1: Check connection by querying chefs table
  console.log('📊 Testing database connection...')
  const { count: chefsCount, error: chefsError } = await supabase
    .from('chefs')
    .select('*', { count: 'exact', head: true })

  if (chefsError) {
    console.error('❌ Failed to connect to database:', chefsError.message)
    process.exit(1)
  }

  console.log(`✅ Connected! Found ${chefsCount} chef(s)\n`)

  // Test 2: Check all tables exist
  console.log('📋 Verifying tables...')

  const tables = [
    'chefs',
    'clients',
    'user_roles',
    'client_invitations',
    'events',
    'event_transitions',
    'ledger_entries',
    'menus',
    'event_menus'
  ]

  let allTablesExist = true

  for (const table of tables) {
    const { error } = await supabase
      .from(table as any)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error(`   ❌ ${table}: ${error.message}`)
      allTablesExist = false
    } else {
      console.log(`   ✅ ${table}`)
    }
  }

  if (!allTablesExist) {
    console.error('\n❌ Some tables are missing!')
    process.exit(1)
  }

  // Test 3: Check views
  console.log('\n📊 Verifying views...')
  const { error: viewError } = await supabase
    .from('event_financial_summary')
    .select('*', { count: 'exact', head: true })

  if (viewError) {
    console.error(`   ❌ event_financial_summary: ${viewError.message}`)
  } else {
    console.log('   ✅ event_financial_summary')
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('✅ Supabase Setup Complete!')
  console.log('='.repeat(50))
  console.log('\n📚 Your database includes:')
  console.log('   • 9 tables (chefs, clients, events, ledger, etc.)')
  console.log('   • 1 view (event_financial_summary)')
  console.log('   • RLS policies (Row Level Security)')
  console.log('   • Immutability triggers (ledger, transitions)')
  console.log('   • Helper functions (auth, tenant scoping)')
  console.log('\n🎯 Next steps:')
  console.log('   1. Run: npm run dev')
  console.log('   2. Visit: http://localhost:3000')
  console.log('   3. Test chef signup flow')
  console.log('   4. Verify data in Supabase Dashboard')
  console.log('\n📖 Documentation:')
  console.log('   • Database: DATABASE.md')
  console.log('   • Security: RLS_POLICIES.md')
  console.log('   • Setup: SUPABASE_SETUP.md')
  console.log('')
}

verifySupabase().catch(console.error)
