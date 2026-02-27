'use server'

// Prospecting Hub — AI Scrub Actions (v2.1 — deep intelligence)
// Uses local Ollama for lead generation + web search enrichment.
// Admin-only. All prospect data is public.
//
// v2 improvements:
// - #1  Reality check, #2 Fuzzy dedup, #3 Lead scoring
// - #5  Phase time budgets, #6 Smarter extraction, #7 Rate limiting
// - #8  Partial failure, #9 Enriched approach data, #10 Re-enrich
//
// v2.1 additions:
// - Deep crawl: scrapes contact/events/about pages, not just homepage
// - News intelligence: searches for recent press/news about each prospect
// - Cold email draft: AI generates personalized outreach email per prospect
// - Staleness tracking: last_enriched_at timestamp for decay detection
// - Batch re-enrich: refresh all stale/unverified prospects at once

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { searchWeb, readWebPage } from '@/lib/ai/remy-web-actions'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import {
  SCRUB_SYSTEM_PROMPT,
  buildScrubUserPrompt,
  APPROACH_SYSTEM_PROMPT,
  buildApproachUserPrompt,
  COLD_EMAIL_SYSTEM_PROMPT,
  buildColdEmailPrompt,
} from './scrub-prompt'
import { computeLeadScore } from './lead-scoring'

// ── Zod Schema for AI output ─────────────────────────────────────────────────

const ProspectFromAI = z.object({
  name: z.string(),
  prospectType: z.enum(['organization', 'individual']).default('organization'),
  category: z.string().default('other'),
  description: z.string().optional().default(''),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  zip: z.string().optional().default(''),
  region: z.string().optional().default(''),
  contactPerson: z.string().optional().default(''),
  contactTitle: z.string().optional().default(''),
  gatekeeperNotes: z.string().optional().default(''),
  bestTimeToCall: z.string().optional().default(''),
  annualEventsEstimate: z.string().optional().default(''),
  membershipSize: z.string().optional().default(''),
  avgEventBudget: z.string().optional().default(''),
  eventTypesHosted: z.array(z.string()).optional().default([]),
  seasonalNotes: z.string().optional().default(''),
  luxuryIndicators: z.array(z.string()).optional().default([]),
  talkingPoints: z.string().optional().default(''),
  approachStrategy: z.string().optional().default(''),
  competitorsPresent: z.string().optional().default(''),
})

const ProspectArrayFromAI = z.object({
  prospects: z.array(ProspectFromAI),
})

const ApproachFromAI = z.object({
  talkingPoints: z.string(),
  approachStrategy: z.string(),
})

const ColdEmailFromAI = z.object({
  subject: z.string(),
  body: z.string(),
})

// ── Ollama-safe limits ──────────────────────────────────────────────────────
// Local Ollama — hard limits to prevent maxing out the machine.

const MAX_PROSPECTS_PER_SCRUB = 10
const MAX_WEB_ENRICHMENTS = 5
const MAX_APPROACH_CALLS = 5
const MAX_EMAIL_DRAFTS = 5
const APPROACH_COOLDOWN_MS = 3_000
const MAX_CONSECUTIVE_FAILURES = 2
const MAX_DEEP_CRAWL_PAGES = 3 // Contact, events, about pages per prospect

// Phase time budgets (ms) — each phase gets its own deadline
const PHASE_1_TIMEOUT_MS = 120_000 // 2 min for Ollama generation
const PHASE_VALIDATE_TIMEOUT_MS = 60_000 // 1 min for reality checks
const PHASE_2_TIMEOUT_MS = 120_000 // 2 min for deep web enrichment (more pages now)
const PHASE_3_TIMEOUT_MS = 90_000 // 1.5 min for approach strategies
const PHASE_4_TIMEOUT_MS = 90_000 // 1.5 min for cold email drafts

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

// ── Name normalization for fuzzy dedup (#2) ─────────────────────────────────

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '') // strip leading articles
    .replace(/[''`]/g, '') // strip apostrophes/quotes
    .replace(/[^a-z0-9\s]/g, '') // strip all non-alphanumeric except spaces
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()
}

function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .replace(/^(north|south|east|west|n\.?|s\.?|e\.?|w\.?)\s*/i, (m) => {
      // Expand abbreviations: "N." → "north", keep full words as-is
      const abbrevMap: Record<string, string> = {
        n: 'north',
        'n.': 'north',
        s: 'south',
        's.': 'south',
        e: 'east',
        'e.': 'east',
        w: 'west',
        'w.': 'west',
      }
      const key = m.trim().toLowerCase()
      return (abbrevMap[key] ?? key) + ' '
    })
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Simple similarity check: returns true if two names are "close enough"
 * to be considered duplicates. Uses normalized Levenshtein distance.
 */
function isSimilarName(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (na === nb) return true
  // One contains the other (e.g., "Hamptons Yacht Club" contains "Hamptons Yacht")
  if (na.includes(nb) || nb.includes(na)) return true
  // Levenshtein for short names
  if (na.length < 5 || nb.length < 5) return na === nb
  const distance = levenshtein(na, nb)
  const maxLen = Math.max(na.length, nb.length)
  return distance / maxLen < 0.15 // 85% similar
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

// ── Smarter contact extraction (#6) ─────────────────────────────────────────

const PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const SOCIAL_PATTERNS: Record<string, RegExp> = {
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+/gi,
  facebook: /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9_.]+/gi,
  linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+/gi,
  twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+/gi,
}

// Keywords that indicate nearby text contains real contact info
const CONTACT_KEYWORDS = [
  'contact',
  'call us',
  'reach us',
  'phone',
  'tel:',
  'telephone',
  'email us',
  'get in touch',
  'inquiries',
  'reservations',
  'book',
  'events',
  'private dining',
  'catering',
  'membership',
]

const JUNK_EMAIL_PATTERNS = [
  'example.com',
  'sentry',
  'wixpress',
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'unsubscribe',
  'mailer-daemon',
  'wordpress',
  'cloudflare',
  'google.com',
  'schema.org',
]

function extractContactInfo(text: string) {
  // Split page into ~200-char windows around contact keywords
  const contactZones: string[] = []
  const lowerText = text.toLowerCase()

  for (const keyword of CONTACT_KEYWORDS) {
    let idx = lowerText.indexOf(keyword)
    while (idx !== -1) {
      const start = Math.max(0, idx - 300)
      const end = Math.min(text.length, idx + keyword.length + 300)
      contactZones.push(text.slice(start, end))
      idx = lowerText.indexOf(keyword, idx + 1)
    }
  }

  // Also always check the full text as fallback (lower priority)
  const priorityText = contactZones.join('\n')
  const fallbackText = text

  // Extract from priority zones first, fall back to full text
  const priorityPhones = [...new Set(priorityText.match(PHONE_REGEX) ?? [])]
  const fallbackPhones = [...new Set(fallbackText.match(PHONE_REGEX) ?? [])]
  const phones = priorityPhones.length > 0 ? priorityPhones : fallbackPhones

  const rawEmails = [
    ...new Set([
      ...(priorityText.match(EMAIL_REGEX) ?? []),
      ...(priorityPhones.length > 0 ? [] : (fallbackText.match(EMAIL_REGEX) ?? [])),
    ]),
  ]
  const emails = rawEmails.filter(
    (e) => !JUNK_EMAIL_PATTERNS.some((junk) => e.toLowerCase().includes(junk))
  )

  const social: Record<string, string> = {}
  for (const [platform, regex] of Object.entries(SOCIAL_PATTERNS)) {
    // Prefer matches from contact zones
    const zoneMatch = priorityText.match(regex)
    const fullMatch = fallbackText.match(regex)
    const match = zoneMatch?.[0] ?? fullMatch?.[0]
    if (match) social[platform] = match
  }

  return { phones, emails, social }
}

// ── Deep Crawl — find and scrape subpages ───────────────────────────────────

const SUBPAGE_PATTERNS = [
  /contact/i,
  /about/i,
  /events/i,
  /private[_-]?dining/i,
  /catering/i,
  /membership/i,
  /weddings/i,
  /meetings/i,
  /banquets/i,
  /book/i,
]

/**
 * Given a homepage URL, try to discover and read contact/events/about pages.
 * Returns combined text from all subpages + list of URLs scraped.
 */
async function deepCrawlSite(
  homepageUrl: string,
  homepageContent: string
): Promise<{ combinedText: string; urls: string[] }> {
  const urls: string[] = [homepageUrl]
  let combinedText = homepageContent

  // Extract links from homepage content
  const linkRegex = /href=["']([^"']+)["']/gi
  const links: string[] = []
  let match: RegExpExecArray | null
  while ((match = linkRegex.exec(homepageContent)) !== null) {
    links.push(match[1])
  }

  // Also look for common subpage paths
  let baseUrl: string
  try {
    const parsed = new URL(homepageUrl)
    baseUrl = `${parsed.protocol}//${parsed.host}`
  } catch {
    return { combinedText, urls }
  }

  // Deduplicate and filter to relevant subpages
  const candidateUrls = new Set<string>()
  for (const link of links) {
    let fullUrl: string
    try {
      fullUrl = link.startsWith('http') ? link : new URL(link, baseUrl).href
    } catch {
      continue
    }
    // Must be same domain
    try {
      if (new URL(fullUrl).host !== new URL(baseUrl).host) continue
    } catch {
      continue
    }
    // Must match a subpage pattern
    if (SUBPAGE_PATTERNS.some((p) => p.test(fullUrl))) {
      candidateUrls.add(fullUrl)
    }
  }

  // Also try common paths directly
  const commonPaths = ['/contact', '/events', '/about', '/private-dining', '/catering']
  for (const path of commonPaths) {
    candidateUrls.add(baseUrl + path)
  }

  // Crawl up to MAX_DEEP_CRAWL_PAGES subpages
  let crawled = 0
  for (const url of candidateUrls) {
    if (crawled >= MAX_DEEP_CRAWL_PAGES) break
    if (url === homepageUrl) continue
    try {
      const page = await readWebPage(url)
      if (page.content && page.content.length > 100) {
        combinedText += '\n\n--- PAGE: ' + url + ' ---\n' + page.content
        urls.push(url)
        crawled++
      }
    } catch {
      // Skip pages that fail
    }
  }

  return { combinedText, urls }
}

// ── Event Signal Detection (Wave 3) ─────────────────────────────────────────
// Extracts upcoming event names and dates from crawled page text.
// Looks for patterns like "April 15 — Spring Gala" or "Annual Member Dinner, March 2026"

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'jan',
  'feb',
  'mar',
  'apr',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
]
const MONTH_PATTERN = MONTH_NAMES.join('|')

// Matches lines containing a month name + year (2025/2026/2027) nearby
const EVENT_LINE_REGEX = new RegExp(
  `(?:^|\\n)([^\\n]*(?:${MONTH_PATTERN})\\s+\\d{1,2}[^\\n]*(?:202[5-7])[^\\n]*)` +
    `|(?:^|\\n)([^\\n]*(?:202[5-7])[^\\n]*(?:${MONTH_PATTERN})[^\\n]*)`,
  'gi'
)

// Event-related keywords that confirm a line is about an event, not random text
const EVENT_KEYWORDS = [
  'gala',
  'dinner',
  'reception',
  'fundraiser',
  'tournament',
  'banquet',
  'celebration',
  'ceremony',
  'party',
  'luncheon',
  'brunch',
  'cocktail',
  'wedding',
  'rehearsal',
  'tasting',
  'meeting',
  'conference',
  'retreat',
  'regatta',
  'concert',
  'festival',
  'mixer',
  'open house',
  'member',
  'holiday',
  'annual',
  'charity',
  'benefit',
  'auction',
  'soirée',
  'invitational',
  'social',
  'cookout',
  'bbq',
  'clambake',
]

function extractEventSignals(text: string): string | null {
  const lowerText = text.toLowerCase()
  const signals: string[] = []
  const seen = new Set<string>()

  // Method 1: Regex for date-containing lines
  let match: RegExpExecArray | null
  const regex = new RegExp(EVENT_LINE_REGEX.source, 'gi')
  while ((match = regex.exec(text)) !== null) {
    const line = (match[1] || match[2] || '').trim()
    if (!line || line.length > 200) continue
    const lowerLine = line.toLowerCase()
    // Must contain an event-ish keyword to reduce noise
    if (EVENT_KEYWORDS.some((kw) => lowerLine.includes(kw))) {
      const key = lowerLine.replace(/\s+/g, ' ').trim()
      if (!seen.has(key)) {
        seen.add(key)
        signals.push(line)
      }
    }
  }

  // Method 2: Scan for "upcoming events" sections
  const sectionStarts = [
    'upcoming events',
    'events calendar',
    "what's happening",
    'event schedule',
    'social calendar',
    'member events',
  ]
  for (const phrase of sectionStarts) {
    const idx = lowerText.indexOf(phrase)
    if (idx === -1) continue
    // Grab ~500 chars after the section header
    const section = text.slice(idx, idx + 500)
    const lines = section.split('\n').slice(1, 6) // Skip the header, grab next 5 lines
    for (const sectionLine of lines) {
      const trimmed = sectionLine.trim()
      if (trimmed.length < 10 || trimmed.length > 200) continue
      const lowerLine = trimmed.toLowerCase()
      const key = lowerLine.replace(/\s+/g, ' ')
      if (!seen.has(key)) {
        // Accept if it has an event keyword OR a month name
        if (
          EVENT_KEYWORDS.some((kw) => lowerLine.includes(kw)) ||
          MONTH_NAMES.some((m) => lowerLine.includes(m))
        ) {
          seen.add(key)
          signals.push(trimmed)
        }
      }
    }
  }

  if (signals.length === 0) return null
  return signals.slice(0, 8).join('\n') // Cap at 8 events
}

// ── News Intelligence ───────────────────────────────────────────────────────

async function gatherNewsIntel(
  name: string,
  city?: string | null,
  state?: string | null
): Promise<string | null> {
  try {
    const newsQuery = `"${name}" ${city ?? ''} ${state ?? ''} news event announcement 2025 OR 2026`
    const results = await searchWeb(newsQuery, 3)
    if (results.length === 0) return null

    const newsItems: string[] = []
    for (const result of results.slice(0, 2)) {
      // Build a summary line from the search result
      const title = result.title || result.url
      newsItems.push(`• ${title} (${result.url})`)
    }

    return newsItems.length > 0 ? newsItems.join('\n') : null
  } catch {
    return null
  }
}

// ── Progress helper ─────────────────────────────────────────────────────────

async function updateProgress(
  supabase: ReturnType<typeof createServerClient>,
  sessionId: string,
  message: string,
  extraFields?: Record<string, unknown>
) {
  await supabase
    .from('prospect_scrub_sessions')
    .update({ progress_message: message, ...extraFields })
    .eq('id', sessionId)
}

// ── Main Scrub Action ────────────────────────────────────────────────────────

export async function scrubProspects(query: string) {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  if (!query.trim()) throw new Error('Query is required')

  // #7 — Rate limiting: prevent concurrent scrubs
  const { data: activeSessions } = await supabase
    .from('prospect_scrub_sessions')
    .select('id, status')
    .eq('chef_id', user.tenantId!)
    .in('status', ['running', 'enriching'])

  if (activeSessions && activeSessions.length > 0) {
    throw new Error('A scrub is already in progress. Please wait for it to finish.')
  }

  // Create scrub session
  const { data: session, error: sessionError } = await supabase
    .from('prospect_scrub_sessions')
    .insert({
      chef_id: user.tenantId!,
      query: query.trim(),
      status: 'running',
      progress_message: 'Starting AI generation...',
    })
    .select()
    .single()

  if (sessionError || !session) {
    console.error('[scrubProspects] Session creation failed:', sessionError)
    throw new Error('Failed to create scrub session')
  }

  let insertedCount = 0

  try {
    // ─── Phase 1: Ollama generates prospect list ──────────────────────

    await updateProgress(supabase, session.id, 'Phase 1: AI is generating prospects...')

    const wrappedPrompt =
      SCRUB_SYSTEM_PROMPT +
      '\n\nIMPORTANT: Wrap your output in a JSON object with key "prospects" containing the array. Example: { "prospects": [...] }'

    let parsedResult: z.infer<typeof ProspectArrayFromAI>
    try {
      parsedResult = await parseWithOllama(
        wrappedPrompt,
        buildScrubUserPrompt(query),
        ProspectArrayFromAI,
        { timeoutMs: PHASE_1_TIMEOUT_MS }
      )
    } catch (err) {
      // Phase 1 failure = real failure, no prospects to show
      await supabase
        .from('prospect_scrub_sessions')
        .update({
          status: 'failed',
          error_message: 'AI returned invalid response',
          progress_message: 'Failed: AI did not return valid data',
        })
        .eq('id', session.id)
      throw new Error('AI returned invalid response. Please try again.')
    }

    const prospects = parsedResult.prospects.slice(0, MAX_PROSPECTS_PER_SCRUB)

    if (prospects.length === 0) {
      await supabase
        .from('prospect_scrub_sessions')
        .update({
          status: 'failed',
          error_message: 'No valid prospects generated',
          progress_message: 'Failed: no prospects generated',
        })
        .eq('id', session.id)
      throw new Error('AI did not generate any valid prospects. Try a different query.')
    }

    // ─── Phase 1b: Reality check — web-validate each prospect (#1) ───

    await updateProgress(
      supabase,
      session.id,
      `Validating ${prospects.length} prospects against the web...`
    )

    const validateStart = Date.now()
    const validatedProspects: Array<z.infer<typeof ProspectFromAI> & { verified: boolean }> = []

    for (const prospect of prospects) {
      if (Date.now() - validateStart > PHASE_VALIDATE_TIMEOUT_MS) {
        // Time's up — accept remaining as unverified rather than dropping them
        const remaining = prospects.slice(validatedProspects.length)
        for (const p of remaining) {
          validatedProspects.push({ ...p, verified: false })
        }
        console.warn(
          `[scrub-validate] Hit time limit, ${remaining.length} prospects accepted unverified`
        )
        break
      }

      try {
        const searchQuery = `"${prospect.name}" ${prospect.city ?? ''} ${prospect.state ?? ''}`
        const results = await searchWeb(searchQuery, 2)
        // If web search found something with a matching-ish name, it's verified
        const verified = results.length > 0
        validatedProspects.push({ ...prospect, verified })
      } catch {
        // Search failed — accept as unverified, don't drop
        validatedProspects.push({ ...prospect, verified: false })
      }
    }

    // ─── Fuzzy deduplication (#2) ────────────────────────────────────

    await updateProgress(supabase, session.id, 'Deduplicating against existing prospects...')

    const { data: existing } = await supabase
      .from('prospects')
      .select('name, city')
      .eq('chef_id', user.tenantId!)

    const existingList = (existing ?? []).map((e) => ({
      name: e.name ?? '',
      city: e.city ?? '',
    }))

    const newProspects = validatedProspects.filter((p) => {
      return !existingList.some(
        (e) =>
          isSimilarName(p.name, e.name) &&
          (normalizeCity(p.city ?? '') === normalizeCity(e.city ?? '') ||
            !(p.city ?? '') ||
            !(e.city ?? ''))
      )
    })

    // ─── Insert into DB with initial lead score ─────────────────────

    const insertRows = newProspects.map((p) => ({
      chef_id: user.tenantId!,
      scrub_session_id: session.id,
      name: p.name,
      prospect_type: p.prospectType,
      category: p.category,
      description: p.description || null,
      address: p.address || null,
      city: p.city || null,
      state: p.state || null,
      zip: p.zip || null,
      region: p.region || null,
      contact_person: p.contactPerson || null,
      contact_title: p.contactTitle || null,
      gatekeeper_notes: p.gatekeeperNotes || null,
      best_time_to_call: p.bestTimeToCall || null,
      annual_events_estimate: p.annualEventsEstimate || null,
      membership_size: p.membershipSize || null,
      avg_event_budget: p.avgEventBudget || null,
      event_types_hosted: p.eventTypesHosted?.length ? p.eventTypesHosted : null,
      seasonal_notes: p.seasonalNotes || null,
      luxury_indicators: p.luxuryIndicators?.length ? p.luxuryIndicators : null,
      talking_points: p.talkingPoints || null,
      approach_strategy: p.approachStrategy || null,
      competitors_present: p.competitorsPresent || null,
      source: 'ai_scrub' as const,
      verified: p.verified,
      lead_score: computeLeadScore({
        avgEventBudget: p.avgEventBudget,
        annualEventsEstimate: p.annualEventsEstimate,
        luxuryIndicators: p.luxuryIndicators,
        eventTypesHosted: p.eventTypesHosted,
        membershipSize: p.membershipSize,
        category: p.category,
        contactPerson: p.contactPerson,
        verified: p.verified,
      }),
    }))

    if (insertRows.length > 0) {
      const { error: insertError } = await supabase.from('prospects').insert(insertRows)
      if (insertError) {
        console.error('[scrubProspects] Insert error:', insertError)
      }
    }

    insertedCount = insertRows.length

    await updateProgress(
      supabase,
      session.id,
      `Generated ${insertRows.length} prospects. Starting enrichment...`,
      {
        prospect_count: insertRows.length,
        status: 'enriching',
      }
    )

    // ─── Phase 2: Deep Web Enrichment + News Intel ─────────────────────

    const { data: insertedProspects } = await supabase
      .from('prospects')
      .select('id, name, city, state, region')
      .eq('scrub_session_id', session.id)

    let enrichedCount = 0
    const enrichSlice = (insertedProspects ?? []).slice(0, MAX_WEB_ENRICHMENTS)
    const enrichStart = Date.now()

    for (let i = 0; i < enrichSlice.length; i++) {
      if (Date.now() - enrichStart > PHASE_2_TIMEOUT_MS) {
        console.warn('[scrub-enrich] Hit phase time limit, skipping remaining enrichments')
        break
      }

      const prospect = enrichSlice[i]
      await updateProgress(
        supabase,
        session.id,
        `Deep-enriching ${i + 1}/${enrichSlice.length}: ${prospect.name}...`
      )

      try {
        const searchQuery = `${prospect.name} ${prospect.city ?? ''} ${prospect.state ?? ''} phone contact events`
        const results = await searchWeb(searchQuery, 3)
        if (results.length === 0) continue

        const topUrl = results[0].url
        const enrichUpdates: Record<string, unknown> = {}

        if (topUrl) {
          try {
            const homePage = await readWebPage(topUrl)
            enrichUpdates.website = topUrl

            // Deep crawl: also scrape contact/events/about pages
            const { combinedText, urls: scrapedUrls } = await deepCrawlSite(
              topUrl,
              homePage.content
            )
            enrichUpdates.enrichment_sources = scrapedUrls

            // Extract contact info from ALL scraped pages combined
            const contactInfo = extractContactInfo(combinedText)
            if (contactInfo.phones.length > 0) enrichUpdates.phone = contactInfo.phones[0]
            if (contactInfo.phones.length > 1)
              enrichUpdates.contact_direct_phone = contactInfo.phones[1]
            if (contactInfo.emails.length > 0) enrichUpdates.email = contactInfo.emails[0]
            if (contactInfo.emails.length > 1)
              enrichUpdates.contact_direct_email = contactInfo.emails[1]
            if (Object.keys(contactInfo.social).length > 0)
              enrichUpdates.social_profiles = contactInfo.social

            // Wave 3: Extract event signals from crawled pages
            const eventSignals = extractEventSignals(combinedText)
            if (eventSignals) enrichUpdates.event_signals = eventSignals
          } catch (err) {
            console.warn(`[scrub-enrich] Failed to read ${topUrl}:`, err)
          }
        }

        // News intelligence — search for recent press/news
        await updateProgress(supabase, session.id, `Gathering news on ${prospect.name}...`)
        const newsIntel = await gatherNewsIntel(prospect.name, prospect.city, prospect.state)
        if (newsIntel) enrichUpdates.news_intel = newsIntel

        if (Object.keys(enrichUpdates).length > 0) {
          enrichUpdates.source = 'web_enriched'
          enrichUpdates.last_enriched_at = new Date().toISOString()

          // Recompute lead score with enrichment data
          const { data: currentProspect } = await supabase
            .from('prospects')
            .select('*')
            .eq('id', prospect.id)
            .single()

          if (currentProspect) {
            enrichUpdates.lead_score = computeLeadScore({
              avgEventBudget: currentProspect.avg_event_budget,
              annualEventsEstimate: currentProspect.annual_events_estimate,
              luxuryIndicators: currentProspect.luxury_indicators,
              eventTypesHosted: currentProspect.event_types_hosted,
              membershipSize: currentProspect.membership_size,
              category: currentProspect.category,
              contactPerson: currentProspect.contact_person,
              verified: currentProspect.verified,
              phone: (enrichUpdates.phone as string) ?? currentProspect.phone,
              email: (enrichUpdates.email as string) ?? currentProspect.email,
              website: (enrichUpdates.website as string) ?? currentProspect.website,
              contactDirectPhone:
                (enrichUpdates.contact_direct_phone as string) ??
                currentProspect.contact_direct_phone,
              socialProfiles:
                (enrichUpdates.social_profiles as Record<string, string>) ??
                (currentProspect.social_profiles as Record<string, string>),
              eventSignals:
                (enrichUpdates.event_signals as string) ?? currentProspect.event_signals,
            })
          }

          await supabase.from('prospects').update(enrichUpdates).eq('id', prospect.id)
          enrichedCount++
        }
      } catch (err) {
        console.warn(`[scrub-enrich] Failed for ${prospect.name}:`, err)
      }
    }

    // ─── Phase 3: AI Approach (#5 time budget, #9 pass enriched data) ────

    await updateProgress(
      supabase,
      session.id,
      `Enriched ${enrichedCount}. Generating approach strategies...`
    )

    const approachSlice = (insertedProspects ?? []).slice(0, MAX_APPROACH_CALLS)
    let consecutiveFailures = 0
    const approachStart = Date.now()

    for (let i = 0; i < approachSlice.length; i++) {
      if (Date.now() - approachStart > PHASE_3_TIMEOUT_MS) {
        console.warn('[scrub-approach] Hit phase time limit, skipping remaining approach calls')
        break
      }
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.warn(`[scrub-approach] ${consecutiveFailures} consecutive failures, stopping`)
        break
      }

      const prospect = approachSlice[i]
      await updateProgress(
        supabase,
        session.id,
        `Strategy ${i + 1}/${approachSlice.length}: ${prospect.name}...`
      )

      try {
        if (i > 0) await sleep(APPROACH_COOLDOWN_MS)

        const { data: fullProspect } = await supabase
          .from('prospects')
          .select('*')
          .eq('id', prospect.id)
          .single()

        if (!fullProspect) continue

        // #9 — BUG FIX: Build enriched details string from web data
        const enrichedLines: string[] = []
        if (fullProspect.website) enrichedLines.push(`Website: ${fullProspect.website}`)
        if (fullProspect.phone) enrichedLines.push(`Phone: ${fullProspect.phone}`)
        if (fullProspect.email) enrichedLines.push(`Email: ${fullProspect.email}`)
        if (fullProspect.contact_direct_phone)
          enrichedLines.push(`Direct phone: ${fullProspect.contact_direct_phone}`)
        if (fullProspect.contact_direct_email)
          enrichedLines.push(`Direct email: ${fullProspect.contact_direct_email}`)
        const socialProfiles = fullProspect.social_profiles as Record<string, string> | null
        if (socialProfiles && Object.keys(socialProfiles).length > 0) {
          for (const [platform, url] of Object.entries(socialProfiles)) {
            enrichedLines.push(`${platform}: ${url}`)
          }
        }
        if (fullProspect.verified) enrichedLines.push('Verified: confirmed to exist via web search')

        const approachResult = await parseWithOllama(
          APPROACH_SYSTEM_PROMPT,
          buildApproachUserPrompt({
            name: fullProspect.name,
            category: fullProspect.category,
            description: fullProspect.description,
            city: fullProspect.city,
            state: fullProspect.state,
            annualEventsEstimate: fullProspect.annual_events_estimate,
            avgEventBudget: fullProspect.avg_event_budget,
            eventTypesHosted: fullProspect.event_types_hosted,
            competitorsPresent: fullProspect.competitors_present,
            luxuryIndicators: fullProspect.luxury_indicators,
            enrichedDetails: enrichedLines.length > 0 ? enrichedLines.join('\n') : null,
            newsIntel: fullProspect.news_intel,
          }),
          ApproachFromAI,
          { modelTier: 'fast', timeoutMs: 45_000 }
        )

        await supabase
          .from('prospects')
          .update({
            talking_points: approachResult.talkingPoints,
            approach_strategy: approachResult.approachStrategy,
          })
          .eq('id', prospect.id)

        consecutiveFailures = 0
      } catch (err) {
        consecutiveFailures++
        console.warn(
          `[scrub-approach] Failed for ${prospect.name} (${consecutiveFailures} consecutive):`,
          err
        )
      }
    }

    // ─── Phase 4: Cold Email Drafts ────────────────────────────────────

    await updateProgress(supabase, session.id, 'Drafting personalized outreach emails...')

    const emailSlice = (insertedProspects ?? []).slice(0, MAX_EMAIL_DRAFTS)
    let emailConsecutiveFailures = 0
    const emailStart = Date.now()

    for (let i = 0; i < emailSlice.length; i++) {
      if (Date.now() - emailStart > PHASE_4_TIMEOUT_MS) {
        console.warn('[scrub-email] Hit phase time limit, skipping remaining email drafts')
        break
      }
      if (emailConsecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.warn(`[scrub-email] ${emailConsecutiveFailures} consecutive failures, stopping`)
        break
      }

      const prospect = emailSlice[i]
      await updateProgress(
        supabase,
        session.id,
        `Drafting email ${i + 1}/${emailSlice.length}: ${prospect.name}...`
      )

      try {
        if (i > 0) await sleep(APPROACH_COOLDOWN_MS)

        const { data: fullProspect } = await supabase
          .from('prospects')
          .select('*')
          .eq('id', prospect.id)
          .single()

        if (!fullProspect) continue

        // Build enriched details for the email prompt
        const enrichedLines: string[] = []
        if (fullProspect.website) enrichedLines.push(`Website: ${fullProspect.website}`)
        if (fullProspect.phone) enrichedLines.push(`Phone: ${fullProspect.phone}`)
        if (fullProspect.email) enrichedLines.push(`Email: ${fullProspect.email}`)

        const emailResult = await parseWithOllama(
          COLD_EMAIL_SYSTEM_PROMPT,
          buildColdEmailPrompt({
            name: fullProspect.name,
            category: fullProspect.category,
            prospectType: fullProspect.prospect_type,
            description: fullProspect.description,
            city: fullProspect.city,
            state: fullProspect.state,
            contactPerson: fullProspect.contact_person,
            contactTitle: fullProspect.contact_title,
            eventTypesHosted: fullProspect.event_types_hosted,
            luxuryIndicators: fullProspect.luxury_indicators,
            talkingPoints: fullProspect.talking_points,
            approachStrategy: fullProspect.approach_strategy,
            newsIntel: fullProspect.news_intel,
            enrichedDetails: enrichedLines.length > 0 ? enrichedLines.join('\n') : null,
          }),
          ColdEmailFromAI,
          { modelTier: 'fast', timeoutMs: 45_000 }
        )

        const draftEmail = `Subject: ${emailResult.subject}\n\n${emailResult.body}`
        await supabase.from('prospects').update({ draft_email: draftEmail }).eq('id', prospect.id)

        emailConsecutiveFailures = 0
      } catch (err) {
        emailConsecutiveFailures++
        console.warn(
          `[scrub-email] Failed for ${prospect.name} (${emailConsecutiveFailures} consecutive):`,
          err
        )
      }
    }

    // ─── Finalize session ────────────────────────────────────────────

    await supabase
      .from('prospect_scrub_sessions')
      .update({
        status: 'completed',
        enriched_count: enrichedCount,
        progress_message: `Done! ${insertedCount} prospects, ${enrichedCount} enriched.`,
      })
      .eq('id', session.id)

    revalidatePath('/prospecting')
    revalidatePath('/prospecting/scrub')

    return {
      success: true as const,
      sessionId: session.id,
      totalGenerated: insertedCount,
      duplicatesSkipped: prospects.length - insertedCount,
      enriched: enrichedCount,
    }
  } catch (err) {
    // #8 — Partial failure: if we already inserted prospects, mark completed-with-warning
    if (insertedCount > 0) {
      await supabase
        .from('prospect_scrub_sessions')
        .update({
          status: 'completed',
          prospect_count: insertedCount,
          error_message: `Partial: ${err instanceof Error ? err.message : String(err)}`,
          progress_message: `Completed with warnings. ${insertedCount} prospects saved.`,
        })
        .eq('id', session.id)
        .then(() => {})

      revalidatePath('/prospecting')
      revalidatePath('/prospecting/scrub')

      return {
        success: true as const,
        sessionId: session.id,
        totalGenerated: insertedCount,
        duplicatesSkipped: 0,
        enriched: 0,
      }
    }

    // True failure — Phase 1 produced nothing
    await supabase
      .from('prospect_scrub_sessions')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : String(err),
        progress_message: 'Failed: ' + (err instanceof Error ? err.message : String(err)),
      })
      .eq('id', session.id)
      .then(() => {})

    throw err
  }
}

// ── Re-Enrich Action (#10) ──────────────────────────────────────────────────
// Run enrichment + approach on a single existing prospect.

export async function reEnrichProspect(prospectId: string) {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: prospect, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (error || !prospect) {
    throw new Error('Prospect not found')
  }

  const enrichUpdates: Record<string, unknown> = {}

  // Step 1: Deep web enrichment
  try {
    const searchQuery = `${prospect.name} ${prospect.city ?? ''} ${prospect.state ?? ''} phone contact events`
    const results = await searchWeb(searchQuery, 3)

    if (results.length > 0) {
      enrichUpdates.verified = true

      const topUrl = results[0].url
      if (topUrl) {
        try {
          const homePage = await readWebPage(topUrl)
          enrichUpdates.website = topUrl

          // Deep crawl subpages
          const { combinedText, urls: scrapedUrls } = await deepCrawlSite(topUrl, homePage.content)
          enrichUpdates.enrichment_sources = scrapedUrls

          const contactInfo = extractContactInfo(combinedText)
          if (contactInfo.phones.length > 0) enrichUpdates.phone = contactInfo.phones[0]
          if (contactInfo.phones.length > 1)
            enrichUpdates.contact_direct_phone = contactInfo.phones[1]
          if (contactInfo.emails.length > 0) enrichUpdates.email = contactInfo.emails[0]
          if (contactInfo.emails.length > 1)
            enrichUpdates.contact_direct_email = contactInfo.emails[1]
          if (Object.keys(contactInfo.social).length > 0)
            enrichUpdates.social_profiles = contactInfo.social

          // Wave 3: Extract event signals from crawled pages
          const eventSignals = extractEventSignals(combinedText)
          if (eventSignals) enrichUpdates.event_signals = eventSignals
        } catch (err) {
          console.warn(`[re-enrich] Failed to read pages:`, err)
        }
      }
    }
  } catch (err) {
    console.warn(`[re-enrich] Web search failed for ${prospect.name}:`, err)
  }

  // Step 2: News intelligence
  const newsIntel = await gatherNewsIntel(prospect.name, prospect.city, prospect.state)
  if (newsIntel) enrichUpdates.news_intel = newsIntel

  // Step 3: Build enriched details for AI calls
  const enrichedLines: string[] = []
  const website = (enrichUpdates.website as string) ?? prospect.website
  const phone = (enrichUpdates.phone as string) ?? prospect.phone
  const email = (enrichUpdates.email as string) ?? prospect.email
  if (website) enrichedLines.push(`Website: ${website}`)
  if (phone) enrichedLines.push(`Phone: ${phone}`)
  if (email) enrichedLines.push(`Email: ${email}`)
  const directPhone =
    (enrichUpdates.contact_direct_phone as string) ?? prospect.contact_direct_phone
  const directEmail =
    (enrichUpdates.contact_direct_email as string) ?? prospect.contact_direct_email
  if (directPhone) enrichedLines.push(`Direct phone: ${directPhone}`)
  if (directEmail) enrichedLines.push(`Direct email: ${directEmail}`)
  const social =
    (enrichUpdates.social_profiles as Record<string, string>) ??
    (prospect.social_profiles as Record<string, string> | null)
  if (social && Object.keys(social).length > 0) {
    for (const [platform, url] of Object.entries(social)) {
      enrichedLines.push(`${platform}: ${url}`)
    }
  }

  const enrichedDetailsStr = enrichedLines.length > 0 ? enrichedLines.join('\n') : null
  const currentNewsIntel = (enrichUpdates.news_intel as string) ?? prospect.news_intel

  // Step 4: Approach strategy (with news intel)
  try {
    const approachResult = await parseWithOllama(
      APPROACH_SYSTEM_PROMPT,
      buildApproachUserPrompt({
        name: prospect.name,
        category: prospect.category,
        description: prospect.description,
        city: prospect.city,
        state: prospect.state,
        annualEventsEstimate: prospect.annual_events_estimate,
        avgEventBudget: prospect.avg_event_budget,
        eventTypesHosted: prospect.event_types_hosted,
        competitorsPresent: prospect.competitors_present,
        luxuryIndicators: prospect.luxury_indicators,
        enrichedDetails: enrichedDetailsStr,
        newsIntel: currentNewsIntel,
      }),
      ApproachFromAI,
      { modelTier: 'fast', timeoutMs: 45_000 }
    )

    enrichUpdates.talking_points = approachResult.talkingPoints
    enrichUpdates.approach_strategy = approachResult.approachStrategy
  } catch (err) {
    console.warn(`[re-enrich] Approach generation failed for ${prospect.name}:`, err)
  }

  // Step 5: Cold email draft
  try {
    await sleep(APPROACH_COOLDOWN_MS)
    const emailResult = await parseWithOllama(
      COLD_EMAIL_SYSTEM_PROMPT,
      buildColdEmailPrompt({
        name: prospect.name,
        category: prospect.category,
        prospectType: prospect.prospect_type,
        description: prospect.description,
        city: prospect.city,
        state: prospect.state,
        contactPerson: prospect.contact_person,
        contactTitle: prospect.contact_title,
        eventTypesHosted: prospect.event_types_hosted,
        luxuryIndicators: prospect.luxury_indicators,
        talkingPoints: (enrichUpdates.talking_points as string) ?? prospect.talking_points,
        approachStrategy: (enrichUpdates.approach_strategy as string) ?? prospect.approach_strategy,
        newsIntel: currentNewsIntel,
        enrichedDetails: enrichedDetailsStr,
      }),
      ColdEmailFromAI,
      { modelTier: 'fast', timeoutMs: 45_000 }
    )
    enrichUpdates.draft_email = `Subject: ${emailResult.subject}\n\n${emailResult.body}`
  } catch (err) {
    console.warn(`[re-enrich] Email draft failed for ${prospect.name}:`, err)
  }

  // Step 6: Recompute lead score
  enrichUpdates.lead_score = computeLeadScore({
    avgEventBudget: prospect.avg_event_budget,
    annualEventsEstimate: prospect.annual_events_estimate,
    luxuryIndicators: prospect.luxury_indicators,
    eventTypesHosted: prospect.event_types_hosted,
    membershipSize: prospect.membership_size,
    category: prospect.category,
    contactPerson: prospect.contact_person,
    verified: (enrichUpdates.verified as boolean) ?? prospect.verified,
    phone: (enrichUpdates.phone as string) ?? prospect.phone,
    email: (enrichUpdates.email as string) ?? prospect.email,
    website: (enrichUpdates.website as string) ?? prospect.website,
    contactDirectPhone:
      (enrichUpdates.contact_direct_phone as string) ?? prospect.contact_direct_phone,
    socialProfiles:
      (enrichUpdates.social_profiles as Record<string, string>) ??
      (prospect.social_profiles as Record<string, string>),
    eventSignals: (enrichUpdates.event_signals as string) ?? prospect.event_signals,
  })

  enrichUpdates.source = 'web_enriched'
  enrichUpdates.last_enriched_at = new Date().toISOString()
  await supabase.from('prospects').update(enrichUpdates).eq('id', prospect.id)

  revalidatePath('/prospecting')
  return { success: true }
}

// ── Batch Re-Enrich ─────────────────────────────────────────────────────────
// Re-enrich all stale or unverified prospects at once.

export async function batchReEnrich() {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  // Find prospects that are stale (>14 days since enrichment) or never enriched
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: staleProspects } = await supabase
    .from('prospects')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .or(`last_enriched_at.is.null,last_enriched_at.lt.${fourteenDaysAgo},verified.eq.false`)
    .not('status', 'in', '("converted","dead")')
    .order('lead_score', { ascending: true }) // lowest scores first — most to gain
    .limit(10)

  if (!staleProspects || staleProspects.length === 0) {
    return { success: true, refreshed: 0, message: 'All prospects are fresh.' }
  }

  let refreshed = 0
  for (const prospect of staleProspects) {
    try {
      await reEnrichProspect(prospect.id)
      refreshed++
    } catch (err) {
      console.warn(`[batch-re-enrich] Failed for ${prospect.id}:`, err)
    }
    // Cooldown between prospects
    if (refreshed < staleProspects.length) await sleep(2_000)
  }

  revalidatePath('/prospecting')
  return {
    success: true,
    refreshed,
    total: staleProspects.length,
    message: `Refreshed ${refreshed}/${staleProspects.length} stale prospects.`,
  }
}

// ── Get Scrub Session Progress (for polling) ────────────────────────────────

export async function getScrubSessionProgress(sessionId: string) {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('prospect_scrub_sessions')
    .select('id, status, progress_message, prospect_count, enriched_count')
    .eq('id', sessionId)
    .eq('chef_id', user.tenantId!)
    .single()

  return data
}
