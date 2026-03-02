/**
 * Build reference artifacts from the GOLDMINE Gmail Takeout MBOX export.
 *
 * Unlike the platform reference (TakeAChef/Yhangry), the GOLDMINE data is
 * mostly direct client ↔ chef conversation — free-form text, not templated.
 * This script classifies, threads, and produces fixtures for regression testing
 * of the email classifier and future direct-inquiry parser.
 *
 * Phases:
 *   Phase 1: Parse MBOX, classify, thread, score heuristics (always runs)
 *   Phase 2: Extract structured fields per email (--extract or --dry-run)
 *   Phase 3: Build thread intelligence (--extract or --dry-run)
 *   Phase 4: Analyze outbound patterns (--extract or --dry-run)
 *
 * Flags:
 *   --extract   Enable phases 2-4 with Ollama enrichment
 *   --dry-run   Enable phases 2-4 with deterministic extraction only (no Ollama)
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
 *   data/email-references/generated/goldmine/extracted-fields.json    (phases 2-4)
 *   data/email-references/generated/goldmine/thread-intelligence.json (phases 2-4)
 *   data/email-references/generated/goldmine/outbound-patterns.json   (phases 2-4)
 *
 * Run:
 *   npx tsx scripts/email-references/build-goldmine-reference.ts
 *   npx tsx scripts/email-references/build-goldmine-reference.ts --extract
 *   npx tsx scripts/email-references/build-goldmine-reference.ts --dry-run
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
import { extractAllDeterministicFields } from './deterministic-extractors.ts'
import {
  ollamaExtractFirstContact,
  ollamaExtractFollowUp,
  testOllamaConnection,
} from './ollama-extractors.ts'
import { analyzeOutboundEmail, type OutboundContext } from './outbound-analyzer.ts'
import { buildThreadIntelligence, type ThreadMessage } from './thread-intelligence.ts'
import type {
  EmailExtraction,
  ExtractionStatus,
  OutboundAnalysis,
  ThreadIntelligence,
} from './extraction-types.ts'

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
    extract: args.includes('--extract'),
    dryRun: args.includes('--dry-run'),
  }
}

async function main() {
  const { inputFile, outDir, extract, dryRun } = parseArgs()
  const runExtraction = extract || dryRun
  const useOllama = extract && !dryRun

  if (runExtraction) {
    console.log(
      `Mode: ${dryRun ? 'DRY-RUN (deterministic only)' : 'FULL EXTRACTION (deterministic + Ollama)'}`
    )
  }

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

  // ─── Phases 2-4: Extraction, Thread Intelligence, Outbound Analysis ──

  let extractedFields: Record<string, any> | null = null
  let threadIntelligenceOutput: Record<string, any> | null = null
  let outboundPatternsOutput: Record<string, any> | null = null

  if (runExtraction) {
    // Test Ollama connection if needed
    let ollamaAvailable = false
    if (useOllama) {
      console.log('\nTesting Ollama connection...')
      ollamaAvailable = await testOllamaConnection()
      if (ollamaAvailable) {
        console.log('  Ollama is online')
      } else {
        console.log('  Ollama is offline — falling back to deterministic-only extraction')
      }
    }

    const effectiveOllama = useOllama && ollamaAvailable

    // ── Phase 2: Extract structured fields per email ──
    console.log('\nPhase 2: Extracting structured fields...')
    const extractions = new Map<string, EmailExtraction>()
    let ollamaSucceeded = 0
    let ollamaFailed = 0
    let deterministicOnly = 0

    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      const det = extractAllDeterministicFields(r.email.subject, r.email.body)

      let enriched = null
      let followUp = null
      let outbound: OutboundAnalysis | null = null
      let status: ExtractionStatus = 'deterministic_only'

      // First-contact or partner emails: full Ollama extraction
      if (
        effectiveOllama &&
        (r.category === 'direct_first_contact' || r.category === 'partner_ember')
      ) {
        enriched = await ollamaExtractFirstContact(r.email.body)
        if (enriched) {
          status = 'complete'
          ollamaSucceeded++
        } else {
          status = 'ollama_failed'
          ollamaFailed++
        }
      }

      // Follow-up emails: incremental extraction with thread context
      if (effectiveOllama && r.category === 'direct_followup') {
        // Build thread context from prior messages
        const priorMessages = records
          .filter((pr) => pr.threadId === r.threadId && pr.threadPosition < r.threadPosition)
          .map((pr) => `[${pr.category}] ${pr.email.from.name}: ${pr.email.body.slice(0, 200)}`)
          .join('\n---\n')

        if (priorMessages) {
          followUp = await ollamaExtractFollowUp(r.email.body, priorMessages)
          if (followUp) {
            status = 'complete'
            ollamaSucceeded++
          } else {
            status = 'ollama_failed'
            ollamaFailed++
          }
        }
      }

      // Outbound emails: analyze in Phase 4 (just deterministic here)
      if (r.category === 'outbound') {
        // Find previous inbound message in the same thread
        const priorInbound = records
          .filter(
            (pr) =>
              pr.threadId === r.threadId &&
              pr.threadPosition < r.threadPosition &&
              pr.category !== 'outbound'
          )
          .sort((a, b) => b.threadPosition - a.threadPosition)[0]

        const context: OutboundContext = {
          previousInboundDate: priorInbound?.email.date || null,
          previousInboundMessageId: priorInbound?.email.messageId || null,
        }

        outbound = await analyzeOutboundEmail(r.email.body, r.email.date, context, effectiveOllama)
        status = effectiveOllama ? 'complete' : 'deterministic_only'
      }

      if (status === 'deterministic_only') deterministicOnly++

      extractions.set(r.email.messageId, {
        message_id: r.email.messageId,
        category: r.category,
        extraction_status: status,
        deterministic: det,
        enriched,
        follow_up: followUp,
        outbound,
      })

      // Progress indicator every 50 emails
      if ((i + 1) % 50 === 0 || i === records.length - 1) {
        console.log(`  Processed ${i + 1}/${records.length} emails`)
      }
    }

    console.log(
      `  Ollama succeeded: ${ollamaSucceeded}, failed: ${ollamaFailed}, deterministic-only: ${deterministicOnly}`
    )

    // ── Phase 3: Build thread intelligence ──
    console.log('\nPhase 3: Building thread intelligence...')

    // Find the dataset end date (latest email date)
    const allDates = records.map((r) => new Date(r.email.date).getTime()).filter((d) => !isNaN(d))
    const datasetEndDate = new Date(Math.max(...allDates))

    const threadIntelMap: Record<string, ThreadIntelligence> = {}
    for (const [threadId, msgs] of threads) {
      const threadMessages: ThreadMessage[] = msgs.map((m) => {
        const rec = records.find((r) => r.email.messageId === m.messageId)
        return {
          message_id: m.messageId,
          from_email: m.from.email,
          date: m.date,
          subject: m.subject,
          body: m.body,
          category: rec?.category || 'unknown',
        }
      })

      threadIntelMap[threadId] = buildThreadIntelligence(
        threadId,
        threadMessages,
        extractions,
        CHEF_EMAIL,
        datasetEndDate
      )
    }

    // Aggregate stats
    const outcomes = Object.values(threadIntelMap).map((t) => t.outcome)
    const outcomeDist: Record<string, number> = {}
    for (const o of outcomes) outcomeDist[o] = (outcomeDist[o] || 0) + 1

    const responseTimes = Object.values(threadIntelMap)
      .map((t) => t.first_response_minutes)
      .filter((t): t is number => t !== null)
    const avgResponseMinutes =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : null
    const medianResponseMinutes =
      responseTimes.length > 0
        ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)]
        : null

    const bookedCount = outcomeDist['booked'] || 0
    const totalNonUnknown = outcomes.filter((o) => o !== 'unknown').length
    const conversionRate =
      totalNonUnknown > 0 ? Number((bookedCount / totalNonUnknown).toFixed(3)) : 0

    console.log(`  Threads analyzed: ${Object.keys(threadIntelMap).length}`)
    console.log(`  Outcomes: ${JSON.stringify(outcomeDist)}`)
    console.log(`  Conversion rate: ${(conversionRate * 100).toFixed(1)}%`)

    // ── Phase 4: Outbound pattern aggregation ──
    console.log('\nPhase 4: Aggregating outbound patterns...')

    const outboundExtractions = Array.from(extractions.values()).filter(
      (e) => e.category === 'outbound' && e.outbound
    )

    const latencies = outboundExtractions
      .map((e) => e.outbound!.latency_minutes)
      .filter((l): l is number => l !== null && l > 0)

    const pricingEmails = outboundExtractions.filter((e) => e.outbound!.contains_pricing)

    const menuItemFreq: FrequencyMap = new Map()
    for (const e of outboundExtractions) {
      for (const item of e.outbound!.menu_items_mentioned) {
        increment(menuItemFreq, item.toLowerCase())
      }
    }

    const toneFreq: FrequencyMap = new Map()
    for (const e of outboundExtractions) {
      if (e.outbound!.tone) increment(toneFreq, e.outbound!.tone)
    }

    const signOffFreq: FrequencyMap = new Map()
    for (const e of outboundExtractions) {
      if (e.outbound!.sign_off_style) increment(signOffFreq, e.outbound!.sign_off_style)
    }

    // Latency distribution
    const latencyDist = {
      '<15min': latencies.filter((l) => l < 15).length,
      '15-60min': latencies.filter((l) => l >= 15 && l < 60).length,
      '1-4hr': latencies.filter((l) => l >= 60 && l < 240).length,
      '4-24hr': latencies.filter((l) => l >= 240 && l < 1440).length,
      '>24hr': latencies.filter((l) => l >= 1440).length,
    }

    const avgLatency =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : null
    const medianLatency =
      latencies.length > 0
        ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)]
        : null

    console.log(`  Outbound emails analyzed: ${outboundExtractions.length}`)
    console.log(`  With pricing: ${pricingEmails.length}`)
    console.log(`  Menu items found: ${menuItemFreq.size} unique`)

    // Build output objects
    extractedFields = {
      generated_at: summary.generated_at,
      extraction_config: {
        ollama_available: ollamaAvailable,
        deterministic_only: !effectiveOllama,
      },
      extractions: Object.fromEntries(
        Array.from(extractions.entries()).map(([id, e]) => [
          id,
          {
            category: e.category,
            extraction_status: e.extraction_status,
            deterministic: e.deterministic,
            enriched: e.enriched,
            follow_up: e.follow_up,
            outbound: e.outbound,
          },
        ])
      ),
      stats: {
        total: records.length,
        ollama_succeeded: ollamaSucceeded,
        ollama_failed: ollamaFailed,
        deterministic_only: deterministicOnly,
      },
    }

    threadIntelligenceOutput = {
      generated_at: summary.generated_at,
      threads: threadIntelMap,
      aggregate_stats: {
        total_threads: Object.keys(threadIntelMap).length,
        outcome_distribution: outcomeDist,
        avg_first_response_minutes: avgResponseMinutes,
        median_first_response_minutes: medianResponseMinutes,
        conversion_rate: conversionRate,
      },
    }

    outboundPatternsOutput = {
      generated_at: summary.generated_at,
      total_outbound: outboundExtractions.length,
      response_latency: {
        avg_minutes: avgLatency,
        median_minutes: medianLatency,
        distribution: latencyDist,
      },
      pricing_patterns: {
        emails_with_pricing: pricingEmails.length,
        amounts: pricingEmails.slice(0, 20).map((e) => ({
          amount_cents: e.outbound!.quoted_amount_cents,
          per_person: e.outbound!.per_person_rate_cents !== null,
          guest_count: e.outbound!.guest_count_for_pricing,
        })),
      },
      menu_patterns: {
        most_mentioned_items: topN(menuItemFreq, 30),
      },
      tone_distribution: Object.fromEntries(toneFreq),
      sign_off_styles: topN(signOffFreq, 10),
    }

    // Enrich regression fixtures with extraction data
    for (const f of fixtures.fixtures) {
      const ext = extractions.get(f.message_id)
      if (ext) {
        ;(f as any).extracted_fields = {
          extraction_status: ext.extraction_status,
          deterministic: ext.deterministic,
          enriched: ext.enriched,
          follow_up: ext.follow_up,
          outbound: ext.outbound,
        }
      }
    }
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

  // Add extraction report sections if phases 2-4 ran
  if (threadIntelligenceOutput) {
    const stats = threadIntelligenceOutput.aggregate_stats
    lines.push(
      '',
      '## Thread Intelligence Summary',
      '',
      `- Threads analyzed: ${stats.total_threads}`,
      `- Outcomes: ${Object.entries(stats.outcome_distribution as Record<string, number>)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}`,
      `- Conversion rate: ${((stats.conversion_rate as number) * 100).toFixed(1)}%`,
      `- Avg first response: ${stats.avg_first_response_minutes ?? 'N/A'} min`,
      `- Median first response: ${stats.median_first_response_minutes ?? 'N/A'} min`
    )
  }

  if (outboundPatternsOutput) {
    lines.push(
      '',
      '## Outbound Pattern Highlights',
      '',
      `- Outbound emails analyzed: ${outboundPatternsOutput.total_outbound}`,
      `- Avg response latency: ${outboundPatternsOutput.response_latency.avg_minutes ?? 'N/A'} min`,
      `- Emails with pricing: ${outboundPatternsOutput.pricing_patterns.emails_with_pricing}`,
      `- Unique menu items: ${outboundPatternsOutput.menu_patterns.most_mentioned_items.length}`
    )
  }

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

  console.log('\nBuild complete — Phase 1')
  console.log(`  Summary:  ${summaryPath}`)
  console.log(`  Fixtures: ${fixturesPath}`)
  console.log(`  Threads:  ${threadMapPath}`)
  console.log(`  Rulepack: ${rulepackPath}`)
  console.log(`  Report:   ${reportPath}`)
  console.log(`\n  Categories: ${JSON.stringify(categoryCounts)}`)
  console.log(
    `  Heuristic catch rate (first contacts, score≥2): ${(summary.heuristic_accuracy.catch_rate_medium * 100).toFixed(0)}%`
  )

  // Write extraction artifacts if phases 2-4 ran
  if (extractedFields) {
    const extractedPath = path.join(outDir, 'extracted-fields.json')
    writeFileSync(extractedPath, JSON.stringify(extractedFields, null, 2))
    console.log(`\n  Extracted: ${extractedPath}`)
  }

  if (threadIntelligenceOutput) {
    const threadIntelPath = path.join(outDir, 'thread-intelligence.json')
    writeFileSync(threadIntelPath, JSON.stringify(threadIntelligenceOutput, null, 2))
    console.log(`  Thread Intel: ${threadIntelPath}`)
  }

  if (outboundPatternsOutput) {
    const outboundPath = path.join(outDir, 'outbound-patterns.json')
    writeFileSync(outboundPath, JSON.stringify(outboundPatternsOutput, null, 2))
    console.log(`  Outbound: ${outboundPath}`)
  }
}

main()
