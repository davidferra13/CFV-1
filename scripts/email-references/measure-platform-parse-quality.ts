/**
 * Parse quality report for private platform reference fixtures.
 *
 * Run:
 *   npx tsx scripts/email-references/measure-platform-parse-quality.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import type { ParsedEmail } from '../../lib/google/types.ts'

type Platform = 'takeachef' | 'yhangry' | 'unknown'

type Fixture = {
  message_id: string
  from_email: string
  from_name: string
  subject: string
  body: string
  platform: Platform
  email_type: string
}

type FixtureDoc = {
  generated_at: string
  source: { input_root: string; records: number }
  fixtures: Fixture[]
}

type FieldMetric = {
  field: string
  present: number
  missing: number
  present_rate: number
}

function fixturePath() {
  return path.resolve(
    process.cwd(),
    'data/email-references/generated/privatechefmanager-yhangry/regression-fixtures.json'
  )
}

function outputDir() {
  return path.resolve(process.cwd(), 'data/email-references/generated/privatechefmanager-yhangry')
}

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) return 0
  return Number(((numerator / denominator) * 100).toFixed(2))
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

function countPresence(values: Array<unknown>, field: string): FieldMetric {
  const present = values.filter((v) => {
    if (v === null || v === undefined) return false
    if (typeof v === 'string') return v.trim().length > 0
    return true
  }).length
  const total = values.length
  const missing = total - present
  return {
    field,
    present,
    missing,
    present_rate: pct(present, total),
  }
}

async function main() {
  const fixtureFile = fixturePath()
  const outDir = outputDir()

  const tacRaw = await import('../../lib/gmail/take-a-chef-parser.ts')
  const yhRaw = await import('../../lib/gmail/yhangry-parser.ts')
  const tac = tacRaw.default ?? tacRaw
  const yh = yhRaw.default ?? yhRaw

  if (
    typeof tac?.isTakeAChefEmail !== 'function' ||
    typeof tac?.parseTakeAChefEmail !== 'function' ||
    typeof yh?.isYhangryEmail !== 'function' ||
    typeof yh?.parseYhangryEmail !== 'function'
  ) {
    throw new Error('Failed to load parser modules for quality report')
  }

  const doc = JSON.parse(readFileSync(fixtureFile, 'utf-8')) as FixtureDoc

  const tacInquiryRows: any[] = []
  const yhInquiryRows: any[] = []

  for (const fixture of doc.fixtures) {
    const email = asEmail(fixture)

    if (tac.isTakeAChefEmail(email.from.email)) {
      const parsed = tac.parseTakeAChefEmail(email)
      if (parsed.emailType === 'tac_new_inquiry' && parsed.inquiry) {
        tacInquiryRows.push(parsed.inquiry)
      }
      continue
    }

    if (yh.isYhangryEmail(email.from.email)) {
      const parsed = yh.parseYhangryEmail(email)
      if (parsed.emailType === 'yhangry_new_inquiry' && parsed.inquiry) {
        yhInquiryRows.push(parsed.inquiry)
      }
    }
  }

  const tacMetrics: FieldMetric[] = [
    countPresence(
      tacInquiryRows.map((x) => x.clientName),
      'client_name'
    ),
    countPresence(
      tacInquiryRows.map((x) => x.eventDate),
      'event_date'
    ),
    countPresence(
      tacInquiryRows.map((x) => x.location),
      'location'
    ),
    countPresence(
      tacInquiryRows.map((x) => x.guestCountNumber),
      'guest_count'
    ),
    countPresence(
      tacInquiryRows.map((x) => x.ctaLink),
      'cta_link'
    ),
    countPresence(
      tacInquiryRows.map((x) => x.pricePerPersonRange),
      'price_per_person_range'
    ),
  ]

  const yhMetrics: FieldMetric[] = [
    countPresence(
      yhInquiryRows.map((x) => x.clientName),
      'client_name'
    ),
    countPresence(
      yhInquiryRows.map((x) => x.eventDate),
      'event_date'
    ),
    countPresence(
      yhInquiryRows.map((x) => x.location),
      'location'
    ),
    countPresence(
      yhInquiryRows.map((x) => x.eventType),
      'event_type'
    ),
    countPresence(
      yhInquiryRows.map((x) => x.guestCount),
      'guest_count'
    ),
    countPresence(
      yhInquiryRows.map((x) => x.quoteId),
      'quote_id'
    ),
    countPresence(
      yhInquiryRows.map((x) => x.quoteUrl),
      'quote_url'
    ),
  ]

  const report = {
    generated_at: new Date().toISOString(),
    source_fixture: fixtureFile,
    totals: {
      takeachef_new_inquiries: tacInquiryRows.length,
      yhangry_new_inquiries: yhInquiryRows.length,
    },
    platforms: {
      takeachef: {
        metrics: tacMetrics,
      },
      yhangry: {
        metrics: yhMetrics,
      },
    },
  }

  mkdirSync(outDir, { recursive: true })
  const jsonPath = path.join(outDir, 'parse-quality.json')
  const mdPath = path.join(outDir, 'parse-quality.md')

  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8')

  const toLines = (title: string, total: number, metrics: FieldMetric[]) => {
    const lines = [`## ${title}`, `- New inquiries analyzed: ${total}`, '- Field coverage:']
    for (const m of metrics) {
      lines.push(`  - ${m.field}: ${m.present}/${m.present + m.missing} (${m.present_rate}%)`)
    }
    lines.push('')
    return lines
  }

  const md = [
    '# Parse Quality Report',
    '',
    `- Generated at: ${report.generated_at}`,
    `- Fixture source: ${fixtureFile}`,
    '',
    ...toLines('TakeAChef', tacInquiryRows.length, tacMetrics),
    ...toLines('Yhangry', yhInquiryRows.length, yhMetrics),
  ].join('\n')

  writeFileSync(mdPath, `${md}\n`, 'utf-8')

  console.log('Parse quality report complete')
  console.log(`JSON: ${jsonPath}`)
  console.log(`Markdown: ${mdPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
