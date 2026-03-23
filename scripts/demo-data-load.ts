// Demo Data Loader
// Loads rich sample data into the demo chef's tenant.
// Idempotent - safe to run multiple times.
//
// Usage: npx tsx scripts/demo-data-load.ts
// Prereq: npm run demo:setup (creates demo accounts first)

import { createAdminClient } from '@/lib/supabase/admin'
import { readFileSync } from 'fs'
import { createRequire } from 'module'
import dotenv from 'dotenv'

// Use createRequire for local .ts imports - tsx + Node 24 on Windows treats
// .ts files as CJS when imported from scripts/, breaking named ESM imports.
const require = createRequire(import.meta.url)

const {
  DEMO_CLIENTS,
  DEMO_EVENTS,
  DEMO_INQUIRIES,
  DEMO_MENUS,
  DEMO_RECIPES,
  DEMO_QUOTES,
  DEMO_LEDGER_ENTRIES,
  DEMO_EXPENSES,
  DEMO_CALENDAR_ENTRIES,
  DEMO_LOYALTY_CONFIG,
  DEMO_LOYALTY_TRANSACTIONS,
  DEMO_CLIENT_LOYALTY,
  DEMO_STAFF_ASSIGNMENTS,
} = require('../lib/demo/fixtures')

const {
  ensureClient,
  ensureEvent,
  ensureInquiry,
  ensureMenu,
  ensureRecipe,
  ensureQuote,
  ensureLedgerEntry,
  ensureExpense,
  ensureCalendarEntry,
  ensureLoyaltyConfig,
  ensureLoyaltyTransaction,
  updateClientLoyalty,
  ensureStaffAssignment,
} = require('../lib/demo/seed-helpers')

dotenv.config({ path: '.env.local' })

async function main() {
  // Read demo chef credentials
  let demoChef: { chefId: string; tenantId: string; authUserId: string }
  try {
    demoChef = JSON.parse(readFileSync('.auth/demo-chef.json', 'utf-8'))
  } catch {
    throw new Error('[demo-load] .auth/demo-chef.json not found. Run `npm run demo:setup` first.')
  }

  const admin = createAdminClient()

  const { chefId, tenantId, authUserId } = demoChef
  console.log(`[demo-load] Loading data for demo chef: ${chefId}`)
  console.log(`[demo-load] Tenant: ${tenantId}`)

  // ── 1. Clients ──────────────────────────────────────────────────────────
  console.log(`\n[demo-load] Seeding ${DEMO_CLIENTS.length} clients...`)
  const clientIds: string[] = []
  for (const client of DEMO_CLIENTS) {
    const id = await ensureClient(admin, tenantId, client)
    clientIds.push(id)
    console.log(`  ✓ ${client.full_name}`)
  }

  // ── 2. Inquiries ────────────────────────────────────────────────────────
  console.log(`\n[demo-load] Seeding ${DEMO_INQUIRIES.length} inquiries...`)
  const inquiryIds: string[] = []
  for (const inquiry of DEMO_INQUIRIES) {
    const id = await ensureInquiry(admin, tenantId, clientIds[inquiry.clientIndex], inquiry)
    inquiryIds.push(id)
    console.log(`  ✓ ${inquiry.confirmed_occasion} (${inquiry.status})`)
  }

  // ── 3. Events ───────────────────────────────────────────────────────────
  console.log(`\n[demo-load] Seeding ${DEMO_EVENTS.length} events...`)
  const eventIds: string[] = []
  for (const event of DEMO_EVENTS) {
    const id = await ensureEvent(admin, tenantId, clientIds[event.clientIndex], event)
    eventIds.push(id)
    console.log(`  ✓ ${event.occasion} (${event.status})`)
  }

  // ── 4. Menus + Dishes ──────────────────────────────────────────────────
  console.log(`\n[demo-load] Seeding ${DEMO_MENUS.length} menus with dishes...`)
  for (const menu of DEMO_MENUS) {
    await ensureMenu(admin, tenantId, menu)
    console.log(`  ✓ ${menu.name} (${menu.dishes.length} courses)`)
  }

  // ── 5. Recipes ──────────────────────────────────────────────────────────
  console.log(`\n[demo-load] Seeding ${DEMO_RECIPES.length} recipes...`)
  for (const recipe of DEMO_RECIPES) {
    await ensureRecipe(admin, tenantId, authUserId, recipe)
    console.log(`  ✓ ${recipe.name}`)
  }

  // ── 6. Quotes ───────────────────────────────────────────────────────────
  console.log(`\n[demo-load] Seeding ${DEMO_QUOTES.length} quotes...`)
  for (const quote of DEMO_QUOTES) {
    const event = DEMO_EVENTS[quote.eventIndex]
    const clientId = clientIds[event.clientIndex]
    const eventId = eventIds[quote.eventIndex]
    await ensureQuote(admin, tenantId, clientId, eventId, quote)
    console.log(
      `  ✓ ${event.occasion} - $${(quote.total_cents / 100).toFixed(0)} (${quote.status})`
    )
  }

  // ── 7. Ledger Entries ───────────────────────────────────────────────────
  console.log(`\n[demo-load] Seeding ${DEMO_LEDGER_ENTRIES.length} ledger entries...`)
  for (const entry of DEMO_LEDGER_ENTRIES) {
    const event = DEMO_EVENTS[entry.eventIndex]
    const clientId = clientIds[event.clientIndex]
    const eventId = eventIds[entry.eventIndex]
    await ensureLedgerEntry(admin, tenantId, clientId, eventId, entry)
    console.log(`  ✓ ${entry.description}`)
  }

  // ── 8. Expenses ─────────────────────────────────────────────────────────
  console.log(`\n[demo-load] Seeding ${DEMO_EXPENSES.length} expenses...`)
  for (const expense of DEMO_EXPENSES) {
    const eventId = expense.eventIndex !== null ? eventIds[expense.eventIndex] : null
    await ensureExpense(admin, tenantId, eventId, expense)
    console.log(`  ✓ ${expense.description}`)
  }

  // ── 9. Calendar Availability ────────────────────────────────────────────
  console.log(`\n[demo-load] Seeding ${DEMO_CALENDAR_ENTRIES.length} calendar entries...`)
  for (const entry of DEMO_CALENDAR_ENTRIES) {
    await ensureCalendarEntry(admin, chefId, entry)
    console.log(`  ✓ +${entry.daysOut} days: ${entry.public_note}`)
  }

  // ── 10. Loyalty Config ────────────────────────────────────────────────
  console.log(`\n[demo-load] Setting up loyalty program...`)
  await ensureLoyaltyConfig(admin, tenantId, DEMO_LOYALTY_CONFIG)
  console.log(`  ✓ Loyalty program configured`)

  // ── 11. Loyalty Transactions ──────────────────────────────────────────
  console.log(`\n[demo-load] Seeding ${DEMO_LOYALTY_TRANSACTIONS.length} loyalty transactions...`)
  for (const tx of DEMO_LOYALTY_TRANSACTIONS) {
    const cId = clientIds[tx.clientIndex]
    const eId = tx.eventIndex !== null ? eventIds[tx.eventIndex] : null
    await ensureLoyaltyTransaction(admin, tenantId, cId, {
      type: tx.type,
      points: tx.points,
      description: tx.description,
      eventId: eId,
      daysAgo: tx.daysAgo,
    })
    console.log(`  ✓ ${tx.description} (${tx.points > 0 ? '+' : ''}${tx.points})`)
  }

  // ── 12. Client Loyalty State ──────────────────────────────────────────
  console.log(`\n[demo-load] Updating ${DEMO_CLIENT_LOYALTY.length} client loyalty tiers...`)
  for (const cl of DEMO_CLIENT_LOYALTY) {
    await updateClientLoyalty(admin, clientIds[cl.clientIndex], cl)
    const clientName = DEMO_CLIENTS[cl.clientIndex].full_name
    console.log(`  ✓ ${clientName}: ${cl.loyalty_tier} (${cl.loyalty_points} pts)`)
  }

  // ── 13. Staff Assignments ─────────────────────────────────────────────
  let staffMemberId: string | null = null
  try {
    const staffCreds = JSON.parse(readFileSync('.auth/demo-staff.json', 'utf-8'))
    staffMemberId = staffCreds.staffMemberId
  } catch {
    console.warn(`\n[demo-load] .auth/demo-staff.json not found, skipping staff assignments`)
  }

  if (staffMemberId) {
    console.log(`\n[demo-load] Seeding ${DEMO_STAFF_ASSIGNMENTS.length} staff assignments...`)
    for (const assignment of DEMO_STAFF_ASSIGNMENTS) {
      const eId = eventIds[assignment.eventIndex]
      const eventName = DEMO_EVENTS[assignment.eventIndex].occasion
      await ensureStaffAssignment(admin, chefId, staffMemberId, eId, assignment)
      console.log(`  ✓ ${eventName} (${assignment.status})`)
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('')
  console.log('=== Demo Data Loaded ===')
  console.log(`  Clients:              ${DEMO_CLIENTS.length}`)
  console.log(`  Events:               ${DEMO_EVENTS.length}`)
  console.log(`  Inquiries:            ${DEMO_INQUIRIES.length}`)
  console.log(`  Menus:                ${DEMO_MENUS.length}`)
  console.log(`  Recipes:              ${DEMO_RECIPES.length}`)
  console.log(`  Quotes:               ${DEMO_QUOTES.length}`)
  console.log(`  Ledger Entries:       ${DEMO_LEDGER_ENTRIES.length}`)
  console.log(`  Expenses:             ${DEMO_EXPENSES.length}`)
  console.log(`  Calendar Entries:     ${DEMO_CALENDAR_ENTRIES.length}`)
  console.log(`  Loyalty Transactions: ${DEMO_LOYALTY_TRANSACTIONS.length}`)
  console.log(`  Staff Assignments:    ${DEMO_STAFF_ASSIGNMENTS.length}`)
  console.log('')
  console.log('  Demo panel: /demo (requires DEMO_MODE_ENABLED=true)')
  console.log('  Public profile: /chef/chef-demo-showcase')
}

main().catch((err) => {
  console.error('[demo-load] FAILED:', err.message)
  process.exit(1)
})
