// TakeAChef / Private Chef Manager Email Parser
// Detects email type from subject line, extracts structured fields from body.
// Uses regex templates first (TakeAChef emails are consistently formatted),
// with Ollama fallback for edge cases.
//
// PRIVACY: Email body is processed locally only. Never sent to cloud LLMs.

import type {
  BookingServiceMode,
  ScheduleRequest,
  ServiceSessionRequest,
} from '@/lib/booking/schedule-schema'
import type { ParsedEmail } from './types'

// ─── TakeAChef Email Types ────────────────────────────────────────────────

export type TacEmailType =
  | 'tac_new_inquiry'
  | 'tac_booking_confirmed'
  | 'tac_customer_info'
  | 'tac_client_message'
  | 'tac_payment'
  | 'tac_administrative'

export interface TacParsedInquiry {
  clientName: string
  location: string | null
  mealType: string | null
  eventDate: string | null
  eventDateRaw: string | null
  guestCountText: string | null
  guestCountNumber: number | null
  pricePerPersonRange: string | null
  priceMinCents: number | null
  priceMaxCents: number | null
  experienceType: string | null
  foodPreferences: string | null
  dietaryRestrictions: string | null
  occasion: string | null
  clientNotes: string | null
  partnerName: string | null
  ctaLink: string | null
  ctaUriToken: string | null
  identityKeys: string[]
  serviceMode: BookingServiceMode
  scheduleRequest: ScheduleRequest | null
}

export interface TacParsedBooking {
  orderId: string
  amountUsd: number | null
  amountCents: number | null
  paymentGateway: string | null
  requestType: string | null
  address: string | null
  serviceDates: string | null
  primaryServiceDate: string | null
  serviceMode: BookingServiceMode
  scheduleRequest: ScheduleRequest | null
  occasion: string | null
  clientName: string | null
  partnerName: string | null
  ctaLink: string | null
  ctaUriToken: string | null
  identityKeys: string[]
}

export interface TacParsedCustomerInfo {
  guestName: string | null
  phoneNumber: string | null
  email: string | null
  partnerName: string | null
  bookingLocation: string | null
  bookingDate: string | null
  ctaLink: string | null
  ctaUriToken: string | null
  identityKeys: string[]
}

export interface TacParsedMessage {
  clientName: string | null
  eventDate: string | null
  ctaLink: string | null
  ctaUriToken: string | null
  identityKeys: string[]
}

export interface TacParsedPayment {
  orderId: string | null
  grossAmountCents: number | null
  commissionCents: number | null
  netPayoutCents: number | null
  commissionPercent: number | null
  payoutDate: string | null
  payoutMethod: string | null
  currency: string | null
  clientName: string | null
  identityKeys: string[]
}

export interface TacParseResult {
  emailType: TacEmailType
  inquiry?: TacParsedInquiry
  booking?: TacParsedBooking
  customerInfo?: TacParsedCustomerInfo
  message?: TacParsedMessage
  payment?: TacParsedPayment
  rawSubject: string
  rawBody: string
  parseWarnings: string[]
}

// ─── Sender Detection ────────────────────────────────────────────────────

const TAC_SENDER_DOMAINS = ['privatechefmanager.com', 'takeachef.com']

const TAC_KNOWN_SENDERS = ['info@privatechefmanager.com', 'noreply@privatechefmanager.com']

/**
 * Check if an email is from TakeAChef / Private Chef Manager.
 * Returns true if the sender domain or address matches known TakeAChef senders.
 */
export function isTakeAChefEmail(fromAddress: string): boolean {
  const lower = fromAddress.toLowerCase().trim()
  if (TAC_KNOWN_SENDERS.includes(lower)) return true
  const domain = lower.split('@')[1]
  if (!domain) return false
  return TAC_SENDER_DOMAINS.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`))
}

// ─── Email Type Detection ────────────────────────────────────────────────

const TYPE_PATTERNS: Array<{ pattern: RegExp; type: TacEmailType }> = [
  { pattern: /you just received a new request from/i, type: 'tac_new_inquiry' },
  { pattern: /new booking confirmed\s*\(order id/i, type: 'tac_booking_confirmed' },
  { pattern: /guest contact details for your upcoming booking/i, type: 'tac_customer_info' },
  { pattern: /you have a message for the on/i, type: 'tac_client_message' },
  // Payment patterns (TBD — refine when we get a sample payment email)
  { pattern: /payment (has been|confirmed|processed|sent)/i, type: 'tac_payment' },
  { pattern: /your payout/i, type: 'tac_payment' },
  { pattern: /transfer.*completed/i, type: 'tac_payment' },
]

/**
 * Detect the TakeAChef email type from the subject line.
 */
export function detectTacEmailType(subject: string): TacEmailType {
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(subject)) return type
  }
  return 'tac_administrative'
}

const TAC_LOGIN_LINK_PATTERN =
  'https?:\\/\\/(?:www\\.)?(?:privatechefmanager|takeachef)\\.com\\/en-us\\/user\\/login-check\\?[^\\s<>"\')]+'

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

function normalizeTacDateValue(rawValue: string | null): string | null {
  if (!rawValue) return null

  const trimmed = rawValue
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!trimmed) return null

  let normalized = trimmed
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

  return parsed.toISOString().split('T')[0]
}

function parseTacDateRangeStart(rawValue: string | null): string | null {
  if (!rawValue) return null
  const firstDate = rawValue.split(/\s+to\s+|\s+[-–]\s+/i)[0]?.trim() || null
  return normalizeTacDateValue(firstDate)
}

function enumerateTacDateRange(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return []

  const dates: string[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

function parseTacDateCollection(rawValue: string | null): string[] {
  if (!rawValue) return []

  const trimmed = rawValue
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!trimmed) return []

  const rangeParts = trimmed.split(/\s+to\s+|\s+[-–]\s+/i).map((part) => part.trim())
  if (rangeParts.length >= 2) {
    const start = normalizeTacDateValue(rangeParts[0])
    const end = normalizeTacDateValue(rangeParts[rangeParts.length - 1])
    if (start && end) {
      const dates = enumerateTacDateRange(start, end)
      if (dates.length > 0) return dates
    }
  }

  const direct = normalizeTacDateValue(trimmed)
  return direct ? [direct] : []
}

function inferTacMealSlot(value: string | null): ServiceSessionRequest['meal_slot'] {
  const normalized = value?.trim().toLowerCase() || ''
  if (!normalized) return 'dinner'
  if (normalized.includes('breakfast') || normalized.includes('brunch')) return 'breakfast'
  if (normalized.includes('lunch')) return 'lunch'
  if (normalized.includes('late') || normalized.includes('snack')) return 'late_snack'
  if (normalized.includes('drop')) return 'dropoff'
  if (normalized.includes('dinner')) return 'dinner'
  return 'other'
}

function inferTacExecutionType(value: string | null): ServiceSessionRequest['execution_type'] {
  const normalized = value?.trim().toLowerCase() || ''
  if (!normalized) return 'on_site'
  if (
    normalized.includes('drop off') ||
    normalized.includes('drop-off') ||
    normalized.includes('dropoff')
  ) {
    return 'drop_off'
  }
  if (normalized.includes('prep only')) return 'prep_only'
  if (normalized.includes('hybrid')) return 'hybrid'
  return 'on_site'
}

function buildTacScheduleRequest(params: {
  rawDateValue: string | null
  requestType?: string | null
  mealLabel?: string | null
  executionLabel?: string | null
  note?: string | null
}): { serviceMode: BookingServiceMode; scheduleRequest: ScheduleRequest | null } {
  const { rawDateValue, requestType, mealLabel, executionLabel, note } = params
  const dates = parseTacDateCollection(rawDateValue)
  const requestTypeText = requestType?.trim().toLowerCase() || ''
  const forceMultiDay = requestTypeText.includes('multiple') || requestTypeText.includes('multi')
  const serviceMode: BookingServiceMode =
    forceMultiDay || dates.length > 1 ? 'multi_day' : 'one_off'

  if (serviceMode !== 'multi_day') {
    return { serviceMode, scheduleRequest: null }
  }

  const firstDate = dates[0] || normalizeTacDateValue(rawDateValue)
  const lastDate = dates[dates.length - 1] || firstDate
  const mealSlot = inferTacMealSlot(mealLabel || requestType || null)
  const executionType = inferTacExecutionType(executionLabel || requestType || null)
  const outlineParts = [requestType, rawDateValue, note]
    .map((value) => value?.trim())
    .filter(Boolean)

  const sessionDates = dates.length > 0 ? dates : firstDate ? [firstDate] : []
  const sessions =
    sessionDates.length > 0
      ? sessionDates.map((sessionDate, index) => ({
          service_date: sessionDate,
          meal_slot: mealSlot,
          execution_type: executionType,
          notes: index === 0 ? note?.trim() || undefined : undefined,
        }))
      : undefined

  if (!firstDate || !lastDate) {
    return {
      serviceMode,
      scheduleRequest: outlineParts.length > 0 ? { outline: outlineParts.join(' | ') } : null,
    }
  }

  return {
    serviceMode,
    scheduleRequest: {
      start_date: firstDate,
      end_date: lastDate,
      sessions,
      outline: outlineParts.length > 0 ? outlineParts.join(' | ') : undefined,
    },
  }
}

function extractTacCtaLink(body: string, anchorPattern: string): string | null {
  const hrefPattern = new RegExp(`href="([^"]*)"[^>]*>(?:[^<]*?)(?:${anchorPattern})`, 'i')
  const markdownPattern = new RegExp(`\\((${TAC_LOGIN_LINK_PATTERN})\\)`, 'i')
  const directPattern = new RegExp(TAC_LOGIN_LINK_PATTERN, 'i')

  return (
    body.match(hrefPattern)?.[1] ||
    body.match(markdownPattern)?.[1] ||
    body.match(directPattern)?.[0] ||
    null
  )
}

export function extractTacLinkIdentity(link: string | null | undefined): {
  ctaLink: string | null
  ctaUriToken: string | null
  identityKeys: string[]
} {
  const trimmed = typeof link === 'string' ? link.trim() : ''
  if (!trimmed) {
    return { ctaLink: null, ctaUriToken: null, identityKeys: [] }
  }

  let ctaUriToken: string | null = null

  try {
    ctaUriToken = new URL(trimmed).searchParams.get('uri')?.trim() || null
  } catch {
    ctaUriToken = null
  }

  const identityKeys = Array.from(new Set([ctaUriToken, trimmed].filter(Boolean) as string[]))

  return {
    ctaLink: trimmed,
    ctaUriToken,
    identityKeys,
  }
}

// ─── Field Extraction — New Inquiry ──────────────────────────────────────

function parseInquiryEmail(
  subject: string,
  body: string
): { data: TacParsedInquiry; warnings: string[] } {
  const warnings: string[] = []

  // Client name from subject: "...request from {Name}!"
  const nameMatch = subject.match(/request from\s+(.+?)[\s!]*$/i)
  const clientName = nameMatch?.[1]?.trim() || 'Unknown'
  if (!nameMatch) warnings.push('Could not extract client name from subject')

  // Location
  const locationMatch = body.match(/Location:\*?\*?\s*(.+)/i)
  const location = locationMatch?.[1]?.trim() || null

  // Meal type
  const mealMatch = body.match(/Meal:\*?\*?\s*(.+)/i)
  const mealType = mealMatch?.[1]?.trim() || null

  // Date
  // Supports both:
  // - "Date: June 23, 2026"
  // - "Dates: Jun 6, 2026 to Jun 10, 2026"
  const dateMatch = body.match(
    /Date[s]?:\*?\*?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}(?:(?:\s+to\s+|\s+[-–]\s+)[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})?)/i
  )
  const eventDateRaw = dateMatch?.[1]?.trim() || null
  const eventDate = parseTacDateRangeStart(eventDateRaw)

  // Guest count — "No. of guests: Mid-size group (7 to 15 people)" or similar
  const guestMatch = body.match(/No\.\s*of\s*guests?:\*?\*?\s*(.+)/i)
  const guestCountText = guestMatch?.[1]?.trim() || null
  let guestCountNumber: number | null = null
  if (guestCountText) {
    // Try to extract a single number
    const singleNum = guestCountText.match(/(\d+)\s*(?:people|guests|adults)/i)
    if (singleNum) {
      guestCountNumber = parseInt(singleNum[1], 10)
    } else {
      // Try range like "7 to 15" — take the midpoint
      const rangeMatch = guestCountText.match(/(\d+)\s*(?:to|-)\s*(\d+)/)
      if (rangeMatch) {
        guestCountNumber = Math.ceil(
          (parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2
        )
      }
    }
  }

  // Price per person — "Price per person: from 101 USD to 174 USD"
  const priceMatch = body.match(/(?:Price per person|Price range):\*?\*?\s*(.+)/i)
  const pricePerPersonRange = priceMatch?.[1]?.trim() || null
  let priceMinCents: number | null = null
  let priceMaxCents: number | null = null
  if (pricePerPersonRange) {
    const priceNums = pricePerPersonRange.match(/(\d+)\s*USD/gi)
    if (priceNums && priceNums.length >= 2) {
      priceMinCents = parseInt(priceNums[0].replace(/[^\d]/g, ''), 10) * 100
      priceMaxCents = parseInt(priceNums[1].replace(/[^\d]/g, ''), 10) * 100
    } else if (priceNums && priceNums.length === 1) {
      priceMinCents = parseInt(priceNums[0].replace(/[^\d]/g, ''), 10) * 100
      priceMaxCents = priceMinCents
    }
  }

  // Type of experience
  const experienceMatch = body.match(/Type of experience:\*?\*?\s*(.+)/i)
  const experienceType = experienceMatch?.[1]?.trim() || null

  // Food preferences
  const foodPrefMatch = body.match(/Food preferences:\*?\*?\s*(.+)/i)
  const foodPreferences = foodPrefMatch?.[1]?.trim() || null

  // Dietary restrictions
  const dietaryMatch = body.match(
    /(?:Dietary (?:restrictions|requirements)|Additional notes regarding dietary restrictions):\*?\*?\s*(.+)/i
  )
  const dietaryRestrictions = dietaryMatch?.[1]?.trim() || null

  // Occasion
  const occasionMatch = body.match(/Occasion:\*?\*?\s*(.+)/i)
  const occasion = occasionMatch?.[1]?.trim() || null

  // Client notes — everything between "SOMETHING TO ADD" and "PARTNER"
  const notesMatch = body.match(
    /SOMETHING TO ADD[\s\S]*?Notes?:\*?\*?\s*([\s\S]*?)(?=PARTNER|If you are interested|$)/i
  )
  const clientNotes = notesMatch?.[1]?.trim() || null

  // Partner
  const partnerMatch = body.match(/(?:PARTNER|Partner)[\s\S]*?Name:\*?\*?\s*(.+)/i)
  const partnerName = partnerMatch?.[1]?.trim() || null

  // CTA link
  // Supports HTML href and markdown/plain login-check URLs used in Gmail exports.
  const { ctaLink, ctaUriToken, identityKeys } = extractTacLinkIdentity(
    extractTacCtaLink(body, 'Send proposal|View request')
  )
  const { serviceMode, scheduleRequest } = buildTacScheduleRequest({
    rawDateValue: eventDateRaw,
    mealLabel: mealType,
    executionLabel: experienceType,
    note: clientNotes,
  })

  return {
    data: {
      clientName,
      location,
      mealType,
      eventDate,
      eventDateRaw,
      guestCountText,
      guestCountNumber,
      pricePerPersonRange,
      priceMinCents,
      priceMaxCents,
      experienceType,
      foodPreferences,
      dietaryRestrictions,
      occasion,
      clientNotes,
      partnerName,
      ctaLink,
      ctaUriToken,
      identityKeys,
      serviceMode,
      scheduleRequest,
    },
    warnings,
  }
}

// ─── Field Extraction — Booking Confirmed ────────────────────────────────

function parseBookingEmail(
  subject: string,
  body: string
): { data: TacParsedBooking; warnings: string[] } {
  const warnings: string[] = []

  // Order ID from subject: "New booking confirmed (Order ID: 7714634)"
  const orderMatch = subject.match(/Order ID:\s*(\d+)/i)
  const orderId = orderMatch?.[1] || ''
  if (!orderId) warnings.push('Could not extract Order ID from subject')

  // Amount — "Amount: 1000 USD"
  const amountMatch = body.match(/Amount:\*?\*?\s*([\d,.]+)\s*USD/i)
  const amountUsd = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null
  const amountCents = amountUsd !== null ? Math.round(amountUsd * 100) : null

  // Payment gateway — "Payment gateway: Stripe (Domestic)"
  const gatewayMatch = body.match(/Payment gateway:\*?\*?\s*(.+)/i)
  const paymentGateway = gatewayMatch?.[1]?.trim() || null

  // Request type — "Request: Multiple services"
  const requestMatch = body.match(/Request:\*?\*?\s*(.+)/i)
  const requestType = requestMatch?.[1]?.trim() || null

  // Address — "Address: North Conway, Conway, NH"
  const addressMatch = body.match(/Address:\*?\*?\s*(.+)/i)
  const address = addressMatch?.[1]?.trim() || null

  // Service dates — "Service dates: 18 Sept 2025 - 21 Sept 2025"
  const datesMatch = body.match(/(?:Service date[s]?|Date):\*?\*?\s*(.+)/i)
  const serviceDates = datesMatch?.[1]?.trim() || null
  const primaryServiceDate = parseTacDateRangeStart(serviceDates)

  // Time / meal slot label — "Time: Dinner"
  const timeMatch = body.match(/Time:\*?\*?\s*(.+)/i)
  const serviceTimeLabel = timeMatch?.[1]?.trim() || null

  // Occasion — "Occasion: Dinner"
  const occasionMatch = body.match(/Occasion:\*?\*?\s*(.+)/i)
  const occasion = occasionMatch?.[1]?.trim() || null

  // Guests (client name) — "Guests: Jessica Zoll"
  const guestsMatch = body.match(/Guests?:\*?\*?\s*(.+)/i)
  const clientName = guestsMatch?.[1]?.trim() || null

  // Partner — "Partner: Take a Chef"
  const partnerMatch = body.match(/Partner:\*?\*?\s*(.+)/i)
  const partnerName = partnerMatch?.[1]?.trim() || null

  // CTA link — "Manage your guest"
  const { ctaLink, ctaUriToken, identityKeys } = extractTacLinkIdentity(
    extractTacCtaLink(body, 'Manage your guest|Message your guest')
  )
  const { serviceMode, scheduleRequest } = buildTacScheduleRequest({
    rawDateValue: serviceDates,
    requestType,
    mealLabel: serviceTimeLabel,
    executionLabel: requestType,
    note: orderId ? `Take a Chef order ${orderId}` : null,
  })

  return {
    data: {
      orderId,
      amountUsd,
      amountCents,
      paymentGateway,
      requestType,
      address,
      serviceDates,
      primaryServiceDate,
      serviceMode,
      scheduleRequest,
      occasion,
      clientName,
      partnerName,
      ctaLink,
      ctaUriToken,
      identityKeys,
    },
    warnings,
  }
}

// ─── Field Extraction — Customer Information ─────────────────────────────

function parseCustomerInfoEmail(
  subject: string,
  body: string
): { data: TacParsedCustomerInfo; warnings: string[] } {
  const warnings: string[] = []

  // Guest name — "Guest name: Jessica Zoll"
  const nameMatch = body.match(/Guest name\s*:\*?\*?\s*(.+)/i)
  const guestName = nameMatch?.[1]?.trim() || null
  if (!guestName) warnings.push('Could not extract guest name from customer info email')

  // Phone number — "Phone number: +1 XXXXXXXXXX"
  const phoneMatch = body.match(/Phone (?:number|#)\s*:\*?\*?\s*(\+?[\d\s()-]+)/i)
  const phoneNumber = phoneMatch?.[1]?.trim() || null

  // Email (may not always be present)
  const emailMatch = body.match(/(?:Email|E-mail)\s*:\*?\*?\s*([\w.+-]+@[\w.-]+)/i)
  const email = emailMatch?.[1]?.trim() || null

  // Partner
  const partnerMatch = body.match(/Partner:\*?\*?\s*(.+)/i)
  const partnerName = partnerMatch?.[1]?.trim() || null

  // Booking location + date from greeting text
  // "Your upcoming booking in North Conway, Conway, NH on 18 de septiembre de 2025"
  const contextMatch = body.match(/upcoming booking in\s+(.+?)\s+on\s+(.+?)(?:\s+is|\s*\.)/i)
  const bookingLocation = contextMatch?.[1]?.trim() || null
  const bookingDate = contextMatch?.[2]?.trim() || null

  // CTA link — "Manage your guest"
  const { ctaLink, ctaUriToken, identityKeys } = extractTacLinkIdentity(
    extractTacCtaLink(body, 'Manage your guest|Message your guest')
  )

  return {
    data: {
      guestName,
      phoneNumber,
      email,
      partnerName,
      bookingLocation,
      bookingDate,
      ctaLink,
      ctaUriToken,
      identityKeys,
    },
    warnings,
  }
}

// ─── Field Extraction — Client Message ───────────────────────────────────

function parseMessageEmail(
  subject: string,
  body: string
): { data: TacParsedMessage; warnings: string[] } {
  const warnings: string[] = []

  // Client name from body: "Your guest Jessica Zoll has sent you a message"
  const nameMatch = body.match(/Your guest\s+(.+?)\s+has sent you a message/i)
  const clientName = nameMatch?.[1]?.trim() || null
  if (!clientName) warnings.push('Could not extract client name from message notification')

  // Event date from subject: "You have a message for the on 18 September 2025"
  const dateMatch = subject.match(/for the on\s+(.+?)(?:\s*📬|\s*$)/i)
  const eventDate =
    normalizeTacDateValue(dateMatch?.[1]?.trim() || null) || dateMatch?.[1]?.trim() || null

  // CTA link — "Guest's message"
  const { ctaLink, ctaUriToken, identityKeys } = extractTacLinkIdentity(
    extractTacCtaLink(body, "Guest's message|View message|Message your guest")
  )

  return {
    data: {
      clientName,
      eventDate,
      ctaLink,
      ctaUriToken,
      identityKeys,
    },
    warnings,
  }
}

// ─── Field Extraction — Payment / Payout ─────────────────────────────────

function parsePaymentEmail(
  subject: string,
  body: string
): { data: TacParsedPayment; warnings: string[] } {
  const warnings: string[] = []
  const combined = `${subject}\n${body}`

  // Order ID from subject or body: "Order ID: 7714634" or "order #7714634"
  const orderMatch = combined.match(/Order\s*(?:ID|#)\s*:?\s*(\d{4,})/i)
  const orderId = orderMatch?.[1] || null

  // Gross amount: "Amount: 1000 USD" or "Total: $1,200.00" or "Gross: 850 USD"
  const grossMatch = combined.match(
    /(?:Amount|Total|Gross|Booking amount)\s*:?\s*\$?([\d,.]+)\s*(?:USD|EUR|GBP)?/i
  )
  const grossRaw = grossMatch?.[1]?.replace(/,/g, '') || null
  const grossAmountCents =
    grossRaw && Number.isFinite(Number(grossRaw)) ? Math.round(Number(grossRaw) * 100) : null

  // Commission: "Commission: 180 USD" or "Service fee: $200.00" or "Platform fee: 25%"
  const commissionAmountMatch = combined.match(
    /(?:Commission|Service fee|Platform fee|Our fee)\s*:?\s*\$?([\d,.]+)\s*(?:USD|EUR|GBP)?/i
  )
  const commissionRaw = commissionAmountMatch?.[1]?.replace(/,/g, '') || null
  const commissionCents =
    commissionRaw && Number.isFinite(Number(commissionRaw))
      ? Math.round(Number(commissionRaw) * 100)
      : null

  // Commission percentage: "18% commission" or "Commission: 18%"
  const commissionPctMatch = combined.match(/(?:Commission|fee)\s*:?\s*(\d{1,2}(?:\.\d+)?)\s*%/i)
  let commissionPercent = commissionPctMatch ? Number(commissionPctMatch[1]) : null

  // If we have gross and commission amounts but no percentage, calculate it
  if (!commissionPercent && grossAmountCents && commissionCents && grossAmountCents > 0) {
    commissionPercent = Math.round((commissionCents / grossAmountCents) * 100)
  }

  // Net payout: "Your payout: 820 USD" or "Net: $680.00" or "Transfer amount: 700"
  const netMatch = combined.match(
    /(?:Your payout|Net|Transfer amount|Payout amount|You(?:'ll)? receive)\s*:?\s*\$?([\d,.]+)\s*(?:USD|EUR|GBP)?/i
  )
  const netRaw = netMatch?.[1]?.replace(/,/g, '') || null
  let netPayoutCents =
    netRaw && Number.isFinite(Number(netRaw)) ? Math.round(Number(netRaw) * 100) : null

  // If we have gross and commission but no net, calculate it
  if (!netPayoutCents && grossAmountCents && commissionCents) {
    netPayoutCents = grossAmountCents - commissionCents
  }
  // If we have gross and commission percentage but no net, calculate it
  if (!netPayoutCents && grossAmountCents && commissionPercent) {
    const calcCommission = Math.round(grossAmountCents * (commissionPercent / 100))
    netPayoutCents = grossAmountCents - calcCommission
  }

  // Payout date: "Payout date: March 15, 2026" or "Transfer on: 2026-03-15"
  const payoutDateMatch = combined.match(
    /(?:Payout|Transfer|Payment)\s*(?:date|on|scheduled)\s*:?\s*(.+?)(?:\n|$)/i
  )
  const payoutDate = payoutDateMatch?.[1]?.trim() || null

  // Payment method: "via Stripe" or "Bank transfer" or "PayPal"
  const methodMatch = combined.match(
    /(?:via|through|by)\s+(Stripe|PayPal|bank\s*transfer|wire|direct\s*deposit)/i
  )
  const payoutMethod = methodMatch?.[1]?.trim() || null

  // Currency
  const currencyMatch = combined.match(/\b(USD|EUR|GBP|CAD|AUD)\b/i)
  const currency = currencyMatch?.[1]?.toUpperCase() || null

  // Client name (often in payment emails)
  const clientMatch = combined.match(
    /(?:Guest|Client|Customer|Booking for)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/
  )
  const clientName = clientMatch?.[1]?.trim() || null

  if (!grossAmountCents && !netPayoutCents) {
    warnings.push('Could not extract any financial amounts from payment email')
  }
  if (!orderId) {
    warnings.push('Could not extract Order ID from payment email')
  }

  return {
    data: {
      orderId,
      grossAmountCents,
      commissionCents,
      netPayoutCents,
      commissionPercent,
      payoutDate,
      payoutMethod,
      currency,
      clientName,
      identityKeys: orderId ? [orderId] : [],
    },
    warnings,
  }
}

// ─── Main Parse Function ────────────────────────────────────────────────

/**
 * Parse a TakeAChef email into structured data.
 * Call this ONLY after confirming `isTakeAChefEmail(email.from.email)` is true.
 */
export function parseTakeAChefEmail(email: ParsedEmail): TacParseResult {
  const emailType = detectTacEmailType(email.subject)
  const result: TacParseResult = {
    emailType,
    rawSubject: email.subject,
    rawBody: email.body,
    parseWarnings: [],
  }

  switch (emailType) {
    case 'tac_new_inquiry': {
      const { data, warnings } = parseInquiryEmail(email.subject, email.body)
      result.inquiry = data
      result.parseWarnings = warnings
      break
    }
    case 'tac_booking_confirmed': {
      const { data, warnings } = parseBookingEmail(email.subject, email.body)
      result.booking = data
      result.parseWarnings = warnings
      break
    }
    case 'tac_customer_info': {
      const { data, warnings } = parseCustomerInfoEmail(email.subject, email.body)
      result.customerInfo = data
      result.parseWarnings = warnings
      break
    }
    case 'tac_client_message': {
      const { data, warnings } = parseMessageEmail(email.subject, email.body)
      result.message = data
      result.parseWarnings = warnings
      break
    }
    case 'tac_payment': {
      const { data, warnings } = parsePaymentEmail(email.subject, email.body)
      result.payment = data
      result.parseWarnings = warnings
      break
    }
    case 'tac_administrative':
      // No structured extraction needed - just log the type
      break
  }

  return result
}
