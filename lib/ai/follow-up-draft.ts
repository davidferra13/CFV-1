// AI Follow-Up Draft Generator
// Generates contextual follow-up suggestions for overdue inquiries.
// Used by the follow-ups cron to enhance notifications with actionable context.

import { parseWithOllama } from './parse-ollama'
import { z } from 'zod'

const FollowUpDraftSchema = z.object({
  suggestion: z.string(),
  tone: z.enum(['warm', 'professional', 'urgent']),
})

type FollowUpContext = {
  clientName: string
  occasion: string | null
  daysOverdue: number
  inquiryChannel?: string | null
}

export async function generateFollowUpSuggestion(ctx: FollowUpContext): Promise<{
  suggestion: string
  tone: string
} | null> {
  try {
    const prompt = [
      `Client: ${ctx.clientName}`,
      `Occasion: ${ctx.occasion || 'not specified'}`,
      `Days since follow-up was due: ${ctx.daysOverdue}`,
      ctx.inquiryChannel ? `Channel: ${ctx.inquiryChannel}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    return await parseWithOllama(
      `You are a private chef's business assistant. Write a brief, natural follow-up suggestion (1-2 sentences) the chef can use to re-engage this client about their inquiry. Be warm but not pushy. Reference the occasion if known. Never use em dashes. Choose an appropriate tone based on urgency. Return JSON: {"suggestion": "...", "tone": "warm|professional|urgent"}`,
      prompt,
      FollowUpDraftSchema,
      { modelTier: 'fast', maxTokens: 150, timeoutMs: 8000 }
    )
  } catch {
    return null
  }
}
