import { searchWeb, readWebPage } from '@/lib/ai/remy-web-actions'
import { computeLeadScore } from '../lead-scoring'
import { MAX_DEEP_CRAWL_PAGES } from './constants'

const PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const SOCIAL_PATTERNS: Record<string, RegExp> = {
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+/gi,
  facebook: /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9_.]+/gi,
  linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+/gi,
  twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+/gi,
}

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

const EVENT_LINE_REGEX = new RegExp(
  `(?:^|\\n)([^\\n]*(?:${MONTH_PATTERN})\\s+\\d{1,2}[^\\n]*(?:202[5-7])[^\\n]*)` +
    `|(?:^|\\n)([^\\n]*(?:202[5-7])[^\\n]*(?:${MONTH_PATTERN})[^\\n]*)`,
  'gi'
)

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

export function extractContactInfo(text: string) {
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

  const priorityText = contactZones.join('\n')
  const fallbackText = text
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
    const zoneMatch = priorityText.match(regex)
    const fullMatch = fallbackText.match(regex)
    const match = zoneMatch?.[0] ?? fullMatch?.[0]
    if (match) social[platform] = match
  }

  return { phones, emails, social }
}

export async function deepCrawlSite(
  homepageUrl: string,
  homepageContent: string
): Promise<{ combinedText: string; urls: string[] }> {
  const urls: string[] = [homepageUrl]
  let combinedText = homepageContent
  const linkRegex = /href=["']([^"']+)["']/gi
  const links: string[] = []
  let match: RegExpExecArray | null
  while ((match = linkRegex.exec(homepageContent)) !== null) {
    links.push(match[1])
  }

  let baseUrl: string
  try {
    const parsed = new URL(homepageUrl)
    baseUrl = `${parsed.protocol}//${parsed.host}`
  } catch {
    return { combinedText, urls }
  }

  const candidateUrls = new Set<string>()
  for (const link of links) {
    let fullUrl: string
    try {
      fullUrl = link.startsWith('http') ? link : new URL(link, baseUrl).href
    } catch {
      continue
    }
    try {
      if (new URL(fullUrl).host !== new URL(baseUrl).host) continue
    } catch {
      continue
    }
    if (SUBPAGE_PATTERNS.some((p) => p.test(fullUrl))) {
      candidateUrls.add(fullUrl)
    }
  }

  const commonPaths = ['/contact', '/events', '/about', '/private-dining', '/catering']
  for (const path of commonPaths) {
    candidateUrls.add(baseUrl + path)
  }

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
      // Skip pages that fail.
    }
  }

  return { combinedText, urls }
}

export function extractEventSignals(text: string): string | null {
  const lowerText = text.toLowerCase()
  const signals: string[] = []
  const seen = new Set<string>()

  let match: RegExpExecArray | null
  const regex = new RegExp(EVENT_LINE_REGEX.source, 'gi')
  while ((match = regex.exec(text)) !== null) {
    const line = (match[1] || match[2] || '').trim()
    if (!line || line.length > 200) continue
    const lowerLine = line.toLowerCase()
    if (EVENT_KEYWORDS.some((kw) => lowerLine.includes(kw))) {
      const key = lowerLine.replace(/\s+/g, ' ').trim()
      if (!seen.has(key)) {
        seen.add(key)
        signals.push(line)
      }
    }
  }

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
    const section = text.slice(idx, idx + 500)
    const lines = section.split('\n').slice(1, 6)
    for (const sectionLine of lines) {
      const trimmed = sectionLine.trim()
      if (trimmed.length < 10 || trimmed.length > 200) continue
      const lowerLine = trimmed.toLowerCase()
      const key = lowerLine.replace(/\s+/g, ' ')
      if (!seen.has(key)) {
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
  return signals.slice(0, 8).join('\n')
}

export async function gatherNewsIntel(
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
      const title = result.title || result.url
      newsItems.push(`• ${title} (${result.url})`)
    }

    return newsItems.length > 0 ? newsItems.join('\n') : null
  } catch {
    return null
  }
}

export async function collectWebEnrichmentUpdates(
  prospect: { name: string; city?: string | null; state?: string | null },
  options?: {
    markVerified?: boolean
    logPrefix?: string
    beforeNews?: () => Promise<void>
    throwOnSearchFailure?: boolean
  }
) {
  const enrichUpdates: Record<string, unknown> = {}

  try {
    const searchQuery = `${prospect.name} ${prospect.city ?? ''} ${prospect.state ?? ''} phone contact events`
    const results = await searchWeb(searchQuery, 3)

    if (results.length > 0) {
      if (options?.markVerified) enrichUpdates.verified = true
      const topUrl = results[0].url
      if (topUrl) {
        try {
          const homePage = await readWebPage(topUrl)
          enrichUpdates.website = topUrl
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

          const eventSignals = extractEventSignals(combinedText)
          if (eventSignals) enrichUpdates.event_signals = eventSignals
        } catch (err) {
          console.warn(`${options?.logPrefix ?? '[scrub-enrich]'} Failed to read ${topUrl}:`, err)
        }
      }
    }
  } catch (err) {
    if (options?.throwOnSearchFailure) throw err
    console.warn(
      `${options?.logPrefix ?? '[scrub-enrich]'} Web search failed for ${prospect.name}:`,
      err
    )
  }

  await options?.beforeNews?.()
  const newsIntel = await gatherNewsIntel(prospect.name, prospect.city, prospect.state)
  if (newsIntel) enrichUpdates.news_intel = newsIntel

  return enrichUpdates
}

export function buildEnrichedLines(
  prospect: any,
  enrichUpdates?: Record<string, unknown>,
  options?: { includeDirect?: boolean; includeSocial?: boolean; includeVerified?: boolean }
) {
  const enrichedLines: string[] = []
  const website = (enrichUpdates?.website as string) ?? prospect.website
  const phone = (enrichUpdates?.phone as string) ?? prospect.phone
  const email = (enrichUpdates?.email as string) ?? prospect.email

  if (website) enrichedLines.push(`Website: ${website}`)
  if (phone) enrichedLines.push(`Phone: ${phone}`)
  if (email) enrichedLines.push(`Email: ${email}`)

  if (options?.includeDirect) {
    const directPhone =
      (enrichUpdates?.contact_direct_phone as string) ?? prospect.contact_direct_phone
    const directEmail =
      (enrichUpdates?.contact_direct_email as string) ?? prospect.contact_direct_email
    if (directPhone) enrichedLines.push(`Direct phone: ${directPhone}`)
    if (directEmail) enrichedLines.push(`Direct email: ${directEmail}`)
  }

  if (options?.includeSocial) {
    const social =
      (enrichUpdates?.social_profiles as Record<string, string>) ??
      (prospect.social_profiles as Record<string, string> | null)
    if (social && Object.keys(social).length > 0) {
      for (const [platform, url] of Object.entries(social)) {
        enrichedLines.push(`${platform}: ${url}`)
      }
    }
  }

  if (options?.includeVerified && prospect.verified) {
    enrichedLines.push('Verified: confirmed to exist via web search')
  }

  return enrichedLines
}

export function computeEnrichedLeadScore(prospect: any, enrichUpdates: Record<string, unknown>) {
  return computeLeadScore({
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
}
