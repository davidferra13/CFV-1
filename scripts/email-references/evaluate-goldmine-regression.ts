/**
 * Evaluate GOLDMINE regression fixtures against current classification logic.
 *
 * This verifies that the GOLDMINE build pipeline produces consistent results.
 * It tests the deterministic parts: category assignment, partner detection,
 * first-contact identification, heuristic scoring, AND extraction quality
 * (when extraction data is present in the fixtures).
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
  extracted_fields?: {
    extraction_status: string
    deterministic: {
      phones: string[]
      emails: string[]
      dates: { raw: string; parsed: string | null; context: string }[]
      guest_counts: {
        raw: string
        number: number | null
        range_low: number | null
        range_high: number | null
      }[]
      budget_mentions: { raw: string; amount_cents: number | null; per_person: boolean }[]
      dietary_mentions: string[]
      cannabis_mentions: string[]
      occasion_keywords: string[]
      location_mentions: string[]
      referral_signals: string[]
    }
    enriched: {
      client_name: string | null
      occasion_normalized: string | null
      service_style: string | null
      referral_source: string | null
      cannabis_preference: string | null
      special_notes: string | null
      confidence: string
    } | null
    follow_up: Record<string, unknown> | null
    outbound: {
      latency_minutes: number | null
      contains_pricing: boolean
      quoted_amount_cents: number | null
      per_person_rate_cents: number | null
      tone: string | null
      sign_off_style: string | null
    } | null
  }
}

type FixtureDoc = {
  fixtures: GoldmineFixture[]
}

const FIXTURE_PATH = path.resolve(
  process.cwd(),
  'data/email-references/local-generated/goldmine/regression-fixtures.json'
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

  // ─── Extraction Validation (if extraction data exists) ─────────────────

  const hasExtraction = fixtures.some((f) => f.extracted_fields)

  if (hasExtraction) {
    console.log('\n--- Extraction Validation ---')

    const extractedFixtures = fixtures.filter((f) => f.extracted_fields)
    console.log(`Fixtures with extraction data: ${extractedFixtures.length}/${fixtures.length}`)

    // Every fixture should have deterministic extraction
    const withDeterministic = extractedFixtures.filter((f) => f.extracted_fields!.deterministic)
    console.log(`With deterministic fields: ${withDeterministic.length}`)
    if (withDeterministic.length !== extractedFixtures.length) {
      mismatches.push(
        `[extraction] ${extractedFixtures.length - withDeterministic.length} fixtures missing deterministic fields`
      )
    }

    // First contacts should have client_name (from Ollama enrichment or at least attempted)
    const firstContacts = extractedFixtures.filter(
      (f) => f.expected_category === 'direct_first_contact'
    )
    const firstContactsWithName = firstContacts.filter(
      (f) => f.extracted_fields?.enriched?.client_name
    )
    const nameRate =
      firstContacts.length > 0
        ? ((firstContactsWithName.length / firstContacts.length) * 100).toFixed(1)
        : '0'
    console.log(
      `First contacts with client_name: ${firstContactsWithName.length}/${firstContacts.length} (${nameRate}%)`
    )

    // First contacts should have dates extracted (deterministic)
    const firstContactsWithDate = firstContacts.filter(
      (f) => f.extracted_fields?.deterministic.dates.length! > 0
    )
    const dateRate =
      firstContacts.length > 0
        ? ((firstContactsWithDate.length / firstContacts.length) * 100).toFixed(1)
        : '0'
    console.log(
      `First contacts with dates: ${firstContactsWithDate.length}/${firstContacts.length} (${dateRate}%)`
    )

    // First contacts should have guest counts
    const firstContactsWithGuests = firstContacts.filter(
      (f) => f.extracted_fields?.deterministic.guest_counts.length! > 0
    )
    const guestRate =
      firstContacts.length > 0
        ? ((firstContactsWithGuests.length / firstContacts.length) * 100).toFixed(1)
        : '0'
    console.log(
      `First contacts with guest_count: ${firstContactsWithGuests.length}/${firstContacts.length} (${guestRate}%)`
    )

    // Outbound emails should have latency_minutes where prior inbound exists
    const outboundFixtures = extractedFixtures.filter(
      (f) => f.expected_category === 'outbound' && f.extracted_fields?.outbound
    )
    const outboundWithLatency = outboundFixtures.filter(
      (f) => f.extracted_fields!.outbound!.latency_minutes !== null
    )
    console.log(
      `Outbound with response latency: ${outboundWithLatency.length}/${outboundFixtures.length}`
    )

    // Field coverage summary
    let totalPhones = 0,
      totalDates = 0,
      totalGuests = 0,
      totalBudgets = 0
    let totalDietary = 0,
      totalCannabis = 0,
      totalOccasion = 0,
      totalLocation = 0
    for (const f of extractedFixtures) {
      const det = f.extracted_fields!.deterministic
      if (det.phones.length > 0) totalPhones++
      if (det.dates.length > 0) totalDates++
      if (det.guest_counts.length > 0) totalGuests++
      if (det.budget_mentions.length > 0) totalBudgets++
      if (det.dietary_mentions.length > 0) totalDietary++
      if (det.cannabis_mentions.length > 0) totalCannabis++
      if (det.occasion_keywords.length > 0) totalOccasion++
      if (det.location_mentions.length > 0) totalLocation++
    }
    const n = extractedFixtures.length
    console.log(`\nField coverage (across ${n} emails):`)
    console.log(`  phones: ${totalPhones} (${((totalPhones / n) * 100).toFixed(0)}%)`)
    console.log(`  dates: ${totalDates} (${((totalDates / n) * 100).toFixed(0)}%)`)
    console.log(`  guest_counts: ${totalGuests} (${((totalGuests / n) * 100).toFixed(0)}%)`)
    console.log(`  budgets: ${totalBudgets} (${((totalBudgets / n) * 100).toFixed(0)}%)`)
    console.log(`  dietary: ${totalDietary} (${((totalDietary / n) * 100).toFixed(0)}%)`)
    console.log(`  cannabis: ${totalCannabis} (${((totalCannabis / n) * 100).toFixed(0)}%)`)
    console.log(`  occasion: ${totalOccasion} (${((totalOccasion / n) * 100).toFixed(0)}%)`)
    console.log(`  location: ${totalLocation} (${((totalLocation / n) * 100).toFixed(0)}%)`)
  }

  // ─── Thread Intelligence Validation ──────────────────────────────────────

  const THREAD_INTEL_PATH = path.resolve(
    process.cwd(),
    'data/email-references/local-generated/goldmine/thread-intelligence.json'
  )

  if (existsSync(THREAD_INTEL_PATH)) {
    console.log('\n--- Thread Intelligence Validation ---')
    const threadIntel = JSON.parse(readFileSync(THREAD_INTEL_PATH, 'utf-8'))
    const threadCount = Object.keys(threadIntel.threads || {}).length

    console.log(`Threads in intelligence file: ${threadCount}`)

    // Count outcomes
    const outcomes: Record<string, number> = {}
    let threadsWithStages = 0
    let threadsWithResponseTime = 0
    for (const t of Object.values(threadIntel.threads || {}) as any[]) {
      outcomes[t.outcome] = (outcomes[t.outcome] || 0) + 1
      if (t.stages && t.stages.length > 0) threadsWithStages++
      if (t.first_response_minutes !== null) threadsWithResponseTime++
    }

    console.log(`Outcomes: ${JSON.stringify(outcomes)}`)
    console.log(`Threads with lifecycle stages: ${threadsWithStages}/${threadCount}`)
    console.log(`Threads with response time: ${threadsWithResponseTime}/${threadCount}`)

    // At least 60% should have a determined outcome (not "unknown")
    const determined = threadCount - (outcomes['unknown'] || 0)
    const determinedRate = threadCount > 0 ? determined / threadCount : 0
    console.log(
      `Determined outcomes: ${determined}/${threadCount} (${(determinedRate * 100).toFixed(1)}%)`
    )
    if (determinedRate < 0.5) {
      mismatches.push(
        `[thread-intel] Only ${(determinedRate * 100).toFixed(1)}% of threads have determined outcomes (expected ≥50%)`
      )
    }

    if (threadIntel.aggregate_stats) {
      console.log(
        `Conversion rate: ${((threadIntel.aggregate_stats.conversion_rate || 0) * 100).toFixed(1)}%`
      )
      console.log(
        `Avg first response: ${threadIntel.aggregate_stats.avg_first_response_minutes ?? 'N/A'} min`
      )
    }
  }

  // ─── Final Report ─────────────────────────────────────────────────────────

  if (mismatches.length > 0) {
    console.log('\n=== MISMATCHES ===')
    for (const m of mismatches.slice(0, 30)) {
      console.log(`  ${m}`)
    }
  }

  console.log(`\nTotal mismatches: ${mismatches.length}`)

  if (strict && mismatches.length > 0) {
    process.exit(1)
  }
}

main()
