// AI Re-engagement Email Draft Generator
// Creates personalized re-engagement email copy based on client history.
// Used by the client-reengagement cron to replace generic static text.

import { parseWithOllama } from './parse-ollama'
import { z } from 'zod'

const ReengagementDraftSchema = z.object({
  greeting: z.string(),
  body: z.string(),
  cta: z.string(),
})

type ReengagementContext = {
  clientName: string
  chefName: string
  daysSinceLastEvent: number
  lastOccasion?: string | null
  lastGuestCount?: number | null
}

export async function generateReengagementDraft(ctx: ReengagementContext): Promise<{
  greeting: string
  body: string
  cta: string
} | null> {
  try {
    const prompt = [
      `Client: ${ctx.clientName}`,
      `Chef: ${ctx.chefName}`,
      `Days since last event: ${ctx.daysSinceLastEvent}`,
      ctx.lastOccasion ? `Last occasion: ${ctx.lastOccasion}` : null,
      ctx.lastGuestCount ? `Last guest count: ${ctx.lastGuestCount}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    return await parseWithOllama(
      `You are writing a warm, personal re-engagement email from a private chef to a past client. The email should feel like it's coming from a real person, not a marketing template. Reference their past experience if known. Keep it short (2-3 sentences for body). No pressure, no sales language. Never use em dashes. Return JSON: {"greeting": "Hi [name],", "body": "...", "cta": "short call-to-action text for the button"}`,
      prompt,
      ReengagementDraftSchema,
      { modelTier: 'fast', maxTokens: 200, timeoutMs: 8000 }
    )
  } catch {
    return null
  }
}
