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

COMMAND: Requesting a specific action to be performed — finding someone, checking availability, drafting something, creating something.
Examples:
- "Find Sarah Johnson"
- "Check if March 15th is free"
- "Draft a follow-up for my last client"
- "Create an event for next Saturday"
- "Search for pasta recipes"

MIXED: Contains BOTH a question and an actionable request in the same message.
Example: "What's my revenue this month, and draft a follow-up for Sarah"

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
