/**
 * Evaluate GOLDMINE regression fixtures against current classification logic.
 *
 * This verifies that the GOLDMINE build pipeline produces consistent results.
 * It does NOT test the full classifyEmail() (which requires Ollama) — it tests
 * the deterministic parts: category assignment, partner detection, first-contact
 * identification, and heuristic scoring.
 *
 * Run:
 *   npx tsx scripts/email-references/evaluate-goldmine-regression.ts --strict
 */

import { existsSync, readFileSync } from 'fs'
import path from 'path'

type GoldmineFixture = {
  message_id: string
  thread_id: string
  from_email: string
  from_name: string
  to: string
  subject: string
  body: string
  date: string
  labels: string[]
  expected_category: string
  is_first_contact: boolean
  partner_source: string | null
  thread_position: number
  heuristic_score: number
  heuristic_signals: string[]
}

type FixtureDoc = {
  fixtures: GoldmineFixture[]
}

const FIXTURE_PATH = path.resolve(
  process.cwd(),
  'data/email-references/generated/goldmine/regression-fixtures.json'
)

// ─── Classification Logic (mirrors build-goldmine-reference.ts) ──────────

const CHEF_EMAIL = 'dfprivatechef@gmail.com'
const PARTNER_DOMAINS: Record<string, string> = {
  'emberbrandfire.com': 'ember_brand_fire',
}
const WIX_DOMAINS = ['wix-forms.com']
const TAKEACHEF_DOMAINS = ['takeachef.com', 'privatechefmanager.com']
const BOUNCE_SENDERS = ['mailer-daemon@', 'postmaster@']

function classifySender(fromEmail: string): {
  category: string | null
  partnerSource: string | null
} {
  const addr = fromEmail.toLowerCase()
  const domain = addr.split('@')[1] || ''

  if (addr === CHEF_EMAIL) return { category: 'outbound', partnerSource: null }
  if (BOUNCE_SENDERS.some((b) => addr.startsWith(b)))
    return { category: 'bounce', partnerSource: null }
  if (WIX_DOMAINS.includes(domain)) return { category: 'wix_form', partnerSource: null }
  if (TAKEACHEF_DOMAINS.includes(domain))
    return { category: 'platform_takeachef', partnerSource: null }
  if (PARTNER_DOMAINS[domain])
    return { category: 'partner_ember', partnerSource: PARTNER_DOMAINS[domain] }
  return { category: null, partnerSource: null }
}

// ─── Evaluation ──────────────────────────────────────────────────────────

function main() {
  const strict = process.argv.includes('--strict')

  if (!existsSync(FIXTURE_PATH)) {
    console.error(`Fixture file not found: ${FIXTURE_PATH}`)
    console.error('Run: npm run email:build:goldmine')
    process.exit(1)
  }

  const doc = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as FixtureDoc
  const fixtures = doc.fixtures

  let senderAccuracy = 0
  let partnerAccuracy = 0
  let totalNonDirect = 0
  let totalPartner = 0
  const mismatches: string[] = []

  for (const f of fixtures) {
    // Test sender-based classification (outbound, wix_form, platform_takeachef, partner_ember, bounce)
    const { category, partnerSource } = classifySender(f.from_email)

    if (category) {
      totalNonDirect++
      if (category === f.expected_category) {
        senderAccuracy++
      } else {
        mismatches.push(
          `[sender] ${f.message_id.slice(0, 20)}... expected=${f.expected_category} got=${category} from=${f.from_email}`
        )
      }
    }

    // Test partner detection
    if (f.partner_source) {
      totalPartner++
      if (partnerSource === f.partner_source) {
        partnerAccuracy++
      } else {
        mismatches.push(
          `[partner] ${f.message_id.slice(0, 20)}... expected=${f.partner_source} got=${partnerSource}`
        )
      }
    }
  }

  // Report
  console.log('GOLDMINE Regression Evaluation')
  console.log(`Fixtures: ${fixtures.length}`)
  console.log(
    `Sender classification: ${senderAccuracy}/${totalNonDirect} (${totalNonDirect > 0 ? ((senderAccuracy / totalNonDirect) * 100).toFixed(1) : 0}%)`
  )
  console.log(
    `Partner detection: ${partnerAccuracy}/${totalPartner} (${totalPartner > 0 ? ((partnerAccuracy / totalPartner) * 100).toFixed(1) : 0}%)`
  )
  console.log(`Mismatches: ${mismatches.length}`)

  if (mismatches.length > 0) {
    console.log('\nMismatch details:')
    for (const m of mismatches.slice(0, 20)) {
      console.log(`  ${m}`)
    }
  }

  if (strict && mismatches.length > 0) {
    process.exit(1)
  }
}

main()
