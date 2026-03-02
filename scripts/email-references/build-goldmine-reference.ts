/**
 * Build reference artifacts from the GOLDMINE Gmail Takeout MBOX export.
 *
 * Unlike the platform reference (TakeAChef/Yhangry), the GOLDMINE data is
 * mostly direct client ↔ chef conversation — free-form text, not templated.
 * This script classifies, threads, and produces fixtures for regression testing
 * of the email classifier and future direct-inquiry parser.
 *
 * Input:
 *   .auth/EmailGOLDMINE/Takeout/Mail/Dinner Email Export.mbox
 *
 * Outputs:
 *   data/email-references/generated/goldmine/build-summary.json
 *   data/email-references/generated/goldmine/regression-fixtures.json
 *   data/email-references/generated/goldmine/thread-map.json
 *   data/email-references/generated/goldmine/rulepack.json
 *   data/email-references/generated/goldmine/report.md
 *
 * Run:
 *   npx tsx scripts/email-references/build-goldmine-reference.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
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
} from './mbox-utils.ts'

// ─── Types ─────────────────────────────────────────────────────────────────

type GoldmineCategory =
  | 'outbound'
  | 'wix_form'
  | 'platform_takeachef'
  | 'partner_ember'
  | 'direct_first_contact'
  | 'direct_followup'
  | 'post_event_feedback'
  | 'bounce'

type GoldmineRecord = {
  email: ParsedEmail
  category: GoldmineCategory
  threadId: string
  threadPosition: number
  isFirstContact: boolean
  partnerSource: string | null
  heuristicScore: number
  heuristicSignals: string[]
}

// ─── Config ────────────────────────────────────────────────────────────────

const CHEF_EMAIL = 'dfprivatechef@gmail.com'
const PARTNER_DOMAINS: Record<string, string> = {
  'emberbrandfire.com': 'ember_brand_fire',
}
const WIX_DOMAINS = ['wix-forms.com']
const TAKEACHEF_DOMAINS = ['takeachef.com', 'privatechefmanager.com']
const BOUNCE_SENDERS = ['mailer-daemon@', 'postmaster@']

const DEFAULT_INPUT = path.resolve(
  process.cwd(),
  '.auth/EmailGOLDMINE/Takeout/Mail/Dinner Email Export.mbox'
)
const DEFAULT_OUT_DIR = path.resolve(process.cwd(), 'data/email-references/generated/goldmine')

// ─── Classification ────────────────────────────────────────────────────────

function classifySender(email: ParsedEmail): {
  category: GoldmineCategory | null
  partnerSource: string | null
} {
  const addr = email.from.email.toLowerCase()
  const domain = addr.split('@')[1] || ''

  // Outbound from the chef
  if (addr === CHEF_EMAIL) {
    return { category: 'outbound', partnerSource: null }
  }

  // Bounce notifications
  if (BOUNCE_SENDERS.some((b) => addr.startsWith(b))) {
    return { category: 'bounce', partnerSource: null }
  }

  // Wix Forms
  if (WIX_DOMAINS.includes(domain)) {
    return { category: 'wix_form', partnerSource: null }
  }

  // TakeAChef / Private Chef Manager
  if (TAKEACHEF_DOMAINS.includes(domain)) {
    return { category: 'platform_takeachef', partnerSource: null }
  }

  // Partner domains
  if (PARTNER_DOMAINS[domain]) {
    return { category: 'partner_ember', partnerSource: PARTNER_DOMAINS[domain] }
  }

  // Direct client email — classify further after threading
  return { category: null, partnerSource: null }
}

/**
 * Post-event feedback detection — identifies thank-you / review emails
 * that should NOT be classified as inquiries.
 */
function isPostEventFeedback(subject: string, body: string): boolean {
  const subj = subject.toLowerCase()
  const bodyLower = body.slice(0, 3000).toLowerCase()
  const text = `${subj} ${bodyLower}`

  const feedbackPatterns = [
    /\b(?:just\s+(?:had\s+to|wanted\s+to)\s+(?:circle\s+back|say|tell\s+you))\b/i,
    /\b(?:thank\s+you\s+(?:so\s+much|again)\s+for\s+(?:the|such\s+a)\s+(?:amazing|wonderful|incredible|remarkable|beautiful|outstanding|fantastic))\b/i,
    /\b(?:remarkable|outstanding|incredible|extraordinary)\s+(?:meal|dinner|evening|feast|experience)\b/i,
    /\b(?:every\s+single\s+bite|thought\s+about\s+(?:that|the)\s+(?:meal|dinner|feast))\b/i,
    /\b(?:left\s+the\s+kitchen\s+cleaner)\b/i,
  ]

  // Must match at least one feedback pattern AND have no inquiry signals
  const hasFeedback = feedbackPatterns.some((p) => p.test(text))
  if (!hasFeedback) return false

  // Make sure it's not also an inquiry (has date + guests)
  const hasDate =
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/i.test(text) ||
    /\b\d{1,2}\/\d{1,2}/i.test(text)
  const hasGuests = /\b\d+\s*(?:guests?|people|persons?)\b/i.test(text)

  return !(hasDate && hasGuests)
}

/**
 * Simplified version of the Layer 4.5 heuristic from classify.ts.
 * Used to measure how well the current heuristic handles GOLDMINE emails.
 * Returns score and signal list — does NOT make classification decisions.
 */
function scoreInquirySignals(subject: string, body: string): { score: number; signals: string[] } {
  const subj = subject.toLowerCase()
  const bodyLower = body.slice(0, 5000).toLowerCase()
  const text = `${subj} ${bodyLower}`
  let score = 0
  const signals: string[] = []

  // Date mention
  if (
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}/i.test(
      text
    ) ||
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/.test(text) ||
    /\b(?:this|next)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|weekend|month)\b/i.test(
      text
    )
  ) {
    score += 1
    signals.push('date_mention')
  }

  // Guest count
  if (
    /\b(?:dinner|party|event|celebration|gathering)\s+(?:for|of)\s+\d+/i.test(text) ||
    /\b\d+\s*(?:guests?|people|persons?|adults?|couples?)\b/i.test(text) ||
    /\b(?:just\s+)?(?:the\s+)?two\s+of\s+us\b/i.test(text) ||
    /\bfor\s+(?:my\s+)?(?:wife|husband|partner|family)\b/i.test(text) ||
    /\bdinner\s+for\s+(?:two|2)\b/i.test(text)
  ) {
    score += 1
    signals.push('guest_count')
  }

  // Occasion
  if (
    /\b(?:birthday|anniversary|wedding|rehearsal|retirement|graduation|engagement|baby\s*shower|bridal\s*shower|holiday|thanksgiving|christmas|new\s*year|valentine|memorial\s*day|labor\s*day|4th\s+of\s+july|team\s*bonding|corporate|bachelorette|bachelor)\b/i.test(
      text
    )
  ) {
    score += 1
    signals.push('occasion')
  }

  // Price/availability/booking ask
  if (
    /\b(?:price|pricing|cost|rate|quote|estimate|how\s+much|what\s+(?:do\s+you|would\s+you)\s+charge|available|availability|book(?:ing)?|hire|looking\s+for\s+a\s+(?:private\s+)?chef)\b/i.test(
      text
    )
  ) {
    score += 1
    signals.push('price_or_booking_ask')
  }

  // Airbnb/vacation rental referral (+2)
  if (
    /\b(?:airbnb|air\s*b\s*n\s*b|vrbo|vacation\s+rental)\b/i.test(text) &&
    /\b(?:host|staying|renting|rental|property|cabin|cottage|lodge|house)\b/i.test(text)
  ) {
    score += 2
    signals.push('airbnb_referral')
  }

  // Referral language
  if (
    /\b(?:recommended\s+(?:by|you)|referred|got\s+your\s+(?:name|number|contact|info)|heard\s+about\s+you|found\s+you|host\s+(?:provided|gave|suggested))\b/i.test(
      text
    )
  ) {
    score += 1
    signals.push('referral')
  }

  // Dietary/allergy
  if (
    /\b(?:allerg(?:y|ies|ic)|gluten[- ]?free|celiac|vegan|vegetarian|dairy[- ]?free|nut[- ]?free|shellfish\s+allergy|kosher|halal|dietary|food\s+restrict|food\s+allerg|tree\s+nut)\b/i.test(
      text
    )
  ) {
    score += 1
    signals.push('dietary')
  }

  // Cannabis/THC
  if (/\b(?:cannabis|thc|infused|edible|marijuana|420)\b/i.test(text)) {
    score += 1
    signals.push('cannabis')
  }

  // Local geography
  if (
    /\b(?:maine|new\s+hampshire|portland|kennebunk(?:port)?|ogunquit|york|scarborough|cape\s+elizabeth|freeport|camden|rockport|bar\s+harbor|acadia|kittery|naples|harrison|norway|bridgton|portsmouth|hampton|north\s+conway|conway|lincoln|loon\s+mountain|bretton\s+woods|white\s+mountains|lake\s+winnipesaukee|meredith|wolfeboro|sunapee|tuftonboro|sullivan|dracut|ipswich|pepperell)\b/i.test(
      text
    )
  ) {
    score += 1
    signals.push('local_geography')
  }

  // Website follow-up
  if (
    /\b(?:(?:your|the)\s+website|through\s+(?:your|the)\s+(?:website|site)|(?:requested|submitted)\s+(?:a\s+)?(?:booking|inquiry|form))\b/i.test(
      text
    )
  ) {
    score += 1
    signals.push('website_followup')
  }

  return { score, signals }
}

// ─── Thread Grouping ───────────────────────────────────────────────────────

type ThreadMap = Map<string, ParsedEmail[]>

function groupByThread(emails: ParsedEmail[]): ThreadMap {
  const threads: ThreadMap = new Map()
  for (const email of emails) {
    const tid = email.threadId
    if (!threads.has(tid)) threads.set(tid, [])
    threads.get(tid)!.push(email)
  }

  // Sort each thread by date
  for (const [, msgs] of threads) {
    msgs.sort((a, b) => {
      const da = new Date(a.date).getTime() || 0
      const db = new Date(b.date).getTime() || 0
      return da - db
    })
  }

  return threads
}

function findFirstContact(thread: ParsedEmail[]): string | null {
  for (const msg of thread) {
    if (msg.from.email.toLowerCase() !== CHEF_EMAIL) {
      return msg.messageId
    }
  }
  return null
}

// ─── Main Pipeline ─────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const getArg = (name: string) => {
    const hit = args.find((a) => a.startsWith(`--${name}=`))
    return hit ? hit.slice(name.length + 3) : undefined
  }
  return {
    inputFile: path.resolve(getArg('input') ?? DEFAULT_INPUT),
    outDir: path.resolve(getArg('out-dir') ?? DEFAULT_OUT_DIR),
  }
}

function main() {
  const { inputFile, outDir } = parseArgs()

  // Read & parse MBOX
  const content = readFileSync(inputFile, 'utf-8')
  const rawRecords = splitMbox(content)
  const allEmails: ParsedEmail[] = []

  for (const raw of rawRecords) {
    const email = parseRecord(raw, path.basename(inputFile))
    if (email) allEmails.push(email)
  }

  console.log(`Parsed ${allEmails.length} emails from MBOX`)

  // Group into threads
  const threads = groupByThread(allEmails)
  console.log(`Grouped into ${threads.size} threads`)

  // Find first contact per thread
  const firstContactIds = new Set<string>()
  for (const [, msgs] of threads) {
    const fc = findFirstContact(msgs)
    if (fc) firstContactIds.add(fc)
  }

  // Track which senders we've seen (for first_contact vs followup)
  const seenSenders = new Set<string>()

  // Classify each email
  const records: GoldmineRecord[] = []
  const threadPositions = new Map<string, number>()

  for (const [threadId, msgs] of threads) {
    let position = 0
    for (const email of msgs) {
      position++
      threadPositions.set(email.messageId, position)

      const { category: senderCategory, partnerSource } = classifySender(email)
      const isFirstContact = firstContactIds.has(email.messageId)
      const addr = email.from.email.toLowerCase()

      let category: GoldmineCategory
      if (senderCategory) {
        category = senderCategory
      } else if (isPostEventFeedback(email.subject, email.body)) {
        category = 'post_event_feedback'
      } else if (isFirstContact && !seenSenders.has(addr)) {
        category = 'direct_first_contact'
      } else {
        category = 'direct_followup'
      }

      // Track seen senders for first-contact detection
      if (addr !== CHEF_EMAIL) {
        seenSenders.add(addr)
      }

      // Score inquiry signals
      const { score, signals } = scoreInquirySignals(email.subject, email.body)

      records.push({
        email,
        category,
        threadId,
        threadPosition: position,
        isFirstContact,
        partnerSource,
        heuristicScore: score,
        heuristicSignals: signals,
      })
    }
  }

  // ─── Build Artifacts ───────────────────────────────────────────────────

  // Category counts
  const categoryCounts: Record<string, number> = {}
  for (const r of records) {
    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1
  }

  // Sender analysis (non-outbound)
  const senderDomainFreq: FrequencyMap = new Map()
  const senderEmailFreq: FrequencyMap = new Map()
  const subjectPatternFreq: FrequencyMap = new Map()
  const inquirySignalFreq: FrequencyMap = new Map()

  for (const r of records) {
    if (r.category === 'outbound') continue
    const domain = r.email.from.email.split('@')[1] || 'unknown'
    increment(senderDomainFreq, domain)
    increment(senderEmailFreq, r.email.from.email)
    increment(subjectPatternFreq, normalizeSubjectForPattern(r.email.subject))
    for (const sig of r.heuristicSignals) {
      increment(inquirySignalFreq, sig)
    }
  }

  // Keyword extraction from direct emails
  const directEmails = records.filter(
    (r) => r.category === 'direct_first_contact' || r.category === 'direct_followup'
  )
  const keywordFreq: FrequencyMap = new Map()
  for (const r of directEmails) {
    const tokens = tokenize(`${r.email.subject}\n${r.email.body.slice(0, 3000)}`)
    for (const t of tokens) increment(keywordFreq, t)
  }

  // Heuristic accuracy on first-contact emails
  const firstContacts = records.filter((r) => r.isFirstContact && r.category !== 'outbound')
  const heuristicCatches = firstContacts.filter((r) => r.heuristicScore >= 2)
  const heuristicHighConf = firstContacts.filter((r) => r.heuristicScore >= 3)

  // Thread stats
  const threadSizes = Array.from(threads.values()).map((msgs) => msgs.length)
  const avgThreadSize = threadSizes.reduce((a, b) => a + b, 0) / threadSizes.length

  // ─── Output: build-summary.json ──────────────────────────────────────

  const summary = {
    generated_at: new Date().toISOString(),
    input_file: inputFile,
    totals: {
      emails: allEmails.length,
      threads: threads.size,
      avg_thread_size: Number(avgThreadSize.toFixed(1)),
      max_thread_size: Math.max(...threadSizes),
      by_category: categoryCounts,
    },
    heuristic_accuracy: {
      first_contacts_total: firstContacts.length,
      caught_by_heuristic_score_2_plus: heuristicCatches.length,
      caught_by_heuristic_score_3_plus: heuristicHighConf.length,
      catch_rate_medium:
        firstContacts.length > 0
          ? Number((heuristicCatches.length / firstContacts.length).toFixed(4))
          : 0,
      catch_rate_high:
        firstContacts.length > 0
          ? Number((heuristicHighConf.length / firstContacts.length).toFixed(4))
          : 0,
    },
    fingerprints: {
      sender_domains: topN(senderDomainFreq, 20),
      sender_emails: topN(senderEmailFreq, 30),
      subject_patterns: topN(subjectPatternFreq, 25),
      inquiry_signals: topN(inquirySignalFreq, 15),
    },
    keywords: {
      direct_email_keywords: topN(keywordFreq, 50),
    },
  }

  // ─── Output: regression-fixtures.json ────────────────────────────────

  const fixtures = {
    generated_at: summary.generated_at,
    source: {
      input_file: inputFile,
      total_emails: allEmails.length,
    },
    fixtures: records.map((r) => ({
      message_id: r.email.messageId,
      thread_id: r.threadId,
      from_email: r.email.from.email,
      from_name: r.email.from.name,
      to: r.email.to,
      subject: r.email.subject,
      body: r.email.body,
      date: r.email.date,
      labels: r.email.labelIds,
      expected_category: r.category,
      is_first_contact: r.isFirstContact,
      partner_source: r.partnerSource,
      thread_position: r.threadPosition,
      heuristic_score: r.heuristicScore,
      heuristic_signals: r.heuristicSignals,
    })),
  }

  // ─── Output: thread-map.json ─────────────────────────────────────────

  const threadMap: Record<
    string,
    {
      thread_id: string
      messages: {
        message_id: string
        from: string
        from_name: string
        date: string
        subject: string
        category: string
        position: number
      }[]
      first_contact_id: string | null
      participant_count: number
    }
  > = {}

  for (const [threadId, msgs] of threads) {
    const participants = new Set(msgs.map((m) => m.from.email))
    const fc = findFirstContact(msgs)
    threadMap[threadId] = {
      thread_id: threadId,
      messages: msgs.map((m, i) => {
        const rec = records.find((r) => r.email.messageId === m.messageId)
        return {
          message_id: m.messageId,
          from: m.from.email,
          from_name: m.from.name,
          date: m.date,
          subject: m.subject,
          category: rec?.category || 'unknown',
          position: i + 1,
        }
      }),
      first_contact_id: fc,
      participant_count: participants.size,
    }
  }

  // ─── Output: rulepack.json ───────────────────────────────────────────

  const partnerRecords = records.filter((r) => r.category === 'partner_ember')
  const feedbackRecords = records.filter((r) => r.category === 'post_event_feedback')

  const rulepack = {
    generated_at: summary.generated_at,
    source: { input_file: inputFile, note: 'Generated from GOLDMINE Gmail Takeout export.' },
    partner_domains: Object.entries(PARTNER_DOMAINS).map(([domain, id]) => ({
      domain,
      id,
      email_count: partnerRecords.length,
      sample_senders: topN(
        partnerRecords.reduce((m, r) => {
          increment(m, r.email.from.email)
          return m
        }, new Map() as FrequencyMap),
        5
      ),
    })),
    post_event_feedback: {
      count: feedbackRecords.length,
      samples: feedbackRecords.slice(0, 5).map((r) => ({
        from: r.email.from.email,
        subject: r.email.subject,
        snippet: r.email.body.slice(0, 200),
      })),
    },
    inquiry_heuristic: {
      signals_found: topN(inquirySignalFreq, 15),
      first_contact_catch_rate: summary.heuristic_accuracy,
      missed_first_contacts: firstContacts
        .filter((r) => r.heuristicScore < 2)
        .map((r) => ({
          from: r.email.from.email,
          subject: r.email.subject,
          score: r.heuristicScore,
          signals: r.heuristicSignals,
          snippet: r.email.body.slice(0, 200),
        })),
    },
    direct_email_keywords: topN(keywordFreq, 30),
  }

  // ─── Output: report.md ──────────────────────────────────────────────

  const lines = [
    '# GOLDMINE Email Reference Build',
    '',
    `- Generated: ${summary.generated_at}`,
    `- Input: ${path.basename(inputFile)}`,
    `- Total emails: ${allEmails.length}`,
    `- Threads: ${threads.size} (avg ${avgThreadSize.toFixed(1)} msgs, max ${Math.max(...threadSizes)})`,
    '',
    '## Category Breakdown',
    '',
    ...Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `- **${cat}**: ${count}`),
    '',
    '## Heuristic Accuracy (First-Contact Emails)',
    '',
    `- First contacts tested: ${firstContacts.length}`,
    `- Caught at score ≥2 (medium): ${heuristicCatches.length} (${(summary.heuristic_accuracy.catch_rate_medium * 100).toFixed(0)}%)`,
    `- Caught at score ≥3 (high): ${heuristicHighConf.length} (${(summary.heuristic_accuracy.catch_rate_high * 100).toFixed(0)}%)`,
    '',
    '### Missed First Contacts (score < 2)',
    '',
    ...firstContacts
      .filter((r) => r.heuristicScore < 2)
      .map(
        (r) =>
          `- **${r.email.from.name}** (${r.email.from.email}): "${r.email.subject}" — score ${r.heuristicScore} [${r.heuristicSignals.join(', ') || 'no signals'}]`
      ),
    '',
    '## Top Inquiry Signals',
    '',
    ...topN(inquirySignalFreq, 10).map((s) => `- ${s.value}: ${s.count}×`),
    '',
    '## Partner Domains',
    '',
    ...Object.entries(PARTNER_DOMAINS).map(
      ([d, id]) => `- ${d} → ${id} (${partnerRecords.length} emails)`
    ),
    '',
    '## Notes',
    '',
    '- This build is deterministic from the provided MBOX.',
    '- Outbound emails (from chef) are included for thread context but not classified as opportunities.',
    '- Post-event feedback emails are detected via pattern matching to prevent false inquiry classification.',
  ]

  // ─── Write Files ─────────────────────────────────────────────────────

  mkdirSync(outDir, { recursive: true })

  const summaryPath = path.join(outDir, 'build-summary.json')
  const fixturesPath = path.join(outDir, 'regression-fixtures.json')
  const threadMapPath = path.join(outDir, 'thread-map.json')
  const rulepackPath = path.join(outDir, 'rulepack.json')
  const reportPath = path.join(outDir, 'report.md')

  writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
  writeFileSync(fixturesPath, JSON.stringify(fixtures, null, 2))
  writeFileSync(threadMapPath, JSON.stringify(threadMap, null, 2))
  writeFileSync(rulepackPath, JSON.stringify(rulepack, null, 2))
  writeFileSync(reportPath, lines.join('\n') + '\n')

  console.log('\nBuild complete')
  console.log(`  Summary:  ${summaryPath}`)
  console.log(`  Fixtures: ${fixturesPath}`)
  console.log(`  Threads:  ${threadMapPath}`)
  console.log(`  Rulepack: ${rulepackPath}`)
  console.log(`  Report:   ${reportPath}`)
  console.log(`\n  Categories: ${JSON.stringify(categoryCounts)}`)
  console.log(
    `  Heuristic catch rate (first contacts, score≥2): ${(summary.heuristic_accuracy.catch_rate_medium * 100).toFixed(0)}%`
  )
}

main()
