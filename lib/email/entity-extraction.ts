// Email Entity Extraction Module
// Uses local Ollama to extract structured entities from inbound chef emails.
// PRIVACY: Email content stays local (Ollama only, no cloud AI).
// Output is data for upstream consumers; never auto-saves.

import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

// -- Schemas ------------------------------------------------------------------

const ExtractedEntitySchema = z.object({
  type: z.enum(['date', 'person', 'count', 'dietary', 'money', 'location', 'dish', 'intent']),
  value: z.string().describe('Normalized value'),
  raw: z.string().describe('Original text span from the email'),
  confidence: z.number().min(0).max(1),
  context: z.string().optional().describe('Surrounding sentence for disambiguation'),
})

const EmailExtractionResultSchema = z.object({
  entities: z.array(ExtractedEntitySchema),
  summary: z.string().describe('One-sentence summary of the email intent'),
  urgency: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  requiresResponse: z.boolean(),
})

export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>

export interface EmailExtractionResult {
  entities: ExtractedEntity[]
  summary: string
  urgency: 1 | 2 | 3 | 4 | 5
  requiresResponse: boolean
  suggestedCilSignals: Array<{
    source: string
    entityIds: string[]
    payload: Record<string, unknown>
  }>
}

export interface EmailMetadata {
  senderEmail?: string
  subject?: string
  tenantId?: string
}

// -- System Prompt ------------------------------------------------------------

function getTodayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getSystemPrompt(metadata?: EmailMetadata): string {
  const senderHint = metadata?.senderEmail ? `\nSender email: ${metadata.senderEmail}` : ''
  const subjectHint = metadata?.subject ? `\nSubject line: ${metadata.subject}` : ''

  return `You are an assistant helping a private chef extract structured information from client emails.

Today's date is ${getTodayLocal()}. Use this to resolve relative dates ("Saturday the 28th", "next Friday", "in two weeks").${senderHint}${subjectHint}

Extract ALL entities you can find from the email body. Be thorough but accurate.

Entity types to extract:
- date: Event dates, deadlines, follow-up dates. Normalize to YYYY-MM-DD when possible.
- person: Client names, guest names, staff mentions. Value = full name.
- count: Guest counts, portion counts. Value = the number as string.
- dietary: Allergies, restrictions, preferences. Value = normalized restriction (e.g. "shellfish allergy", "vegan", "gluten-free").
- money: Quoted prices, budgets, deposits. Value = dollar amount as string (e.g. "$150", "$500").
- location: Venues, addresses, delivery locations. Value = the location text.
- dish: Specific dish requests, food mentions. Value = the dish/food name.
- intent: The primary purpose of the email. Value = one of: inquiry, menu_change, cancellation, confirmation, question, follow_up, complaint, thank_you, scheduling

Rules:
- For each entity, include the exact "raw" text span from the original email.
- confidence: 1.0 for explicit clear mentions, 0.7-0.9 for likely interpretations, 0.3-0.6 for ambiguous.
- If a field is genuinely not present, don't invent it.
- summary: one sentence describing the email's main intent.
- urgency: 1=informational, 2=low (no time pressure), 3=medium (needs response within days), 4=high (needs same-day response), 5=critical (time-sensitive, event at risk).
- requiresResponse: true if the email asks a question or needs chef action.
- Return ONLY valid JSON matching the schema.

Output JSON with keys: entities, summary, urgency, requiresResponse`
}

// -- Extraction ---------------------------------------------------------------

/**
 * Extract structured entities from an email body using local Ollama.
 * Returns extracted data for upstream consumers. Never auto-saves.
 *
 * @throws OllamaOfflineError if Ollama is unavailable (propagated for caller to handle)
 */
export async function extractEntitiesFromEmail(
  emailBody: string,
  metadata?: EmailMetadata
): Promise<EmailExtractionResult> {
  if (!emailBody.trim()) {
    return {
      entities: [],
      summary: 'Empty email',
      urgency: 1,
      requiresResponse: false,
      suggestedCilSignals: [],
    }
  }

  try {
    const raw = await parseWithOllama(
      getSystemPrompt(metadata),
      emailBody,
      EmailExtractionResultSchema,
      {
        modelTier: 'standard',
        maxTokens: 1024,
        timeoutMs: 15_000,
        cache: true,
        dispatchHint: {
          taskType: 'structured.parse',
          source: 'email-entity-extraction',
          surface: 'server.parse',
        },
      }
    )

    const suggestedCilSignals = buildCilSignals(raw.entities, metadata)

    return {
      entities: raw.entities,
      summary: raw.summary,
      urgency: raw.urgency,
      requiresResponse: raw.requiresResponse,
      suggestedCilSignals,
    }
  } catch (err) {
    // Propagate OllamaOfflineError (same pattern as parse-event-from-text.ts)
    if (err instanceof OllamaOfflineError) throw err
    console.error('[email-entity-extraction] Error:', err)
    return {
      entities: [],
      summary: 'Extraction failed',
      urgency: 1,
      requiresResponse: false,
      suggestedCilSignals: [],
    }
  }
}

// -- CIL Signal Builder -------------------------------------------------------

function buildCilSignals(
  entities: ExtractedEntity[],
  metadata?: EmailMetadata
): EmailExtractionResult['suggestedCilSignals'] {
  const signals: EmailExtractionResult['suggestedCilSignals'] = []

  // Group entities for signal construction
  const people = entities.filter((e) => e.type === 'person')
  const dates = entities.filter((e) => e.type === 'date')
  const dietary = entities.filter((e) => e.type === 'dietary')
  const money = entities.filter((e) => e.type === 'money')
  const intents = entities.filter((e) => e.type === 'intent')
  const dishes = entities.filter((e) => e.type === 'dish')
  const counts = entities.filter((e) => e.type === 'count')

  // Build entity IDs from extracted people
  const clientIds = people
    .filter((p) => p.confidence >= 0.5)
    .map((p) => `client_${slugify(p.value)}`)

  // Primary intent signal
  if (intents.length > 0) {
    signals.push({
      source: 'email_extraction',
      entityIds: clientIds,
      payload: {
        intent: intents[0].value,
        confidence: intents[0].confidence,
        senderEmail: metadata?.senderEmail ?? null,
        subject: metadata?.subject ?? null,
      },
    })
  }

  // Dietary preferences signal (links client to ingredient preferences)
  if (dietary.length > 0 && clientIds.length > 0) {
    signals.push({
      source: 'email_extraction',
      entityIds: clientIds,
      payload: {
        type: 'dietary_update',
        restrictions: dietary.map((d) => ({
          restriction: d.value,
          raw: d.raw,
          confidence: d.confidence,
        })),
      },
    })
  }

  // Event-related signal (date + count + money = likely event context)
  if (dates.length > 0 || counts.length > 0 || money.length > 0) {
    signals.push({
      source: 'email_extraction',
      entityIds: clientIds,
      payload: {
        type: 'event_context',
        dates: dates.map((d) => ({ value: d.value, confidence: d.confidence })),
        guestCounts: counts.map((c) => ({ value: c.value, confidence: c.confidence })),
        budget: money.map((m) => ({ value: m.value, confidence: m.confidence })),
        dishes: dishes.map((d) => ({ value: d.value, confidence: d.confidence })),
      },
    })
  }

  return signals
}

// -- Helpers ------------------------------------------------------------------

/** Convert a name to a URL-safe slug for entity ID construction */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}
