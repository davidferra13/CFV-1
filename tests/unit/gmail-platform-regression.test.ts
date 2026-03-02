import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { isTakeAChefEmail, parseTakeAChefEmail } from '../../lib/gmail/take-a-chef-parser'
import { isYhangryEmail, parseYhangryEmail } from '../../lib/gmail/yhangry-parser'
import type { ParsedEmail } from '../../lib/google/types'

type Fixture = {
  message_id: string
  from_email: string
  from_name: string
  subject: string
  body: string
  platform: 'takeachef' | 'yhangry' | 'unknown'
  email_type: string
  dinner_opportunity: boolean
  dedupe_keys: string[]
}

type FixtureDoc = {
  fixtures: Fixture[]
}

function fixturePath() {
  return path.resolve(
    process.cwd(),
    'data/email-references/generated/privatechefmanager-yhangry/regression-fixtures.json'
  )
}

function inferPlatform(fromEmail: string): 'takeachef' | 'yhangry' | 'unknown' {
  if (isTakeAChefEmail(fromEmail)) return 'takeachef'
  if (isYhangryEmail(fromEmail)) return 'yhangry'
  return 'unknown'
}

function dinnerFromType(platform: 'takeachef' | 'yhangry' | 'unknown', emailType: string): boolean {
  if (platform === 'takeachef') {
    return [
      'tac_new_inquiry',
      'tac_client_message',
      'tac_booking_confirmed',
      'tac_customer_info',
    ].includes(emailType)
  }
  if (platform === 'yhangry') {
    return ['yhangry_new_inquiry', 'yhangry_client_message', 'yhangry_booking_confirmed'].includes(
      emailType
    )
  }
  return false
}

function dedupeKeys(platform: 'takeachef' | 'yhangry' | 'unknown', parsed: any): string[] {
  if (!parsed) return []
  const out: string[] = []
  if (platform === 'takeachef') {
    if (parsed.inquiry?.ctaLink) out.push(`cta:${parsed.inquiry.ctaLink}`)
    if (parsed.booking?.orderId) out.push(`order:${parsed.booking.orderId}`)
    if (parsed.booking?.ctaLink) out.push(`cta:${parsed.booking.ctaLink}`)
    if (parsed.customerInfo?.ctaLink) out.push(`cta:${parsed.customerInfo.ctaLink}`)
    if (parsed.message?.ctaLink) out.push(`cta:${parsed.message.ctaLink}`)
  } else if (platform === 'yhangry') {
    if (parsed.inquiry?.quoteId) out.push(`quote:${parsed.inquiry.quoteId}`)
    if (parsed.inquiry?.quoteUrl) out.push(`quote_url:${parsed.inquiry.quoteUrl}`)
    if (parsed.booking?.quoteId) out.push(`quote:${parsed.booking.quoteId}`)
    if (parsed.booking?.quoteUrl) out.push(`quote_url:${parsed.booking.quoteUrl}`)
    if (parsed.message?.quoteId) out.push(`quote:${parsed.message.quoteId}`)
    if (parsed.message?.quoteUrl) out.push(`quote_url:${parsed.message.quoteUrl}`)
  }
  return Array.from(new Set(out))
}

function sameSet(a: string[], b: string[]) {
  const sa = new Set(a)
  const sb = new Set(b)
  if (sa.size !== sb.size) return false
  for (const x of sa) if (!sb.has(x)) return false
  return true
}

function asEmail(f: Fixture): ParsedEmail {
  return {
    messageId: f.message_id,
    threadId: f.message_id,
    from: { name: f.from_name ?? '', email: f.from_email ?? '' },
    to: '',
    subject: f.subject ?? '',
    body: f.body ?? '',
    date: '',
    snippet: (f.body ?? '').slice(0, 180),
    labelIds: [],
    listUnsubscribe: '',
    precedence: '',
  }
}

describe('Gmail platform parser regression fixtures', () => {
  const p = fixturePath()

  it('fixture file exists', () => {
    assert.ok(existsSync(p), `Fixture missing at ${p}. Run: npm run email:build:private-reference`)
  })

  it('all fixtures match parser outputs', () => {
    if (!existsSync(p)) return
    const doc = JSON.parse(readFileSync(p, 'utf-8')) as FixtureDoc
    const mismatches: string[] = []

    for (const f of doc.fixtures) {
      const email = asEmail(f)
      const platform = inferPlatform(email.from.email)
      let emailType = 'unknown'
      let parsed: any = null

      if (platform === 'takeachef') {
        parsed = parseTakeAChefEmail(email)
        emailType = parsed.emailType
      } else if (platform === 'yhangry') {
        parsed = parseYhangryEmail(email)
        emailType = parsed.emailType
      }

      const dinner = dinnerFromType(platform, emailType)
      const keys = dedupeKeys(platform, parsed)

      const ok =
        platform === f.platform &&
        emailType === f.email_type &&
        dinner === f.dinner_opportunity &&
        sameSet(keys, f.dedupe_keys || [])

      if (!ok) {
        mismatches.push(
          `${f.message_id} expected(${f.platform},${f.email_type},dinner=${f.dinner_opportunity}) got(${platform},${emailType},dinner=${dinner})`
        )
      }
    }

    assert.equal(
      mismatches.length,
      0,
      `Parser regressions detected:\n${mismatches.slice(0, 20).join('\n')}`
    )
  })
})
