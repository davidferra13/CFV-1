// @ts-nocheck
// CLI entry point for E2E remote seed
// Usage: npm run seed:e2e
//
// This script seeds comprehensive test data against the remote database.
// Requires DATABASE_E2E_ALLOW_REMOTE=true in .env.local as an explicit opt-in.
// All test data is namespaced under *@chefflow.test emails.

import { mkdirSync, writeFileSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const { seedE2EData, getIsolationSuffix } = await import('../tests/helpers/e2e-seed')

  mkdirSync('.auth', { recursive: true })

  const result = await seedE2EData()

  writeFileSync('.auth/seed-ids.json', JSON.stringify(result, null, 2), 'utf-8')

  const suffix = getIsolationSuffix()

  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║            E2E Seed Complete                      ║')
  console.log('╠══════════════════════════════════════════════════╣')
  console.log(`║  Suffix:  ${suffix.padEnd(38)}║`)
  console.log('╠══════════════════════════════════════════════════╣')
  console.log(`║  Chef:         ${result.chefEmail.padEnd(33)}║`)
  console.log(`║  Chef pass:    ${result.chefPassword.padEnd(33)}║`)
  console.log(`║  Chef B:       ${result.chefBEmail.padEnd(33)}║`)
  console.log(`║  Chef B pass:  ${result.chefBPassword.padEnd(33)}║`)
  console.log(`║  Client:       ${result.clientEmail.padEnd(33)}║`)
  console.log(`║  Client pass:  ${result.clientPassword.padEnd(33)}║`)
  console.log(`║  Staff:        ${result.staffEmail.padEnd(33)}║`)
  console.log(`║  Staff pass:   ${result.staffPassword.padEnd(33)}║`)
  console.log(`║  Staff PIN:    ${result.staffKioskPin.padEnd(33)}║`)
  console.log(`║  Partner:      ${result.partnerEmail.padEnd(33)}║`)
  console.log(`║  Partner pass: ${result.partnerPassword.padEnd(33)}║`)
  console.log('╠══════════════════════════════════════════════════╣')
  console.log(`║  Chef profile: /chef/${result.chefSlug.padEnd(28)}║`)
  console.log(`║  IDs written:  .auth/seed-ids.json                ║`)
  console.log('╠══════════════════════════════════════════════════╣')
  console.log('║  Run tests:    npm run test:e2e:full              ║')
  console.log('║  Cleanup:      npm run cleanup:e2e                ║')
  console.log('║  Logins:       Mission Control → Logins tab       ║')
  console.log('╚══════════════════════════════════════════════════╝\n')
}

main().catch((err) => {
  console.error('[seed:e2e] Fatal error:', err)
  process.exit(1)
})
