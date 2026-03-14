'use server'

// Remy Survey Answer Extraction — Uses Ollama fast tier (qwen3:4b) to distill
// conversational survey answers into structured factual statements.
// Called non-blocking after each mascot chat response during survey mode.

import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { saveSurveyAnswer } from '@/lib/ai/remy-survey-actions'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

// ─── Schema ──────────────────────────────────────────────────────────────────

const SurveyExtractionSchema = z.object({
  answers: z.array(
    z.object({
      questionKey: z.string(),
      extractedAnswer: z.string().max(300),
    })
  ),
})

type SurveyExtraction = z.infer<typeof SurveyExtractionSchema>

// ─── Extraction ──────────────────────────────────────────────────────────────

/**
 * Extract the factual answer from a chef's conversational survey response.
 * Uses Ollama fast tier for speed. Non-blocking — never delays the next message.
 *
 * @param questionKey - e.g. 'kitchen_0'
 * @param questionPrompt - The conversational question text
 * @param chefMessage - The chef's raw reply
 */
export async function extractSurveyAnswer(
  questionKey: string,
  questionPrompt: string,
  chefMessage: string
): Promise<void> {
  // Skip extraction for very short messages (likely "skip", "next", etc.)
  const trimmed = chefMessage.trim().toLowerCase()
  if (trimmed.length < 5 || ['skip', 'next', 'pass', "i don't know", 'idk'].includes(trimmed)) {
    return
  }

  try {
    const result: SurveyExtraction = await parseWithOllama(
      `You extract factual answers from conversational survey responses.
Given a survey question and the chef's conversational reply, extract the factual content.
Strip filler words, tangents, and pleasantries — keep only the meaningful information.
If the response doesn't actually answer the question, return an empty answers array.
Keep each extracted answer under 200 characters.`,
      `QUESTION: "${questionPrompt}"
CHEF'S RESPONSE: "${chefMessage}"
QUESTION KEY: "${questionKey}"

Return JSON with the extracted answer(s). If the chef answered the question, include it.
If the chef also answered other questions from context, include those too with their best-guess key.`,
      SurveyExtractionSchema,
      { modelTier: 'fast', maxTokens: 256 }
    )

    // Save each extracted answer
    for (const answer of result.answers) {
      if (answer.extractedAnswer.trim()) {
        try {
          await saveSurveyAnswer(answer.questionKey, answer.extractedAnswer.trim())
        } catch (err) {
          console.error('[remy-survey-extraction] Save failed (non-blocking):', err)
        }
      }
    }
  } catch (err) {
    // Re-throw OllamaOfflineError per project rules
    if (err instanceof OllamaOfflineError) throw err
    console.error('[remy-survey-extraction] Extraction failed (non-blocking):', err)
  }
}
