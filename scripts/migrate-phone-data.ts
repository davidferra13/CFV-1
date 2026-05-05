/**
 * Migrate Legacy Phone Data
 *
 * Moves phone numbers from chefs.phone and clients.phone columns
 * into the new phone_numbers table with proper E.164 normalization.
 *
 * Usage:
 *   npx tsx scripts/migrate-phone-data.ts
 *
 * Idempotent: safe to run multiple times (skips existing entries).
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import pg from 'postgres'
import { normalizePhone } from '../lib/phone/normalize'

const pgClient = pg(
  process.env.DATABASE_URL ||
    process.env.NEXT_PUBLIC_DB_URL ||
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
)

interface PhoneRow {
  id: string
  phone: string
}

async function migrate() {
  const sql = pgClient

  // 1. Query chefs with non-null phone
  const chefsWithPhone: PhoneRow[] = await sql`
    SELECT id, phone FROM chefs WHERE phone IS NOT NULL AND phone != ''
  `
  console.log(`Found ${chefsWithPhone.length} chefs with phone numbers`)

  // 2. Query clients with non-null phone
  const clientsWithPhone: PhoneRow[] = await sql`
    SELECT id, phone FROM clients WHERE phone IS NOT NULL AND phone != ''
  `
  console.log(`Found ${clientsWithPhone.length} clients with phone numbers`)

  let chefsMigrated = 0
  let clientsMigrated = 0
  let skipped = 0
  let alreadyExisted = 0

  // 3. Process all in a single transaction
  await sql.begin(async (tx) => {
    // Process chefs
    for (const chef of chefsWithPhone) {
      const normalized = normalizePhone(chef.phone)
      if (!normalized) {
        console.warn(`  SKIP chef ${chef.id}: could not normalize "${chef.phone}"`)
        skipped++
        continue
      }

      const existing = await tx`
        SELECT id FROM phone_numbers
        WHERE entity_type = 'chef'
          AND entity_id = ${chef.id}
          AND phone_e164 = ${normalized.e164}
        LIMIT 1
      `

      if (existing.length > 0) {
        alreadyExisted++
        continue
      }

      await tx`
        INSERT INTO phone_numbers (
          entity_type, entity_id, phone_e164, phone_display,
          label, type, can_text, verified
        ) VALUES (
          'chef', ${chef.id}, ${normalized.e164}, ${normalized.display},
          'mobile', 'primary', ${normalized.canText}, false
        )
      `
      chefsMigrated++
    }

    // Process clients
    for (const client of clientsWithPhone) {
      const normalized = normalizePhone(client.phone)
      if (!normalized) {
        console.warn(`  SKIP client ${client.id}: could not normalize "${client.phone}"`)
        skipped++
        continue
      }

      const existing = await tx`
        SELECT id FROM phone_numbers
        WHERE entity_type = 'client'
          AND entity_id = ${client.id}
          AND phone_e164 = ${normalized.e164}
        LIMIT 1
      `

      if (existing.length > 0) {
        alreadyExisted++
        continue
      }

      await tx`
        INSERT INTO phone_numbers (
          entity_type, entity_id, phone_e164, phone_display,
          label, type, can_text, verified
        ) VALUES (
          'client', ${client.id}, ${normalized.e164}, ${normalized.display},
          'mobile', 'primary', ${normalized.canText}, false
        )
      `
      clientsMigrated++
    }
  })

  // 4. Summary
  console.log('\n--- Migration Summary ---')
  console.log(`  Chefs migrated:    ${chefsMigrated}`)
  console.log(`  Clients migrated:  ${clientsMigrated}`)
  console.log(`  Skipped (invalid): ${skipped}`)
  console.log(`  Already existed:   ${alreadyExisted}`)
  console.log(`  Total processed:   ${chefsMigrated + clientsMigrated + skipped + alreadyExisted}`)

  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
