// @ts-nocheck
'use server'

// Client Sentiment Analysis
// Analyzes a client message thread for sentiment trend.
// Flags when tone shifts negative — indicating dissatisfaction risk.
// Routed to Ollama (client messages contain PII).
// Output is INSIGHT ONLY — never modifies message records.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from './parse-ollama'
import { OllamaOfflineError } from './ollama-errors'
import { z } from 'zod'

// ── Zod schema ──────────────────────────────────────────────────────────────

const SentimentLevel = z.enum(['very_positive', 'positive', 'neutral', 'negative', 'very_negative'])

const MessageSentimentSchema = z.object({
  messageSnippet: z.string(), // first 60 chars of the message
  sentiment: SentimentLevel,
})

const SentimentAnalysisSchema = z.object({
  overallSentiment: SentimentLevel,
  trend: z.enum(['improving', 'stable', 'declining']),
  riskFlag: z.boolean(), // true if dissatisfaction risk detected
  riskReason: z.string().nullable(),
  messageSentiments: z.array(MessageSentimentSchema),
  actionRecommendation: z.string().nullable(), // suggested chef action if risk flagged
  confidence: z.enum(['high', 'medium', 'low']),
})

export type SentimentAnalysis = z.infer<typeof SentimentAnalysisSchema>

// ── Server Action ─────────────────────────────────────────────────────────

export async function analyzeClientSentiment(clientId: string): Promise<SentimentAnalysis> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: messages } = await supabase
    .from('messages')
    .select('body, direction, created_at')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .eq('direction', 'in') // only client-sent messages
    .order('created_at', { ascending: true })
    .limit(20)

  if (!messages || messages.length === 0) {
    return {
      overallSentiment: 'neutral',
      trend: 'stable',
      riskFlag: false,
      riskReason: null,
      messageSentiments: [],
      actionRecommendation: null,
      confidence: 'low',
    }
  }

  const systemPrompt = `You are a customer relationship analyst for a private chef business.
Analyze the client's messages for sentiment and trend.
Focus on: satisfaction signals, frustration, urgency, disappointment, enthusiasm.
Risk flag: true only if there is a genuine dissatisfaction risk requiring chef attention.
Return valid JSON only.`

  const userContent = `Client messages (chronological, client-sent only):
${messages.map((m, i) => `${i + 1}. [${m.created_at?.split('T')[0] ?? 'Date unknown'}]: "${(m.body as string)?.slice(0, 150) ?? ''}"`).join('\n')}

Return JSON: {
  "overallSentiment": "very_positive|positive|neutral|negative|very_negative",
  "trend": "improving|stable|declining",
  "riskFlag": bool,
  "riskReason": "...or null",
  "messageSentiments": [{"messageSnippet": "first 60 chars", "sentiment": "..."}],
  "actionRecommendation": "one sentence suggestion if risk flagged, else null",
  "confidence": "high|medium|low"
}`

  try {
    return await parseWithOllama(systemPrompt, userContent, SentimentAnalysisSchema, {
      modelTier: 'fast',
    })
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[sentiment-analysis] Failed:', err)
    return {
      overallSentiment: 'neutral',
      trend: 'stable',
      riskFlag: false,
      riskReason: null,
      messageSentiments: [],
      actionRecommendation: null,
      confidence: 'low',
    }
  }
}

// ── Per-message quick score (for inline badges) ───────────────────────────

const QuickSentimentSchema = z.object({
  sentiment: SentimentLevel,
})

export async function quickMessageSentiment(
  messageBody: string
): Promise<z.infer<typeof QuickSentimentSchema>> {
  await requireChef()

  const systemPrompt = `Classify this single message sentiment as: very_positive, positive, neutral, negative, or very_negative. Return JSON only.`
  const userContent = `Message: "${messageBody.slice(0, 300)}"\nReturn: { "sentiment": "..." }`

  try {
    return await parseWithOllama(systemPrompt, userContent, QuickSentimentSchema, {
      modelTier: 'fast',
      cache: true,
    })
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    return { sentiment: 'neutral' }
  }
}
