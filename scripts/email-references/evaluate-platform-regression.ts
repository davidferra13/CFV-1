/**
 * Evaluate current platform parsers against generated regression fixtures.
 *
 * Run:
 *   npx tsx scripts/email-references/evaluate-platform-regression.ts
 */

import { readFileSync } from 'fs'
import path from 'path'
import type { ParsedEmail } from '../../lib/google/types.ts'

type Fixture = {
  source_file: string
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
  generated_at: string
  source: { input_root: string; records: number }
  fixtures: Fixture[]
}

let takeAChefParser: any
let yhangryParser: any

function resolveFixturePath() {
  return path.resolve(
    process.cwd(),
    'data/email-references/generated/privatechefmanager-yhangry/regression-fixtures.json'
  )
}

function parseArgs() {
  const args = process.argv.slice(2)
  const strict = args.includes('--strict')
  return { strict }
}

function inferPlatform(fromEmail: string): 'takeachef' | 'yhangry' | 'unknown' {
  if (takeAChefParser.isTakeAChefEmail(fromEmail)) return 'takeachef'
  if (yhangryParser.isYhangryEmail(fromEmail)) return 'yhangry'
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

function sameStringSet(a: string[], b: string[]) {
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

function main() {
  // tsx in this repo can expose different ESM wrappers per entrypoint.
  // Dynamic import + fallback avoids named-export resolution issues.
  const tacLoader = import('../../lib/gmail/take-a-chef-parser')
  const yhLoader = import('../../lib/gmail/yhangry-parser')
  return Promise.all([tacLoader, yhLoader]).then(([tacRaw, yhRaw]) => {
    takeAChefParser = tacRaw as any
    yhangryParser = yhRaw as any

    if (
      typeof takeAChefParser?.isTakeAChefEmail !== 'function' ||
      typeof takeAChefParser?.parseTakeAChefEmail !== 'function'
    ) {
      throw new Error('Failed to load TakeAChef parser module')
    }
    if (
      typeof yhangryParser?.isYhangryEmail !== 'function' ||
      typeof yhangryParser?.parseYhangryEmail !== 'function'
    ) {
      throw new Error('Failed to load Yhangry parser module')
    }

    const { strict } = parseArgs()
    const fixturePath = resolveFixturePath()
    const doc = JSON.parse(readFileSync(fixturePath, 'utf-8')) as FixtureDoc

    let platformMatches = 0
    let emailTypeMatches = 0
    let dinnerMatches = 0
    let dedupeMatches = 0
    const mismatches: Array<{
      message_id: string
      expected: { platform: string; email_type: string; dinner: boolean; dedupe_keys: string[] }
      actual: { platform: string; email_type: string; dinner: boolean; dedupe_keys: string[] }
      subject: string
      from_email: string
    }> = []

    for (const f of doc.fixtures) {
      const email = asEmail(f)
      const platform = inferPlatform(email.from.email)
      let emailType = 'unknown'
      let parsed: any = null
      if (platform === 'takeachef') {
        parsed = takeAChefParser.parseTakeAChefEmail(email)
        emailType = parsed.emailType
      } else if (platform === 'yhangry') {
        parsed = yhangryParser.parseYhangryEmail(email)
        emailType = parsed.emailType
      }

      const dinner = dinnerFromType(platform, emailType)
      const keys = dedupeKeys(platform, parsed)

      const pMatch = platform === f.platform
      const tMatch = emailType === f.email_type
      const dMatch = dinner === f.dinner_opportunity
      const kMatch = sameStringSet(keys, f.dedupe_keys || [])

      if (pMatch) platformMatches++
      if (tMatch) emailTypeMatches++
      if (dMatch) dinnerMatches++
      if (kMatch) dedupeMatches++

      if (!(pMatch && tMatch && dMatch && kMatch)) {
        mismatches.push({
          message_id: f.message_id,
          expected: {
            platform: f.platform,
            email_type: f.email_type,
            dinner: f.dinner_opportunity,
            dedupe_keys: f.dedupe_keys || [],
          },
          actual: {
            platform,
            email_type: emailType,
            dinner,
            dedupe_keys: keys,
          },
          subject: f.subject,
          from_email: f.from_email,
        })
      }
    }

    const total = doc.fixtures.length
    const pct = (n: number) => `${((n / total) * 100).toFixed(2)}%`
    console.log('Platform Parser Regression Evaluation')
    console.log(`Fixtures: ${total}`)
    console.log(`Platform accuracy: ${platformMatches}/${total} (${pct(platformMatches)})`)
    console.log(`Email type accuracy: ${emailTypeMatches}/${total} (${pct(emailTypeMatches)})`)
    console.log(`Dinner flag accuracy: ${dinnerMatches}/${total} (${pct(dinnerMatches)})`)
    console.log(`Dedupe key-set accuracy: ${dedupeMatches}/${total} (${pct(dedupeMatches)})`)
    console.log(`Mismatches: ${mismatches.length}`)

    if (mismatches.length > 0) {
      console.log('\nTop mismatches:')
      for (const m of mismatches.slice(0, 20)) {
        console.log(`- ${m.message_id}`)
        console.log(`  from: ${m.from_email}`)
        console.log(`  subject: ${m.subject}`)
        console.log(
          `  expected: platform=${m.expected.platform} type=${m.expected.email_type} dinner=${m.expected.dinner}`
        )
        console.log(
          `  actual:   platform=${m.actual.platform} type=${m.actual.email_type} dinner=${m.actual.dinner}`
        )
      }
    }

    if (strict && mismatches.length > 0) {
      process.exit(1)
    }
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
