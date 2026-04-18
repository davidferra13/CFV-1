// AI Automation Message Personalizer
// Takes a template-interpolated message and makes it sound more natural and personal.
// Non-blocking: returns original text if AI fails.

import { parseWithOllama } from './parse-ollama'
import { z } from 'zod'

const PersonalizedSchema = z.object({
  message: z.string(),
})

/**
 * Takes an interpolated automation template message and personalizes it.
 * Returns the original text if AI is unavailable.
 */
export async function personalizeAutomationMessage(
  interpolatedText: string,
  contextFields: Record<string, unknown>
): Promise<string> {
  // Skip very short messages or those that are already personal
  if (interpolatedText.length < 30) return interpolatedText

  try {
    const contextSummary = Object.entries(contextFields)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')

    const result = await parseWithOllama(
      `You are a private chef's writing assistant. Rewrite this automated template message to sound more natural, warm, and personal. Keep the same meaning and length. Do not add information that is not in the original. Do not use em dashes. Return JSON: {"message": "..."}`,
      `Original message:\n${interpolatedText}\n\nContext: ${contextSummary}`,
      PersonalizedSchema,
      { modelTier: 'fast', maxTokens: 300, timeoutMs: 8000 }
    )

    return result.message
  } catch {
    return interpolatedText
  }
}
