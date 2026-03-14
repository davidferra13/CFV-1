// Bulk Inquiry Smart Import Parser
// Parses multiple inquiries from a single freeform text dump via Ollama.
// Follows the same pattern as parse-clients-bulk.ts.

'use server'

import { z } from 'zod'
import { type ParseResult } from './parse'
import { parseWithOllama } from './parse-ollama'
import type { ParsedInquiryRow } from './parse-csv-inquiries'

// ============================================
// RESPONSE SCHEMA
// ============================================

const ParsedInquirySchema = z.object({
  client_name: z.string().min(1),
  client_email: z.string().nullable().default(null),
  client_phone: z.string().nullable().default(null),
  first_contact_at: z.string().default(''),
  confirmed_occasion: z.string().nullable().default(null),
  confirmed_guest_count: z.number().nullable().default(null),
  confirmed_location: z.string().nullable().default(null),
  confirmed_budget_cents: z.number().nullable().default(null),
  channel: z.string().nullable().default(null),
  status: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  source_message: z.string().nullable().default(null),
  dietary_restrictions: z.array(z.string()).nullable().default(null),
  decline_reason: z.string().nullable().default(null),
})

const BulkInquiriesResponseSchema = z.object({
  parsed: z.array(ParsedInquirySchema),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()).default([]),
})

// ============================================
// SYSTEM PROMPT
// ============================================

const BULK_INQUIRY_SYSTEM_PROMPT = `You are a data extraction assistant for a private chef's client management system. Your job is to parse a text dump containing information about MULTIPLE client inquiries/leads and return each as a separate structured record.

RULES:
- Identify distinct inquiries in the text. They are usually separated by blank lines, dashes, dates, or new client names.
- Each inquiry should be parsed independently.
- Extract ONLY what is explicitly stated or clearly implied. NEVER invent facts.
- If a piece of text describes one person reaching out about one event, that's ONE inquiry.
- Dates: output in YYYY-MM-DD format when possible. If the year is unclear, assume the most recent past occurrence.
- Budget: always in CENTS (e.g., $500 = 50000). If a per-person rate is given with guest count, multiply.
- Channel: infer from context — "texted me" → "text", "emailed" → "email", "found me on Instagram" → "instagram", "from my website" → "website", "Wix form" → "wix", "referred by" → "referral".
- Status: infer from context — "booked them" → "confirmed", "never heard back" → "expired", "they went with someone else" → "declined", "still interested" → "new". Default to null if unclear.
- source_message: preserve the original text snippet for this inquiry (brief, first ~200 chars).
- Names: the FIRST name in each entry is usually the client.

RESPOND WITH ONLY valid JSON (no markdown, no explanation):
{
  "parsed": [
    {
      "client_name": "string (required)",
      "client_email": "string or null",
      "client_phone": "string or null",
      "first_contact_at": "YYYY-MM-DD or empty string",
      "confirmed_occasion": "string or null (e.g., birthday, dinner party, wedding)",
      "confirmed_guest_count": "number or null",
      "confirmed_location": "string or null",
      "confirmed_budget_cents": "number or null (IN CENTS)",
      "channel": "website|email|phone|text|instagram|referral|wix|take_a_chef|yhangry|walk_in|other or null",
      "status": "new|confirmed|declined|expired or null",
      "notes": "string or null (any extra details)",
      "source_message": "string or null (brief original text)",
      "dietary_restrictions": ["string"] or null,
      "decline_reason": "string or null"
    }
  ],
  "confidence": "high|medium|low",
  "warnings": ["string - any data quality issues"]
}`

// ============================================
// HEURISTIC FALLBACK
// ============================================

function splitBlocks(rawText: string): string[] {
  const normalized = rawText.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const byBlankLines = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  if (byBlankLines.length > 1) return byBlankLines

  // Try splitting by lines that start with a name-like pattern
  return normalized
    .split(/\n(?=(?:[-*]\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\s*[-:])/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function extractDate(block: string): string {
  // ISO format
  const iso = block.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (iso) return iso[1]

  // US format: 1/15/2024 or 01/15/2024
  const usDate = block.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/)
  if (usDate) {
    const parsed = new Date(usDate[1])
    if (!isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
    }
  }

  // Month name: "Jan 15, 2024" or "January 15 2024"
  const monthName = block.match(
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4})\b/i
  )
  if (monthName) {
    const parsed = new Date(monthName[1])
    if (!isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
    }
  }

  return ''
}

function extractName(block: string, index: number): string {
  // Name at start of block: "John Smith - ..." or "John Smith:"
  const direct = block.match(/^(?:[-*]\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s*[-:]/)
  if (direct) return direct[1].trim()

  // First capitalized name in block
  const fallback = block.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/)
  if (fallback) return fallback[1].trim()

  return `Imported Inquiry ${index + 1}`
}

function extractEmail(block: string): string | null {
  const match = block.match(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i)
  return match ? match[1] : null
}

function extractPhone(block: string): string | null {
  const match = block.match(/(\+?\d[\d\s().-]{7,}\d)/)
  return match ? match[1].trim() : null
}

function extractBudgetCents(block: string): number | null {
  const perPerson = block.match(/\$?\s*(\d+(?:\.\d+)?)\s*\/\s*(?:person|pp|head|guest)/i)
  const guestCount = block.match(/(\d+)\s*(?:guests?|people|ppl|persons?)/i)
  if (perPerson) {
    const price = Math.round(Number(perPerson[1]) * 100)
    const guests = guestCount ? Number(guestCount[1]) : 1
    return price * Math.max(1, guests)
  }

  const total = block.match(/\$\s*(\d{2,6}(?:\.\d{1,2})?)/)
  if (total) return Math.round(Number(total[1]) * 100)

  return null
}

function extractGuests(block: string): number | null {
  const match = block.match(/(\d+)\s*(?:guests?|people|ppl|persons?|pax|covers|attendees)/i)
  if (match) {
    const n = parseInt(match[1], 10)
    return n > 0 && n < 10000 ? n : null
  }
  return null
}

function parseInquiriesHeuristically(
  rawText: string,
  warning?: string
): ParseResult<ParsedInquiryRow[]> {
  const blocks = splitBlocks(rawText)
  const parsed: ParsedInquiryRow[] = []

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const name = extractName(block, i)

    parsed.push({
      id: Math.random().toString(36).slice(2),
      client_name: name,
      client_email: extractEmail(block),
      client_phone: extractPhone(block),
      first_contact_at: extractDate(block),
      confirmed_occasion: null,
      confirmed_guest_count: extractGuests(block),
      confirmed_location: null,
      confirmed_budget_cents: extractBudgetCents(block),
      channel: null,
      status: null,
      notes: null,
      source_message: block.slice(0, 200),
      dietary_restrictions: null,
      decline_reason: null,
    })
  }

  // If nothing was split but there's text, treat the whole thing as one inquiry
  if (parsed.length === 0 && rawText.trim()) {
    parsed.push({
      id: Math.random().toString(36).slice(2),
      client_name: extractName(rawText, 0),
      client_email: extractEmail(rawText),
      client_phone: extractPhone(rawText),
      first_contact_at: extractDate(rawText),
      confirmed_occasion: null,
      confirmed_guest_count: extractGuests(rawText),
      confirmed_location: null,
      confirmed_budget_cents: extractBudgetCents(rawText),
      channel: null,
      status: null,
      notes: null,
      source_message: rawText.slice(0, 200),
      dietary_restrictions: null,
      decline_reason: null,
    })
  }

  return {
    parsed,
    confidence: 'low',
    warnings: [warning || 'Used fallback parser. Review all fields before saving.'],
  }
}

// ============================================
// MAIN EXPORT
// ============================================

export async function parseInquiriesFromBulk(
  rawText: string
): Promise<ParseResult<ParsedInquiryRow[]>> {
  try {
    const result = await parseWithOllama(
      BULK_INQUIRY_SYSTEM_PROMPT,
      rawText,
      BulkInquiriesResponseSchema,
      { maxTokens: 2048, timeoutMs: 90_000 }
    )

    // Add unique IDs to each parsed row
    const rows: ParsedInquiryRow[] = result.parsed.map((row) => ({
      ...row,
      id: Math.random().toString(36).slice(2),
    }))

    return {
      parsed: rows,
      confidence: result.confidence,
      warnings: result.warnings,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parser error'
    return parseInquiriesHeuristically(
      rawText,
      `AI parser failed (${message}). Used fallback extraction instead.`
    )
  }
}
