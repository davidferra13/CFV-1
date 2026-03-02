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

import { createHash } from 'crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import path from 'path'
import type { ParsedEmail } from '../../lib/google/types.ts'

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

type FrequencyMap = Map<string, number>

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

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'from',
  'that',
  'this',
  'with',
  'you',
  'your',
  'are',
  'was',
  'were',
  'have',
  'has',
  'had',
  'will',
  'would',
  'there',
  'their',
  'they',
  'them',
  'into',
  'our',
  'out',
  'about',
  'just',
  'can',
  'could',
  'should',
  'a',
  'an',
  'to',
  'in',
  'on',
  'of',
  'at',
  'or',
  'if',
  'is',
  'it',
  'be',
  'as',
  'by',
  'we',
  'us',
  'me',
  'my',
  'i',
  'hi',
  'hello',
  'thanks',
  'thank',
  'regards',
  'best',
])

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

function increment(map: FrequencyMap, key: string) {
  const k = key.trim()
  if (!k) return
  map.set(k, (map.get(k) ?? 0) + 1)
}

function topN(map: FrequencyMap, n: number) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }))
}

function splitMbox(content: string): string[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const records: string[] = []
  let buffer: string[] = []

  for (const line of lines) {
    if (line.startsWith('From ') && buffer.length > 0) {
      records.push(buffer.join('\n'))
      buffer = [line]
      continue
    }
    buffer.push(line)
  }

  if (buffer.length > 0) {
    records.push(buffer.join('\n'))
  }

  return records.filter((r) => r.trim().length > 0)
}

function parseHeaders(headerText: string): Record<string, string> {
  const headers: Record<string, string> = {}
  const lines = headerText.split('\n')
  let currentKey: string | null = null

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r/g, '')
    if (!line) continue

    if (/^\s/.test(line) && currentKey) {
      headers[currentKey] += ` ${line.trim()}`
      continue
    }

    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim().toLowerCase()
    const value = line.slice(idx + 1).trim()
    headers[key] = value
    currentKey = key
  }

  return headers
}

function decodeMimeWords(value: string): string {
  return value.replace(/=\?([^?]+)\?([bBqQ])\?([^?]+)\?=/g, (_, charset, enc, data) => {
    try {
      if (enc.toLowerCase() === 'b') {
        return Buffer.from(data, 'base64').toString(charset)
      }

      // Q-encoding variant used in headers.
      const qp = data
        .replace(/_/g, ' ')
        .replace(/=([0-9A-Fa-f]{2})/g, (_m: string, hex: string) =>
          String.fromCharCode(parseInt(hex, 16))
        )
      return Buffer.from(qp, 'binary').toString(charset)
    } catch {
      return data
    }
  })
}

function decodeQuotedPrintable(value: string): string {
  const softLineBreaksRemoved = value.replace(/=\r?\n/g, '')
  return softLineBreaksRemoved.replace(/=([0-9A-Fa-f]{2})/g, (_m, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  )
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodePartBody(body: string, transferEncoding: string | undefined): string {
  const enc = (transferEncoding || '').toLowerCase()
  if (enc.includes('base64')) {
    try {
      const compact = body.replace(/\s+/g, '')
      return Buffer.from(compact, 'base64').toString('utf-8')
    } catch {
      return body
    }
  }
  if (enc.includes('quoted-printable')) {
    return decodeQuotedPrintable(body)
  }
  return body
}

function parseMimeEntity(raw: string): { headers: Record<string, string>; body: string } {
  const normalized = raw.replace(/\r\n/g, '\n')
  const splitIndex = normalized.indexOf('\n\n')
  if (splitIndex < 0) {
    return { headers: {}, body: normalized }
  }
  const headerText = normalized.slice(0, splitIndex)
  const body = normalized.slice(splitIndex + 2)
  return { headers: parseHeaders(headerText), body }
}

function extractBoundary(contentType: string | undefined): string | null {
  if (!contentType) return null
  const match = contentType.match(/boundary="?([^";]+)"?/i)
  return match?.[1] ?? null
}

function extractTextFromEntity(entity: { headers: Record<string, string>; body: string }): string {
  const contentType = (entity.headers['content-type'] || 'text/plain').toLowerCase()
  const transfer = entity.headers['content-transfer-encoding']

  if (contentType.startsWith('multipart/')) {
    const boundary = extractBoundary(entity.headers['content-type'])
    if (!boundary) return ''

    const marker = `--${boundary}`
    const endMarker = `--${boundary}--`
    const rawParts = entity.body
      .split(marker)
      .map((p) => p.trim())
      .filter((p) => p && p !== '--' && p !== endMarker.replace(marker, '').trim())

    const parsedParts = rawParts
      .map((part) => part.replace(/^\n+|\n+$/g, ''))
      .filter((part) => !part.startsWith('--'))
      .map((part) => parseMimeEntity(part))

    const inlineParts = parsedParts.filter((p) => {
      const dispo = (p.headers['content-disposition'] || '').toLowerCase()
      return !dispo.includes('attachment')
    })

    const plain = inlineParts.find((p) =>
      (p.headers['content-type'] || '').toLowerCase().startsWith('text/plain')
    )
    if (plain) {
      return extractTextFromEntity(plain)
    }

    const html = inlineParts.find((p) =>
      (p.headers['content-type'] || '').toLowerCase().startsWith('text/html')
    )
    if (html) {
      return stripHtml(extractTextFromEntity(html))
    }

    for (const part of inlineParts) {
      const nested = extractTextFromEntity(part)
      if (nested.trim()) return nested
    }
    return ''
  }

  const decoded = decodePartBody(entity.body, transfer)
  if (contentType.startsWith('text/html')) {
    return stripHtml(decoded)
  }
  return decoded
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function parseAddress(rawHeader: string): { name: string; email: string } {
  const decoded = decodeMimeWords(rawHeader || '').trim()
  const emailMatch = decoded.match(/<([^>]+)>/)
  if (emailMatch) {
    const email = emailMatch[1].trim().toLowerCase()
    const name = decoded
      .replace(emailMatch[0], '')
      .replace(/(^"|"$)/g, '')
      .trim()
    return { name, email }
  }

  const bareEmailMatch = decoded.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  if (bareEmailMatch) {
    const email = bareEmailMatch[0].trim().toLowerCase()
    const name = decoded.replace(email, '').replace(/[()"]/g, '').trim()
    return { name, email }
  }

  return { name: decoded, email: '' }
}

function normalizeSubjectForPattern(subject: string): string {
  return subject
    .toLowerCase()
    .replace(/\b\d+\b/g, '{n}')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t))
}

function parseRecord(recordRaw: string, sourceFile: string): ParsedEmail | null {
  // Strip the mailbox separator line.
  const withoutFromLine = recordRaw.replace(/^From .*\n?/, '')
  const splitIndex = withoutFromLine.indexOf('\n\n')
  if (splitIndex < 0) return null

  const headerText = withoutFromLine.slice(0, splitIndex)
  const rawBody = withoutFromLine.slice(splitIndex + 2)
  const headers = parseHeaders(headerText)
  const rootEntity = {
    headers,
    body: rawBody,
  }

  const from = parseAddress(headers['from'] || '')
  const subject = decodeMimeWords(headers['subject'] || '')
  const textBody = extractTextFromEntity(rootEntity).trim()

  const rawMessageId = (headers['message-id'] || '').trim()
  const messageId =
    rawMessageId.replace(/[<>]/g, '') ||
    createHash('sha1')
      .update(`${sourceFile}:${subject}:${textBody.slice(0, 256)}`)
      .digest('hex')

  const labelIds = (headers['x-gmail-labels'] || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

  const snippet = textBody.slice(0, 180)
  return {
    messageId,
    threadId: messageId,
    from,
    to: decodeMimeWords(headers['to'] || ''),
    subject,
    body: textBody,
    date: headers['date'] || '',
    snippet,
    labelIds,
    listUnsubscribe: headers['list-unsubscribe'] || '',
    precedence: headers['precedence'] || '',
  }
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
  const tacModuleRaw = await import('../../lib/gmail/take-a-chef-parser.ts')
  const yhModuleRaw = await import('../../lib/gmail/yhangry-parser.ts')
  takeAChefParser = tacModuleRaw.default ?? tacModuleRaw
  yhangryParser = yhModuleRaw.default ?? yhModuleRaw

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
