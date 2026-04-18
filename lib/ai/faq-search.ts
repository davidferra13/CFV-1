// AI FAQ Search
// Takes a user question and FAQ/help article content, returns the best matching answer.
// Used as a fallback when keyword search finds nothing.

import { parseWithOllama } from './parse-ollama'
import { z } from 'zod'

const FaqAnswerSchema = z.object({
  answer: z.string(),
  matchedArticle: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low']),
})

type FaqItem = {
  title: string
  href: string
  keywords: string[]
}

export async function searchFaqWithAI(
  question: string,
  articles: FaqItem[]
): Promise<{ answer: string; matchedArticle?: string; confidence: string } | null> {
  if (!question.trim() || question.length < 3) return null

  try {
    const articleList = articles
      .map((a, i) => `${i + 1}. "${a.title}" (${a.href}) - keywords: ${a.keywords.join(', ')}`)
      .join('\n')

    const result = await parseWithOllama(
      `You are a help center assistant for ChefFlow, a private chef business management platform. Given a user's question and a list of help articles, find the most relevant article and provide a brief answer (1-2 sentences) pointing them to it. If no article matches, say so honestly. Never use em dashes. Return JSON: {"answer": "brief answer", "matchedArticle": "article title or empty", "confidence": "high|medium|low"}`,
      `User question: ${question}\n\nAvailable articles:\n${articleList}`,
      FaqAnswerSchema,
      { modelTier: 'fast', maxTokens: 150, timeoutMs: 6000 }
    )

    if (result.confidence === 'low' && !result.matchedArticle) return null
    return result
  } catch {
    return null
  }
}
