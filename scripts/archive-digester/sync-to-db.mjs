/**
 * Archive Digester - DB Sync
 *
 * Reads extracted-threads.json and writes to ChefFlow PostgreSQL:
 * - clients table: one row per unique client (by email)
 * - inquiries table: one row per thread
 *
 * Idempotent: skips existing clients by email, skips inquiries already imported.
 * All records are marked is_demo=false and tagged as archive imports.
 *
 * Usage: node scripts/archive-digester/sync-to-db.mjs [--dry-run]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '../../.env.local') })

const DRY_RUN = process.argv.includes('--dry-run')
const EXTRACTED_PATH = path.join(__dirname, 'extracted-threads.json')

// Developer's real chef account
const CHEF_ID = 'bd72cf97-a0e5-4fe4-b049-0706ac81d100'

// ----------------------------------------------------------------
// DB connection (use node-postgres directly)
// ----------------------------------------------------------------
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL, { max: 3 })

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null
  return email.toLowerCase().trim()
}

function parseBudgetCents(budgetUsd) {
  if (!budgetUsd) return null
  const n = parseFloat(String(budgetUsd).replace(/[^0-9.]/g, ''))
  if (isNaN(n) || n <= 0) return null
  return Math.round(n * 100)
}

function parseDate(dateStr) {
  if (!dateStr) return null
  // Try ISO format first
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) return d.toISOString()
  return null
}

function inferChannel(extracted, threadKey) {
  const key = threadKey.toLowerCase()
  const emailStr = (extracted.client_email || '').toLowerCase()
  if (key.includes('wix') || key.includes('submission')) return 'wix'
  if (key.includes('takeachef') || emailStr.includes('takeachef')) return 'take_a_chef'
  if (key.includes('airbnb') || key.includes('ember')) return 'other'
  return 'email'
}

function inferStatus(extractedStatus) {
  const s = (extractedStatus || '').toLowerCase()
  if (s === 'booked' || s === 'completed') return 'confirmed'
  if (s === 'declined') return 'declined'
  if (s === 'ghosted') return 'expired'
  return 'new'
}

// ----------------------------------------------------------------
// Main
// ----------------------------------------------------------------

const threads = JSON.parse(fs.readFileSync(EXTRACTED_PATH, 'utf8'))
const successful = threads.filter((t) => !t.extracted.error && t.extracted.client_email)

console.log(`Syncing ${successful.length} threads to DB${DRY_RUN ? ' (DRY RUN)' : ''}`)
console.log(`Chef ID: ${CHEF_ID}`)

let clientsCreated = 0
let clientsSkipped = 0
let inquiriesCreated = 0
let inquiriesSkipped = 0

for (const thread of successful) {
  const { extracted, dateRange, threadKey } = thread
  const email = normalizeEmail(extracted.client_email)
  if (!email || email.includes('takeachef') || email === 'dfprivatechef@gmail.com') {
    inquiriesSkipped++
    continue
  }

  // ---- CLIENT ----
  let clientId = null

  // Check if client already exists
  const existing = await sql`
    SELECT id FROM clients
    WHERE tenant_id = ${CHEF_ID} AND email = ${email}
    LIMIT 1
  `

  if (existing.length > 0) {
    clientId = existing[0].id
    clientsSkipped++
    console.log(`  [skip client] ${email} (already exists)`)
  } else {
    const name = extracted.client_name || ''
    const nameParts = name.split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    const fullName = name || email.split('@')[0]

    const dietary = extracted.dietary_restrictions?.length
      ? extracted.dietary_restrictions
      : []

    if (DRY_RUN) {
      console.log(`  [DRY] Would create client: ${fullName} <${email}>`)
      clientId = 'dry-run-id'
      clientsCreated++
    } else {
      const [created] = await sql`
        INSERT INTO clients (
          tenant_id, full_name, email,
          referral_source, dietary_restrictions,
          vibe_notes, status, is_demo
        ) VALUES (
          ${CHEF_ID},
          ${fullName},
          ${email},
          ${'email'},
          ${dietary},
          ${extracted.thread_summary || null},
          ${'active'},
          ${false}
        )
        ON CONFLICT (tenant_id, email) DO UPDATE SET updated_at = now()
        RETURNING id
      `
      clientId = created.id
      clientsCreated++
      console.log(`  [created client] ${fullName} <${email}>`)
    }
  }

  // ---- INQUIRY ----
  if (DRY_RUN) {
    const budgetCents = parseBudgetCents(extracted.budget_usd)
    const channel = inferChannel(extracted, threadKey)
    const status = inferStatus(extracted.status)
    const guestCount = extracted.guest_count ? parseInt(extracted.guest_count) : null
    console.log(`  [DRY] Would create inquiry: ${status} | ${channel} | ${budgetCents ? '$' + (budgetCents / 100) : 'no budget'} | ${guestCount || '?'} guests`)
    inquiriesCreated++
    continue
  }

  // Check if an inquiry for this client+thread already exists (by source_message prefix)
  const summaryKey = (extracted.thread_summary || threadKey).slice(0, 100)
  const existingInquiry = await sql`
    SELECT id FROM inquiries
    WHERE tenant_id = ${CHEF_ID}
      AND client_id = ${clientId}
      AND source_message ILIKE ${'%' + summaryKey.slice(0, 50) + '%'}
    LIMIT 1
  `

  if (existingInquiry.length > 0) {
    inquiriesSkipped++
    console.log(`  [skip inquiry] already exists`)
    continue
  }

  const budgetCents = parseBudgetCents(extracted.budget_usd)
  const confirmedDate = parseDate(extracted.event_date)
  const firstContact = parseDate(dateRange.first)
  const channel = inferChannel(extracted, threadKey)
  const status = inferStatus(extracted.status)
  const guestCount = extracted.guest_count ? parseInt(extracted.guest_count) : null

  const sourceMessage = [
    extracted.thread_summary,
    extracted.location ? `Location: ${extracted.location}` : null,
    extracted.menu_items?.length ? `Menu: ${extracted.menu_items.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  if (DRY_RUN) {
    console.log(`  [DRY] Would create inquiry: ${status} | ${channel} | ${budgetCents ? '$' + (budgetCents / 100) : 'no budget'} | ${guestCount || '?'} guests`)
    inquiriesCreated++
  } else {
    await sql`
      INSERT INTO inquiries (
        tenant_id, client_id, channel, status,
        source_message, confirmed_date, confirmed_guest_count,
        confirmed_location, confirmed_budget_cents,
        confirmed_occasion, confirmed_dietary_restrictions,
        first_contact_at, is_demo
      ) VALUES (
        ${CHEF_ID},
        ${clientId},
        ${channel},
        ${status},
        ${sourceMessage || null},
        ${confirmedDate},
        ${guestCount},
        ${extracted.location || null},
        ${budgetCents},
        ${extracted.occasion || null},
        ${extracted.dietary_restrictions?.length ? extracted.dietary_restrictions : []},
        ${firstContact},
        ${false}
      )
    `
    inquiriesCreated++
    console.log(`  [created inquiry] ${status} | ${channel}`)
  }
}

await sql.end()

console.log(`\nDone.`)
console.log(`  Clients: ${clientsCreated} created, ${clientsSkipped} skipped`)
console.log(`  Inquiries: ${inquiriesCreated} created, ${inquiriesSkipped} skipped`)
