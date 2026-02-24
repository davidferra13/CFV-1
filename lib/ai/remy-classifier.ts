'use server'

// Remy — Intent Classifier
// Uses the fast Ollama model to classify messages as question vs command.
// PRIVACY: Chef messages may contain client names — must stay local.

import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import type { MessageIntent } from '@/lib/ai/remy-types'

const ClassificationSchema = z.object({
  intent: z.enum(['question', 'command', 'mixed']),
  confidence: z.number().min(0).max(1),
  commandPart: z.string().optional(),
  questionPart: z.string().optional(),
})

const CLASSIFIER_SYSTEM_PROMPT = `You classify private chef business messages into intent types.

QUESTION: Asking for information, advice, analysis, or general conversation. No specific action is needed.
Examples:
- "How is my revenue this month?"
- "What should I cook for a gluten-free dinner?"
- "Any tips for pricing a 20-person event?"
- "Tell me about my upcoming events"
- "What's on my plate this week?"

COMMAND: Requesting a specific action to be performed — finding someone, checking availability, drafting something, creating something, searching the web, reading a URL, checking dietary restrictions, or viewing profile info.
Examples:
- "Find my client"
- "Check if March 15th is free"
- "Draft a follow-up for my last client"
- "Create an event for next Saturday"
- "Search for pasta recipes"
- "Search the web for seasonal menu trends"
- "Look up catering pricing online"
- "Read this article: https://..."
- "Google private chef rates in New York"
- "Check dietary restrictions for Sarah"
- "Does Sarah have any allergies?"
- "Show my favorite chefs"
- "Show my culinary profile"
- "Write a thank-you note for the Hendersons"
- "Draft a referral request for Sarah"
- "Ask the Millers for a testimonial"
- "Write a cover letter for the Johnson wedding quote"
- "Decline the booking from Alex"
- "Respond to the Smith cancellation"
- "Send a payment reminder to Dave"
- "Re-engage with the Thompson family"
- "Celebrate the Johnson's 10th event"
- "Write up the food safety incident from last night"
- "Scale my risotto recipe for 30 guests"
- "Portion calculator for the chicken dish for 50 people"
- "Generate a packing list for the Henderson wedding"
- "What do I need to pack for Saturday's event?"
- "Check cross-contamination risks for the Miller dinner"
- "Break-even analysis for the corporate event"
- "What's Sarah's lifetime value?"
- "How much has the Johnson family spent total?"
- "Optimize costs for my lobster bisque recipe"
- "Recap the Thompson anniversary dinner"
- "Explain the tasting menu"
- "Here's a transcript from a client call, put everything where it belongs"
- "Parse this conversation with a potential client"
- "I just got off the phone with someone about a dinner party, here are my notes"
- "Import these clients: Sarah Johnson, Mike Davis, Lisa Chen..."
- "Bulk import my client list"
- "Here's a brain dump of everything I know about my clients"
- "[Attached: transcript.txt]"
- "I talked to Sarah about her wedding, here's what she said..."
- "Process these notes from today's calls"

MIXED: Contains BOTH a question and an actionable request in the same message.
Example: "What's my revenue this month, and draft a follow-up for my last client"

If unsure, classify as QUESTION — it's the safest option (no side effects).

Return JSON: { "intent": "question"|"command"|"mixed", "confidence": 0.0-1.0 }
If mixed, also include "commandPart" and "questionPart" splitting the message.`

export interface ClassificationResult {
  intent: MessageIntent
  confidence: number
  commandPart?: string
  questionPart?: string
}

export async function classifyIntent(message: string): Promise<ClassificationResult> {
  try {
    const result = await parseWithOllama(
      CLASSIFIER_SYSTEM_PROMPT,
      `Classify this message: "${message}"`,
      ClassificationSchema,
      { modelTier: 'fast', cache: true }
    )

    // Low confidence → default to question (safe)
    if (result.confidence < 0.6) {
      return { intent: 'question', confidence: result.confidence }
    }

    return {
      intent: result.intent,
      confidence: result.confidence,
      commandPart: result.commandPart,
      questionPart: result.questionPart,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[remy-classifier] Classification failed, defaulting to question:', err)
    return { intent: 'question', confidence: 0 }
  }
}
