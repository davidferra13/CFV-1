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
    .eq('direction', 'inbound') // only client-sent messages
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

CALIBRATION GUIDE (private chef context):
- "very_positive": Effusive praise, referrals, rebook requests. "That was the best meal we've ever had at home!" / "We already told three friends about you"
- "positive": Happy, satisfied, normal warm communication. "Thanks so much, everything was great!" / "The kids loved the pasta"
- "neutral": Logistical messages, simple confirmations. "Sounds good, see you Saturday" / "Can we move dinner to 7?"
- "negative": Disappointment, complaints, unmet expectations. "The salmon was a bit overcooked" / "We were hoping for more variety" / "The timing felt rushed"
- "very_negative": Anger, cancellation threats, refund requests. "We won't be booking again" / "This was not worth the price"

TREND:
- "improving": Most recent messages are warmer/more positive than earlier ones
- "stable": Consistent tone throughout
- "declining": Recent messages are cooler/more negative than earlier ones

RISK FLAG — set true ONLY when:
- Client expresses unresolved disappointment (not just a one-off comment they moved past)
- Tone has been declining over multiple messages
- Client mentions competing services, cancellation, or dissatisfaction with value
- Do NOT flag risk for normal logistical requests, schedule changes, or dietary updates

ACTION RECOMMENDATION (when risk flagged):
- Suggest a specific chef action: a personal call, a complimentary add-on, addressing the specific concern mentioned
- Not generic "reach out" — reference what the client actually said

Return valid JSON only.`

  const userContent = `Client messages (chronological, client-sent only):
${messages.map((m, i) => `${i + 1}. [${m.created_at?.split('T')[0] ?? 'Date unknown'}]: "${m.body?.slice(0, 150) ?? ''}"`).join('\n')}

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

  const systemPrompt = `Classify this single message sentiment as: very_positive, positive, neutral, negative, or very_negative.

Examples:
- "That was amazing, thank you!" → positive
- "Can we do 6:30 instead of 7?" → neutral
- "The chicken was dry and the sides were cold" → negative

Return JSON only.`
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
