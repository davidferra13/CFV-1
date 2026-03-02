/**
 * Build platform reference artifacts from Gmail Takeout MBOX exports.
 *
 * Input defaults:
 *   data/email-references/privatechefmanager-yhangry/Takeout/Mail/*.mbox
 *
 * Outputs:
 *   data/email-references/generated/privatechefmanager-yhangry/build-summary.json
 *   data/email-references/generated/privatechefmanager-yhangry/rulepack.json
 *   data/email-references/generated/privatechefmanager-yhangry/report.md
 *
 * Run:
 *   npx tsx scripts/email-references/build-private-platform-reference.ts
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import path from 'path'
import type { ParsedEmail } from '../../lib/google/types.ts'
import {
  splitMbox,
  parseRecord,
  increment,
  topN,
  tokenize,
  normalizeSubjectForPattern,
  type FrequencyMap,
} from './mbox-utils'

type Platform = 'takeachef' | 'yhangry' | 'unknown'
type ParseResult = any

type ParsedRecord = {
  sourceFile: string
  platform: Platform
  email: ParsedEmail
  parsed: ParseResult
  emailType: string
  isDinnerOpportunity: boolean
  dedupeKeys: string[]
}

const DEFAULT_INPUT_ROOT = path.resolve(
  process.cwd(),
  'data/email-references/privatechefmanager-yhangry/Takeout/Mail'
)
const DEFAULT_OUT_DIR = path.resolve(
  process.cwd(),
  'data/email-references/generated/privatechefmanager-yhangry'
)

let takeAChefParser: any
let yhangryParser: any

function parseArgs() {
  const args = process.argv.slice(2)
  const getArg = (name: string) => {
    const hit = args.find((a) => a.startsWith(`--${name}=`))
    return hit ? hit.slice(name.length + 3) : undefined
  }

  const inputRoot = path.resolve(getArg('input-root') ?? DEFAULT_INPUT_ROOT)
  const outDir = path.resolve(getArg('out-dir') ?? DEFAULT_OUT_DIR)
  return { inputRoot, outDir }
}

function classifyPlatform(email: ParsedEmail): Platform {
  if (takeAChefParser.isTakeAChefEmail(email.from.email)) return 'takeachef'
  if (yhangryParser.isYhangryEmail(email.from.email)) return 'yhangry'
  return 'unknown'
}

function isDinnerOpportunityType(platform: Platform, emailType: string): boolean {
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

function dedupeKeysForParsed(platform: Platform, parsed: ParseResult): string[] {
  if (!parsed) return []

  const keys: string[] = []
  if (platform === 'takeachef') {
    const tac = parsed as any
    if (tac.inquiry?.ctaLink) keys.push(`cta:${tac.inquiry.ctaLink}`)
    if (tac.booking?.orderId) keys.push(`order:${tac.booking.orderId}`)
    if (tac.booking?.ctaLink) keys.push(`cta:${tac.booking.ctaLink}`)
    if (tac.customerInfo?.ctaLink) keys.push(`cta:${tac.customerInfo.ctaLink}`)
    if (tac.message?.ctaLink) keys.push(`cta:${tac.message.ctaLink}`)
  } else if (platform === 'yhangry') {
    const yh = parsed as any
    if (yh.inquiry?.quoteId) keys.push(`quote:${yh.inquiry.quoteId}`)
    if (yh.inquiry?.quoteUrl) keys.push(`quote_url:${yh.inquiry.quoteUrl}`)
    if (yh.booking?.quoteId) keys.push(`quote:${yh.booking.quoteId}`)
    if (yh.booking?.quoteUrl) keys.push(`quote_url:${yh.booking.quoteUrl}`)
    if (yh.message?.quoteId) keys.push(`quote:${yh.message.quoteId}`)
    if (yh.message?.quoteUrl) keys.push(`quote_url:${yh.message.quoteUrl}`)
  }
  return Array.from(new Set(keys))
}

function parseMboxFile(filePath: string): ParsedRecord[] {
  const content = readFileSync(filePath, 'utf-8')
  const records = splitMbox(content)
  const parsed: ParsedRecord[] = []

  for (const raw of records) {
    const email = parseRecord(raw, path.basename(filePath))
    if (!email) continue

    const platform = classifyPlatform(email)
    let parsedResult: ParseResult = null
    let emailType = 'unknown'
    if (platform === 'takeachef') {
      parsedResult = takeAChefParser.parseTakeAChefEmail(email)
      emailType = parsedResult.emailType
    } else if (platform === 'yhangry') {
      parsedResult = yhangryParser.parseYhangryEmail(email)
      emailType = parsedResult.emailType
    }

    const isDinnerOpportunity = isDinnerOpportunityType(platform, emailType)
    const dedupeKeys = dedupeKeysForParsed(platform, parsedResult)
    parsed.push({
      sourceFile: path.basename(filePath),
      platform,
      email,
      parsed: parsedResult,
      emailType,
      isDinnerOpportunity,
      dedupeKeys,
    })
  }

  return parsed
}

function buildArtifacts(records: ParsedRecord[], inputRoot: string) {
  const platformBuckets: Record<Platform, ParsedRecord[]> = {
    takeachef: [],
    yhangry: [],
    unknown: [],
  }
  for (const r of records) {
    platformBuckets[r.platform].push(r)
  }

  const buildPlatform = (platform: Platform, items: ParsedRecord[]) => {
    const bySenderEmail: FrequencyMap = new Map()
    const bySenderDomain: FrequencyMap = new Map()
    const bySubjectPattern: FrequencyMap = new Map()
    const byEmailType: FrequencyMap = new Map()
    const dedupeKeyFreq: FrequencyMap = new Map()
    const positiveKeywords: FrequencyMap = new Map()
    const negativeKeywords: FrequencyMap = new Map()

    for (const item of items) {
      increment(bySenderEmail, item.email.from.email || '(missing)')
      const domain = item.email.from.email.split('@')[1] || '(missing)'
      increment(bySenderDomain, domain)
      increment(bySubjectPattern, normalizeSubjectForPattern(item.email.subject))
      increment(byEmailType, item.emailType)
      for (const k of item.dedupeKeys) increment(dedupeKeyFreq, k)

      const tokenTarget = item.isDinnerOpportunity ? positiveKeywords : negativeKeywords
      const tokens = tokenize(`${item.email.subject}\n${item.email.body.slice(0, 3000)}`)
      for (const t of tokens) increment(tokenTarget, t)
    }

    const opportunities = items.filter((i) => i.isDinnerOpportunity).length
    const duplicates = Array.from(dedupeKeyFreq.entries()).filter(([, count]) => count > 1).length

    const sample = items.slice(0, 25).map((i) => ({
      source_file: i.sourceFile,
      message_id: i.email.messageId,
      from: i.email.from.email,
      subject: i.email.subject,
      email_type: i.emailType,
      dinner_opportunity: i.isDinnerOpportunity,
      dedupe_keys: i.dedupeKeys,
    }))

    return {
      stats: {
        total_messages: items.length,
        dinner_opportunity_messages: opportunities,
        non_opportunity_messages: items.length - opportunities,
        dinner_opportunity_rate:
          items.length > 0 ? Number((opportunities / items.length).toFixed(4)) : 0,
        duplicate_key_count: duplicates,
      },
      fingerprints: {
        sender_domains: topN(bySenderDomain, 20),
        sender_emails: topN(bySenderEmail, 20),
        subject_patterns: topN(bySubjectPattern, 25),
        email_types: topN(byEmailType, 20),
      },
      keywords: {
        positive: topN(positiveKeywords, 40),
        negative: topN(negativeKeywords, 40),
      },
      dedupe: {
        top_keys: topN(dedupeKeyFreq, 40),
        duplicated_keys: topN(
          new Map(Array.from(dedupeKeyFreq.entries()).filter(([, count]) => count > 1)),
          40
        ),
      },
      samples: sample,
    }
  }

  const takeachef = buildPlatform('takeachef', platformBuckets.takeachef)
  const yhangry = buildPlatform('yhangry', platformBuckets.yhangry)
  const unknown = buildPlatform('unknown', platformBuckets.unknown)

  const summary = {
    generated_at: new Date().toISOString(),
    input_root: inputRoot,
    totals: {
      records: records.length,
      takeachef: platformBuckets.takeachef.length,
      yhangry: platformBuckets.yhangry.length,
      unknown: platformBuckets.unknown.length,
      dinner_opportunities:
        takeachef.stats.dinner_opportunity_messages + yhangry.stats.dinner_opportunity_messages,
    },
    platforms: { takeachef, yhangry, unknown },
  }

  const regressionFixtures = {
    generated_at: summary.generated_at,
    source: {
      input_root: inputRoot,
      records: records.length,
    },
    fixtures: records.map((r) => ({
      source_file: r.sourceFile,
      message_id: r.email.messageId,
      from_email: r.email.from.email,
      from_name: r.email.from.name,
      subject: r.email.subject,
      body: r.email.body,
      platform: r.platform,
      email_type: r.emailType,
      dinner_opportunity: r.isDinnerOpportunity,
      dedupe_keys: r.dedupeKeys,
    })),
  }

  const rulepack = {
    generated_at: summary.generated_at,
    source: {
      input_root: inputRoot,
      note: 'Generated from Gmail Takeout MBOX exports in this folder.',
    },
    raw_dinner_feed_definition: {
      description:
        'Raw Dinner Feed should include all dinner opportunities, including duplicates and low-confidence items, but should exclude non-dinner administrative/marketing noise.',
      include_email_types: {
        takeachef: [
          'tac_new_inquiry',
          'tac_client_message',
          'tac_booking_confirmed',
          'tac_customer_info',
        ],
        yhangry: ['yhangry_new_inquiry', 'yhangry_client_message', 'yhangry_booking_confirmed'],
      },
      exclude_email_types: {
        takeachef: ['tac_administrative', 'tac_payment'],
        yhangry: ['yhangry_administrative'],
      },
    },
    platforms: {
      takeachef: {
        aliases: ['private chef manager', 'take a chef', 'takeachef'],
        sender_domains: takeachef.fingerprints.sender_domains.map((x) => x.value),
        sender_emails: takeachef.fingerprints.sender_emails.map((x) => x.value),
        top_subject_patterns: takeachef.fingerprints.subject_patterns.map((x) => x.value),
        positive_keywords: takeachef.keywords.positive.map((x) => x.value),
        negative_keywords: takeachef.keywords.negative.map((x) => x.value),
        dedupe_primary_keys: ['order_id', 'cta_link'],
        observed_duplicate_keys: takeachef.dedupe.duplicated_keys.map((x) => x.value),
      },
      yhangry: {
        aliases: ['yhangry'],
        sender_domains: yhangry.fingerprints.sender_domains.map((x) => x.value),
        sender_emails: yhangry.fingerprints.sender_emails.map((x) => x.value),
        top_subject_patterns: yhangry.fingerprints.subject_patterns.map((x) => x.value),
        positive_keywords: yhangry.keywords.positive.map((x) => x.value),
        negative_keywords: yhangry.keywords.negative.map((x) => x.value),
        dedupe_primary_keys: ['quote_id', 'quote_url'],
        observed_duplicate_keys: yhangry.dedupe.duplicated_keys.map((x) => x.value),
      },
    },
  }

  const reportLines = [
    '# Private Platform Reference Build',
    '',
    `- Generated at: ${summary.generated_at}`,
    `- Input root: ${inputRoot}`,
    `- Total records: ${summary.totals.records}`,
    `- TakeAChef records: ${summary.totals.takeachef}`,
    `- Yhangry records: ${summary.totals.yhangry}`,
    `- Unknown records: ${summary.totals.unknown}`,
    `- Dinner opportunities: ${summary.totals.dinner_opportunities}`,
    '',
    '## TakeAChef',
    `- Dinner opportunities: ${takeachef.stats.dinner_opportunity_messages}/${takeachef.stats.total_messages}`,
    `- Duplicate keys observed: ${takeachef.stats.duplicate_key_count}`,
    '- Top email types:',
    ...takeachef.fingerprints.email_types.slice(0, 10).map((x) => `  - ${x.value}: ${x.count}`),
    '',
    '## Yhangry',
    `- Dinner opportunities: ${yhangry.stats.dinner_opportunity_messages}/${yhangry.stats.total_messages}`,
    `- Duplicate keys observed: ${yhangry.stats.duplicate_key_count}`,
    '- Top email types:',
    ...yhangry.fingerprints.email_types.slice(0, 10).map((x) => `  - ${x.value}: ${x.count}`),
    '',
    '## Notes',
    '- This build is deterministic from the provided zip only.',
    '- It is intended to define Raw Dinner Feed and generate parser+dedupe fingerprints.',
  ]

  return {
    summary,
    rulepack,
    regressionFixtures,
    report: `${reportLines.join('\n')}\n`,
  }
}

function findMboxFiles(inputRoot: string): string[] {
  const files = readdirSync(inputRoot)
    .filter((name) => name.toLowerCase().endsWith('.mbox'))
    .map((name) => path.join(inputRoot, name))
  return files
}

async function main() {
  const { inputRoot, outDir } = parseArgs()
  const tacModuleRaw = await import('../../lib/gmail/take-a-chef-parser')
  const yhModuleRaw = await import('../../lib/gmail/yhangry-parser')
  takeAChefParser = tacModuleRaw as any
  yhangryParser = yhModuleRaw as any

  if (
    typeof takeAChefParser?.isTakeAChefEmail !== 'function' ||
    typeof takeAChefParser?.parseTakeAChefEmail !== 'function'
  ) {
    throw new Error('Failed to load TakeAChef parser module exports')
  }
  if (
    typeof yhangryParser?.isYhangryEmail !== 'function' ||
    typeof yhangryParser?.parseYhangryEmail !== 'function'
  ) {
    throw new Error('Failed to load Yhangry parser module exports')
  }

  const mboxFiles = findMboxFiles(inputRoot)
  if (mboxFiles.length === 0) {
    throw new Error(`No .mbox files found under: ${inputRoot}`)
  }

  const parsedRecords = mboxFiles.flatMap((file) => parseMboxFile(file))
  const artifacts = buildArtifacts(parsedRecords, inputRoot)

  mkdirSync(outDir, { recursive: true })
  const summaryPath = path.join(outDir, 'build-summary.json')
  const rulepackPath = path.join(outDir, 'rulepack.json')
  const fixturesPath = path.join(outDir, 'regression-fixtures.json')
  const reportPath = path.join(outDir, 'report.md')

  writeFileSync(summaryPath, JSON.stringify(artifacts.summary, null, 2))
  writeFileSync(rulepackPath, JSON.stringify(artifacts.rulepack, null, 2))
  writeFileSync(fixturesPath, JSON.stringify(artifacts.regressionFixtures, null, 2))
  writeFileSync(reportPath, artifacts.report)

  console.log('Build complete')
  console.log(`Input root: ${inputRoot}`)
  console.log(`Records parsed: ${parsedRecords.length}`)
  console.log(`Summary: ${summaryPath}`)
  console.log(`Rulepack: ${rulepackPath}`)
  console.log(`Fixtures: ${fixturesPath}`)
  console.log(`Report: ${reportPath}`)
}

main()
