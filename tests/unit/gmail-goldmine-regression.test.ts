import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

type GoldmineFixture = {
  message_id: string
  thread_id: string
  from_email: string
  from_name: string
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

// ─── Classification logic (mirrors build-goldmine-reference.ts) ──────────

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

// ─── Tests ───────────────────────────────────────────────────────────────

function fixturePath() {
  return path.resolve(
    process.cwd(),
    'tests/fixtures/email-references/goldmine-regression-fixtures.json'
  )
}

describe('GOLDMINE email classification regression fixtures', () => {
  const p = fixturePath()

  it('fixture file exists', () => {
    assert.ok(existsSync(p), `Fixture missing at ${p}`)
  })

  it('sender-based classification matches all fixtures', () => {
    if (!existsSync(p)) return
    const doc = JSON.parse(readFileSync(p, 'utf-8')) as FixtureDoc
    const mismatches: string[] = []

    for (const f of doc.fixtures) {
      const { category } = classifySender(f.from_email)
      // Only check emails where sender classification is deterministic
      if (!category) continue
      if (category !== f.expected_category) {
        mismatches.push(`${f.from_email}: expected=${f.expected_category} got=${category}`)
      }
    }

    assert.equal(
      mismatches.length,
      0,
      `Sender classification regressions:\n${mismatches.slice(0, 20).join('\n')}`
    )
  })

  it('partner detection matches all fixtures', () => {
    if (!existsSync(p)) return
    const doc = JSON.parse(readFileSync(p, 'utf-8')) as FixtureDoc
    const mismatches: string[] = []

    for (const f of doc.fixtures) {
      if (!f.partner_source) continue
      const { partnerSource } = classifySender(f.from_email)
      if (partnerSource !== f.partner_source) {
        mismatches.push(`${f.from_email}: expected=${f.partner_source} got=${partnerSource}`)
      }
    }

    assert.equal(
      mismatches.length,
      0,
      `Partner detection regressions:\n${mismatches.slice(0, 20).join('\n')}`
    )
  })

  it('all categories have expected distribution', () => {
    if (!existsSync(p)) return
    const doc = JSON.parse(readFileSync(p, 'utf-8')) as FixtureDoc
    const counts: Record<string, number> = {}

    for (const f of doc.fixtures) {
      counts[f.expected_category] = (counts[f.expected_category] || 0) + 1
    }

    assert.deepEqual(counts, {
      outbound: 1,
      direct_first_contact: 1,
      direct_followup: 1,
      partner_ember: 1,
      wix_form: 1,
      platform_takeachef: 1,
      bounce: 1,
    })
  })

  it('first-contact emails are tagged correctly per thread', () => {
    if (!existsSync(p)) return
    const doc = JSON.parse(readFileSync(p, 'utf-8')) as FixtureDoc

    // Group by thread
    const threads = new Map<string, GoldmineFixture[]>()
    for (const f of doc.fixtures) {
      if (!threads.has(f.thread_id)) threads.set(f.thread_id, [])
      threads.get(f.thread_id)!.push(f)
    }

    // Each thread should have at most one first-contact (excluding outbound-only threads)
    for (const [threadId, msgs] of threads) {
      const firstContacts = msgs.filter((m) => m.is_first_contact)
      const hasNonOutbound = msgs.some((m) => m.expected_category !== 'outbound')

      if (hasNonOutbound) {
        assert.ok(
          firstContacts.length <= 1,
          `Thread ${threadId} has ${firstContacts.length} first contacts (expected 0 or 1)`
        )
      }
    }
  })
})
