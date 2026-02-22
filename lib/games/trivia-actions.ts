'use server'

import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'

const TriviaQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  choices: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  funFact: z.string(),
})

const TriviaSchema = z.object({
  questions: z.array(TriviaQuestionSchema).min(1),
})

export type TriviaQuestion = z.infer<typeof TriviaSchema>['questions'][number]

export async function generateTriviaQuestions(
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  previousIds: string[] = []
): Promise<{ questions: TriviaQuestion[]; error?: string }> {
  try {
    const avoidClause =
      previousIds.length > 0
        ? `\nIMPORTANT: The player has already seen questions with these IDs — do NOT reuse them or ask similar questions: ${previousIds.slice(-30).join(', ')}`
        : ''

    const result = await parseWithOllama(
      `You are Remy, ChefFlow's culinary AI. You LOVE teaching chefs new things through fun trivia.
Generate exactly 5 multiple-choice culinary trivia questions. Each must have exactly 4 choices with one correct answer.
Make questions genuinely educational — the chef should learn something new from each one.
Vary question types: history, technique, science, ingredients, culture, famous chefs, food safety.

Rules:
- Each question gets a unique short ID like "q_sauces_01" (topic + number)
- correctIndex is 0-based (0, 1, 2, or 3)
- funFact should be a short, interesting tidbit the chef can remember
- Difficulty level: ${difficulty}
- ALWAYS return valid JSON matching the schema exactly${avoidClause}`,
      `Generate 5 ${difficulty} culinary trivia questions about: ${topic}

Return JSON: { "questions": [{ "id": "unique_id", "question": "...", "choices": ["A", "B", "C", "D"], "correctIndex": 0, "funFact": "..." }, ...] }`,
      TriviaSchema,
      { modelTier: 'standard', maxTokens: 2048, timeoutMs: 120000 }
    )

    return { questions: result.questions }
  } catch (err) {
    if (err instanceof OllamaOfflineError) {
      return { questions: [], error: 'ollama-offline' }
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[trivia] Generation failed:', message)
    return { questions: [], error: message }
  }
}
