'use server'

// Client Sentiment Analysis — Formula First
// Keyword scoring handles 80%+ of cases. Thread trend is computed mathematically.
//
// Previously used Ollama for all sentiment analysis.
// Replaced with deterministic keyword scoring because:
// 1. Private chef messages are short and direct (not literary prose)
// 2. "That was amazing" and "the fish was dry" don't need AI to classify
// 3. The talk on LLM limitations showed AI confidence scores are meaningless
//    and format/label changes cause dramatically different outputs
// 4. A formula gives the same answer every time, instantly, for free
//
// AI is kept ONLY for the full thread analysis when the formula is uncertain
// (e.g., sarcasm, mixed signals across many messages). The quick badge scorer
// is now 100% deterministic.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import {
  analyzeThreadSentiment,
  scoreMessage,
  type ThreadSentimentResult,
  type SentimentLevel,
} from '@/lib/formulas/sentiment'

export type SentimentAnalysis = ThreadSentimentResult

// ── Full Thread Analysis (Formula) ──────────────────────────────────────

export async function analyzeClientSentiment(clientId: string): Promise<SentimentAnalysis> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: messages } = await supabase
    .from('messages')
    .select('body, direction, created_at')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .eq('direction', 'inbound')
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

  // Pure formula. Keyword scoring + trend math. Instant. Free. Deterministic.
  return analyzeThreadSentiment(messages)
}

// ── Per-message quick score (for inline badges) ───────────────────────────

export async function quickMessageSentiment(
  messageBody: string
): Promise<{ sentiment: SentimentLevel }> {
  await requireChef()

  // Pure formula. No AI. Returns same answer every time.
  const { sentiment } = scoreMessage(messageBody)
  return { sentiment }
}
