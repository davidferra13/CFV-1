// AI Booking Natural Language Parser
// Takes a free-text event description from a public booking form
// and extracts structured fields to auto-fill the form.
// Public-facing, no auth required. Rate-limited at the API layer.

import { parseWithOllama } from './parse-ollama'
import { z } from 'zod'

const BookingFieldsSchema = z.object({
  occasion: z.string().optional().default(''),
  service_type: z.string().optional().default(''),
  guest_count: z.number().optional().default(0),
  event_date: z.string().optional().default(''),
  serve_time: z.string().optional().default(''),
  location: z.string().optional().default(''),
  budget_range: z.string().optional().default(''),
  dietary_restrictions: z.string().optional().default(''),
  additional_notes: z.string().optional().default(''),
})

export type ParsedBookingFields = z.infer<typeof BookingFieldsSchema>

export async function parseBookingFromNL(text: string): Promise<ParsedBookingFields> {
  const result = await parseWithOllama(
    `You are a booking form assistant. Extract structured event details from a natural language description. Return JSON with these fields:
- occasion: brief event name (e.g. "Birthday Dinner", "Anniversary", "Corporate Event")
- service_type: one of "dinner_party", "meal_prep", "catering", "wedding", "cooking_class", "other" (pick closest match)
- guest_count: number of guests (0 if not mentioned)
- event_date: YYYY-MM-DD format if a date is mentioned, empty string if not
- serve_time: HH:MM 24h format if mentioned, empty string if not
- location: city/state or address if mentioned, empty string if not
- budget_range: one of "casual", "elevated", "fine-dining", "luxury", "not-sure" (pick closest, default "not-sure")
- dietary_restrictions: comma-separated dietary needs if mentioned
- additional_notes: any other details not captured above

Only extract what is explicitly stated. Do not invent details. Never use em dashes.`,
    text,
    BookingFieldsSchema,
    { modelTier: 'fast', maxTokens: 200, timeoutMs: 8000 }
  )

  return result
}
