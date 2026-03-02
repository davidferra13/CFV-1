// Wix Forms Email Parser
// Detects and parses form submission notification emails from wix-forms.com.
// The webhook pipeline (lib/wix/process.ts) is the PRIMARY path for Wix
// submissions. This parser exists so that Gmail sync doesn't miss form
// submissions when the webhook fails or when the email arrives first.
//
// PRIVACY: Email body is processed locally only. Never sent to cloud LLMs.

import type { ParsedEmail } from './types'

// ─── Wix Forms Email Types ──────────────────────────────────────────────

export type WixFormsEmailType = 'wf_new_inquiry' | 'wf_administrative'

export interface WixFormsParsedLead {
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  eventDate: string | null
  guestCount: number | null
  guestCountText: string | null
  occasion: string | null
  location: string | null
  dietaryRestrictions: string | null
  additionalNotes: string | null
  formFields: Record<string, string>
}

export interface WixFormsParseResult {
  emailType: WixFormsEmailType
  lead?: WixFormsParsedLead
  rawSubject: string
  rawBody: string
  parseWarnings: string[]
}

// ─── Sender Detection ───────────────────────────────────────────────────

const WF_SENDER_DOMAINS = ['wix-forms.com']

export function isWixFormsEmail(fromAddress: string): boolean {
  const lower = fromAddress.toLowerCase().trim()
  const domain = lower.split('@')[1]
  return domain ? WF_SENDER_DOMAINS.includes(domain) : false
}

// ─── Parser ─────────────────────────────────────────────────────────────

export function parseWixFormsEmail(email: ParsedEmail): WixFormsParseResult {
  const result: WixFormsParseResult = {
    emailType: 'wf_new_inquiry',
    rawSubject: email.subject,
    rawBody: email.body,
    parseWarnings: [],
  }

  // Wix form emails have a consistent structure:
  // "A site visitor just submitted your form [Form Name] on [Site Name]"
  // Followed by "Submission summary:" with key-value pairs
  //
  // Real format from Google Takeout data:
  //   Full Name : Chris Zografos
  //   Address : 75 Regent Hill Rd Conway, NH 03818
  //   Date and Serving Time : 2026-01-24 04:00:00 PM
  //   Email : chris.zografos@gmail.com
  //   Phone : +1 978-973-3703
  //   Guest Count : 2
  //   Event Theme/Occasion : 40th Birthday Dinner for Wife
  //   Any favorite ingredients or strong dislikes? : ...
  //   Allergies/Food Restrictions : Tree nuts and almonds
  //   Additional Notes : ...

  const fields: Record<string, string> = {}
  const body = email.body || ''

  // Parse "Key : Value" pairs from the body
  // Wix uses " : " as delimiter (with spaces around colon)
  const lines = body.split('\n')
  for (const line of lines) {
    const match = line.match(/^([^:]+?)\s*:\s+(.+)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      // Clean up common Wix artifacts
      value = value.replace(/\s{2,}/g, ' ').replace(/\s*$/, '')
      if (key && value && !key.startsWith('http') && key.length < 80) {
        fields[key] = value
      }
    }
  }

  // Extract structured lead data from the parsed fields
  let clientName: string | null = null
  let clientEmail: string | null = null
  let clientPhone: string | null = null
  let eventDate: string | null = null
  let guestCount: number | null = null
  let guestCountText: string | null = null
  let occasion: string | null = null
  let location: string | null = null
  let dietaryRestrictions: string | null = null
  let additionalNotes: string | null = null

  for (const [key, value] of Object.entries(fields)) {
    const k = key.toLowerCase()

    if (!clientName && (k.includes('full name') || k === 'name')) {
      clientName = value
    }
    if (!clientEmail && (k.includes('email') || (value.includes('@') && value.includes('.')))) {
      // Extract email from value (may have extra text)
      const emailMatch = value.match(/[\w.+-]+@[\w.-]+\.\w{2,}/)
      clientEmail = emailMatch ? emailMatch[0] : value
    }
    if (!clientPhone && (k.includes('phone') || k.includes('tel'))) {
      clientPhone = value
    }
    if (!eventDate && (k.includes('date') || k.includes('serving time'))) {
      eventDate = value
    }
    if (!guestCountText && (k.includes('guest') || k.includes('count') || k.includes('how many'))) {
      guestCountText = value
      const countMatch = value.match(/\d+/)
      guestCount = countMatch ? parseInt(countMatch[0], 10) : null
    }
    if (!occasion && (k.includes('occasion') || k.includes('theme') || k.includes('event type'))) {
      occasion = value
    }
    if (!location && (k.includes('address') || k.includes('location'))) {
      location = value
    }
    if (
      !dietaryRestrictions &&
      (k.includes('allerg') || k.includes('restrict') || k.includes('diet'))
    ) {
      dietaryRestrictions = value
    }
    if (
      !additionalNotes &&
      (k.includes('note') || k.includes('additional') || k.includes('comment'))
    ) {
      additionalNotes = value
    }
  }

  // Merge favorite ingredients / dislikes into dietary if separate
  for (const [key, value] of Object.entries(fields)) {
    const k = key.toLowerCase()
    if (k.includes('favorite') || k.includes('dislike') || k.includes('preference')) {
      if (dietaryRestrictions) {
        dietaryRestrictions += `; ${value}`
      } else {
        dietaryRestrictions = value
      }
    }
  }

  if (!clientName) {
    result.parseWarnings.push('Could not extract client name from Wix form submission')
    clientName = 'Unknown'
  }

  result.lead = {
    clientName,
    clientEmail,
    clientPhone,
    eventDate,
    guestCount,
    guestCountText,
    occasion,
    location,
    dietaryRestrictions,
    additionalNotes,
    formFields: fields,
  }

  return result
}
