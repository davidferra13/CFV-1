// AI Suggestion Prioritizer
// Analyzes data gaps and recommends what the chef should fix first for maximum business impact.
// Non-blocking: dashboard renders fine without this.

import { parseWithOllama } from './parse-ollama'
import { z } from 'zod'

const PrioritySchema = z.object({
  recommendation: z.string(),
})

type GapSummary = {
  recipeGapsCount: number
  clientGapsCount: number
  ingredientCoverage: number
  neverPricedCount: number
  staleCount: number
  menuGapsCount: number
}

export async function generateSuggestionPriority(gaps: GapSummary): Promise<string | null> {
  const totalGaps =
    gaps.recipeGapsCount +
    gaps.clientGapsCount +
    gaps.menuGapsCount +
    gaps.neverPricedCount +
    gaps.staleCount
  if (totalGaps === 0) return null

  try {
    const prompt = [
      `Recipe gaps: ${gaps.recipeGapsCount} recipes with unpriced ingredients`,
      `Client gaps: ${gaps.clientGapsCount} clients missing dietary/allergy/phone info`,
      `Ingredient coverage: ${gaps.ingredientCoverage}% (${gaps.neverPricedCount} never priced, ${gaps.staleCount} stale)`,
      `Menu gaps: ${gaps.menuGapsCount} menus incomplete`,
    ].join('\n')

    const result = await parseWithOllama(
      `You are a private chef's business advisor. Given these data gaps, write one concise sentence (max 30 words) recommending what to fix first and why it matters for the business. Focus on financial impact or client safety. Never use em dashes. Return JSON: {"recommendation": "..."}`,
      prompt,
      PrioritySchema,
      { modelTier: 'fast', maxTokens: 100, timeoutMs: 6000 }
    )

    return result.recommendation
  } catch {
    return null
  }
}
