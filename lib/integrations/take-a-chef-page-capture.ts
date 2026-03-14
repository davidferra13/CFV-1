import { dedupeIdentityKeys, mergePlatformIdentityKeys } from '@/lib/gmail/platform-identity'
import { extractTacLinkIdentity } from '@/lib/gmail/take-a-chef-parser'
import { mergeTakeAChefFinanceMeta } from '@/lib/integrations/take-a-chef-finance'
import type { Json } from '@/types/database'

export const TAKE_A_CHEF_PAGE_CAPTURE_TYPES = [
  'request',
  'proposal',
  'booking',
  'message',
  'guest_contact',
  'menu',
  'other',
] as const

export type TakeAChefPageCaptureType = (typeof TAKE_A_CHEF_PAGE_CAPTURE_TYPES)[number]

export type TakeAChefBookmarkletPayload = {
  __chefFlowMarketplaceCapture: true
  version: 1
  url: string
  title: string
  text: string
  links: string[]
  capturedAt: string
}

export type TakeAChefPageCaptureParseResult = {
  suggestedCaptureType: TakeAChefPageCaptureType
  identityKeys: string[]
  primaryLink: string | null
  ctaUriToken: string | null
  orderId: string | null
  clientName: string | null
  email: string | null
  phone: string | null
  bookingDate: string | null
  guestCount: number | null
  location: string | null
  occasion: string | null
  amountCents: number | null
  summary: string
  textExcerpt: string
}

const TAC_CAPTURE_LINK_PATTERN =
  /https?:\/\/(?:www\.)?(?:privatechefmanager|takeachef)\.com\/[^\s"'<>]+/gi

// Broader pattern: captures links from any known marketplace platform
const MARKETPLACE_CAPTURE_LINK_PATTERN =
  /https?:\/\/(?:www\.)?(?:privatechefmanager|takeachef|yhangry|cozymeal|bark|thumbtack|gigsalad|theknot|weddingwire)\.com\/[^\s"'<>]+/gi

const TAC_MONTH_TRANSLATIONS: Record<string, string> = {
  enero: 'January',
  febrero: 'February',
  marzo: 'March',
  abril: 'April',
  mayo: 'May',
  junio: 'June',
  julio: 'July',
  agosto: 'August',
  septiembre: 'September',
  setiembre: 'September',
  octubre: 'October',
  noviembre: 'November',
  diciembre: 'December',
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizeTacDateValue(rawValue: string | null): string | null {
  if (!rawValue) return null

  const trimmed = rawValue
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!trimmed) return null

  const normalized = trimmed
    .replace(/\bSept\b/gi, 'Sep')
    .replace(
      /\b(\d{1,2})\s+de\s+([A-Za-z\u00C0-\u017F]+)\s+de\s+(\d{4})\b/gi,
      (_, day: string, month: string, year: string) => {
        const translated =
          TAC_MONTH_TRANSLATIONS[
            month
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
          ]
        return translated ? `${day} ${translated} ${year}` : `${day} ${month} ${year}`
      }
    )

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function parseTacDateRangeStart(rawValue: string | null): string | null {
  if (!rawValue) return null
  const firstDate = rawValue.split(/\s+to\s+|\s+[-–]\s+/i)[0]?.trim() || null
  return normalizeTacDateValue(firstDate)
}

function extractFirstMatch(patterns: RegExp[], input: string): string | null {
  for (const pattern of patterns) {
    const match = input.match(pattern)
    const value = match?.[1]?.trim()
    if (value) return value
  }
  return null
}

export function guessTakeAChefPageCaptureType(input: {
  pageTitle?: string | null
  pageText: string
}): TakeAChefPageCaptureType {
  const combined = `${input.pageTitle || ''}\n${input.pageText}`.toLowerCase()

  if (
    combined.includes('guest contact details') ||
    combined.includes('guest name:') ||
    combined.includes('phone number:')
  ) {
    return 'guest_contact'
  }
  if (
    combined.includes('order id') ||
    combined.includes('new booking confirmed') ||
    combined.includes('payment gateway') ||
    combined.includes('service dates:')
  ) {
    return 'booking'
  }
  if (combined.includes('proposal') || combined.includes('quote')) return 'proposal'
  if (combined.includes('menu') || combined.includes('dish')) return 'menu'
  if (combined.includes('message') || combined.includes('sent you a message')) return 'message'
  if (
    combined.includes('new request') ||
    combined.includes('request from') ||
    combined.includes('price per person') ||
    combined.includes('type of experience')
  ) {
    return 'request'
  }
  return 'other'
}

export function parseTakeAChefPageCapture(input: {
  pageUrl: string
  pageTitle?: string | null
  pageText: string
  pageLinks?: string[] | null
}): TakeAChefPageCaptureParseResult {
  const cleanTitle = input.pageTitle?.trim() || null
  const cleanText = normalizeWhitespace(input.pageText || '')
  const combined = [cleanTitle, cleanText].filter(Boolean).join('\n')
  const extractedTextLinks = combined.match(MARKETPLACE_CAPTURE_LINK_PATTERN) ?? []
  const candidateLinks = dedupeIdentityKeys([
    input.pageUrl,
    ...(input.pageLinks ?? []),
    ...extractedTextLinks,
  ])
  const linkIdentities = candidateLinks.flatMap((link) => {
    const identity = extractTacLinkIdentity(link)
    return [identity.ctaLink, identity.ctaUriToken, ...identity.identityKeys]
  })

  const primaryIdentity = extractTacLinkIdentity(input.pageUrl)
  const primaryLink = primaryIdentity.ctaLink ?? candidateLinks[0] ?? null
  const orderId =
    extractFirstMatch(
      [/Order ID\s*[:#]?\s*(\d{4,})/i, /Take a Chef order\s+(\d{4,})/i],
      combined
    ) ?? null
  const clientName =
    extractFirstMatch(
      [
        /request from\s+(.+?)(?:!|\n|$)/i,
        /Guest name\s*:?\s*(.+)/i,
        /Guests?\s*:?\s*(.+)/i,
        /Your guest\s+(.+?)\s+has sent you a message/i,
      ],
      combined
    ) ?? null
  const email =
    extractFirstMatch([/(?:Email|E-mail)\s*:?\s*([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/i], combined) ??
    null
  const phone =
    extractFirstMatch(
      [
        /Phone (?:number|#)\s*:?\s*(\+?[\d()\s-]{8,})/i,
        /(?:Phone|Mobile)\s*:?\s*(\+?[\d()\s-]{8,})/i,
      ],
      combined
    ) ?? null

  const bookingDate =
    parseTacDateRangeStart(
      extractFirstMatch(
        [
          /Service date[s]?\s*:?\s*(.+)/i,
          /Booking date\s*:?\s*(.+)/i,
          /Date[s]?\s*:?\s*([A-Za-z0-9,\s–-]+)/i,
          /upcoming booking in\s+.+?\s+on\s+(.+?)(?:\s+is|\s*\.)/i,
        ],
        combined
      )
    ) ?? null

  const guestCountText =
    extractFirstMatch(
      [/No\.\s*of\s*guests?\s*:?\s*(.+)/i, /Guests?\s*:?\s*(\d+\s*(?:guests|people|adults))/i],
      combined
    ) ?? null
  let guestCount: number | null = null
  if (guestCountText) {
    const single = guestCountText.match(/(\d+)/)
    if (single) guestCount = Number(single[1])
  }

  const location =
    extractFirstMatch(
      [/Address\s*:?\s*(.+)/i, /Location\s*:?\s*(.+)/i, /upcoming booking in\s+(.+?)\s+on\s+/i],
      combined
    ) ?? null
  const occasion = extractFirstMatch([/Occasion\s*:?\s*(.+)/i], combined)

  const amountRaw =
    extractFirstMatch(
      [/Amount\s*:?\s*\$?([\d,.]+)(?:\s*USD)?/i, /Total\s*:?\s*\$?([\d,.]+)(?:\s*USD)?/i],
      combined
    ) ?? null
  const amountCents =
    amountRaw && Number.isFinite(Number(amountRaw.replace(/,/g, '')))
      ? Math.round(Number(amountRaw.replace(/,/g, '')) * 100)
      : null

  const suggestedCaptureType = guessTakeAChefPageCaptureType({
    pageTitle: cleanTitle,
    pageText: cleanText,
  })

  const summary =
    suggestedCaptureType === 'booking' && orderId
      ? `Captured Take a Chef booking page for order #${orderId}`
      : clientName
        ? `Captured ${suggestedCaptureType.replace('_', ' ')} page for ${clientName}`
        : `Captured ${suggestedCaptureType.replace('_', ' ')} page from Take a Chef`

  return {
    suggestedCaptureType,
    identityKeys: dedupeIdentityKeys([orderId, ...linkIdentities]),
    primaryLink,
    ctaUriToken: primaryIdentity.ctaUriToken,
    orderId,
    clientName,
    email,
    phone,
    bookingDate,
    guestCount,
    location,
    occasion,
    amountCents,
    summary,
    textExcerpt: cleanText.slice(0, 2000),
  }
}

export function buildTakeAChefCaptureBookmarklet(appUrl: string): string {
  const targetUrl = new URL('/marketplace/capture?source=bookmarklet', appUrl).toString()
  const code = `(function(){try{var text=(document.body&&document.body.innerText||'').slice(0,15000);var links=Array.prototype.slice.call(document.querySelectorAll('a[href]')).map(function(a){return a.href;}).filter(function(h){return /privatechefmanager|takeachef|yhangry|cozymeal|bark|thumbtack|gigsalad|theknot|weddingwire/i.test(h);}).slice(0,25);window.name=JSON.stringify({__chefFlowMarketplaceCapture:true,version:1,url:location.href,title:document.title,text:text,links:links,capturedAt:new Date().toISOString()});location.href=${JSON.stringify(targetUrl)};}catch(e){alert('ChefFlow capture failed.');}})();`
  return `javascript:${code}`
}

export function mergeTakeAChefPageCaptureIntoUnknownFields(params: {
  unknownFields: unknown
  identityKeys: string[]
  captureType: TakeAChefPageCaptureType
  pageUrl: string
  pageTitle: string | null
  pageLinks?: string[] | null
  notes?: string | null
  parsed: TakeAChefPageCaptureParseResult
  capturedAt: string
}): Json {
  const existingRoot = asRecord(params.unknownFields) ?? {}
  const existingWorkflow = asRecord(existingRoot.take_a_chef_workflow) ?? {}
  const base = mergePlatformIdentityKeys(
    params.unknownFields as Record<string, unknown> | null,
    params.identityKeys,
    {
      take_a_chef_workflow: {
        ...existingWorkflow,
        last_capture_type: params.captureType,
        last_captured_at: params.capturedAt,
        proposal_captured_at:
          params.captureType === 'proposal'
            ? params.capturedAt
            : (existingWorkflow.proposal_captured_at ?? null),
        proposal_amount_cents:
          params.captureType === 'proposal'
            ? params.parsed.amountCents
            : (existingWorkflow.proposal_amount_cents ?? null),
        menu_captured_at:
          params.captureType === 'menu'
            ? params.capturedAt
            : (existingWorkflow.menu_captured_at ?? null),
        menu_seen:
          params.captureType === 'menu'
            ? true
            : typeof existingWorkflow.menu_seen === 'boolean'
              ? existingWorkflow.menu_seen
              : false,
      },
      take_a_chef_page_capture: {
        last_captured_at: params.capturedAt,
        capture_type: params.captureType,
        page_url: params.pageUrl,
        page_title: params.pageTitle,
        page_links: (params.pageLinks ?? []).slice(0, 25),
        notes: params.notes?.trim() || null,
        summary: params.parsed.summary,
        text_excerpt: params.parsed.textExcerpt,
        extracted_order_id: params.parsed.orderId,
        extracted_client_name: params.parsed.clientName,
        extracted_email: params.parsed.email,
        extracted_phone: params.parsed.phone,
        extracted_booking_date: params.parsed.bookingDate,
        extracted_guest_count: params.parsed.guestCount,
        extracted_location: params.parsed.location,
        extracted_occasion: params.parsed.occasion,
        extracted_gross_booking_cents: params.parsed.amountCents,
      },
    }
  )

  return mergeTakeAChefFinanceMeta({
    unknownFields: base,
    updates: {
      grossBookingCents:
        params.captureType === 'booking' && params.parsed.amountCents != null
          ? params.parsed.amountCents
          : undefined,
      updatedAt: params.capturedAt,
    },
  })
}
