// Chat Insights AI Module
// Analyzes client messages for actionable business intelligence.
// Uses the same parseWithAI() pattern as other AI modules.
// All output is non-canonical -- requires chef confirmation.

'use server'

import { z } from 'zod'
import { parseWithAI } from './parse'

// ============================================
// SCHEMA
// ============================================

const InsightSchema = z.object({
  type: z.enum([
    'inquiry_intent',
    'dietary_preference',
    'allergy_mention',
    'important_date',
    'guest_count',
    'event_detail',
    'budget_mention',
    'location_mention',
    'general_preference',
  ]),
  title: z.string(),
  detail: z.string().nullable(),
  extracted_data: z.record(z.string(), z.unknown()),
  confidence: z.number().min(0).max(1),
})

const ChatInsightsResponseSchema = z.object({
  insights: z.array(InsightSchema),
})

export type ExtractedInsight = z.infer<typeof InsightSchema>

// ============================================
// SYSTEM PROMPT
// ============================================

const SYSTEM_PROMPT = `You are an assistant for a private chef's business. Your job is to analyze a client's chat message and extract actionable business intelligence.

For each piece of useful information, create an insight with:
- type: the category (see enum values below)
- title: a short human-readable summary (e.g., "Birthday: June 15", "Allergy: Shellfish")
- detail: optional longer context from the message
- extracted_data: structured data as key-value pairs
- confidence: 0.0-1.0 how confident you are this is accurate

Insight types:
- inquiry_intent: Client wants to book, schedule, or discuss a new event
- dietary_preference: Dietary info (vegan, keto, pescatarian, etc.)
- allergy_mention: Food allergies or sensitivities (CRITICAL - always extract)
- important_date: Birthdays, anniversaries, special dates mentioned
- guest_count: Number of guests or people mentioned for events
- event_detail: Event-related info (venue, time, theme, occasion)
- budget_mention: Budget, price, or cost discussion
- location_mention: Address, venue, or location info
- general_preference: Any other preference (wine, cooking style, favorites)

Rules:
- Only extract genuinely useful information, not filler or pleasantries
- Allergies and dietary restrictions are ALWAYS important - never skip them
- If the message is just "thanks" or "ok", return empty insights array
- Be conservative with confidence - only use >0.8 for explicit, clear statements
- The extracted_data should contain structured fields relevant to the insight type
- Return valid JSON with an "insights" array

Respond ONLY with a JSON object: { "insights": [...] }`

// ============================================
// ANALYSIS FUNCTION
// ============================================

/**
 * Analyze a client message for actionable insights.
 * Takes the message body plus conversation context for better understanding.
 */
export async function analyzeMessageForInsights(
  messageBody: string,
  conversationContext: string,
  clientProfileSummary?: string
): Promise<ExtractedInsight[]> {
  // Skip trivially short messages
  if (!messageBody || messageBody.trim().length < 10) {
    return []
  }

  const userContent = [
    'Client message to analyze:',
    `"${messageBody}"`,
    '',
    'Recent conversation context (for reference):',
    conversationContext || '(no prior context)',
  ]

  if (clientProfileSummary) {
    userContent.push(
      '',
      'Known client information (avoid duplicating these):',
      clientProfileSummary
    )
  }

  try {
    const result = await parseWithAI(
      SYSTEM_PROMPT,
      userContent.join('\n'),
      ChatInsightsResponseSchema
    )
    return result.insights
  } catch (err) {
    console.error('[analyzeMessageForInsights] AI error:', err)
    return []
  }
}
