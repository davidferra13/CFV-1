// Sentiment Analysis Formula — Keyword-Based Scoring
// Scores individual messages using weighted keyword matching.
// Computes thread trends using score trajectory.
// No AI needed for 80%+ of cases.
//
// Private chef context: messages are short, direct, and follow predictable patterns.
// Clients say "that was amazing" or "the fish was dry." This isn't literary analysis.

export type SentimentLevel = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'

// ── Weighted Keyword Lists ──────────────────────────────────────────────
// Each keyword has a score. Positive keywords add points, negative subtract.
// Score range: -10 to +10 per message.

const POSITIVE_KEYWORDS: [string, number][] = [
  // Strong positive (+3)
  ['amazing', 3],
  ['incredible', 3],
  ['outstanding', 3],
  ['exceptional', 3],
  ['perfect', 3],
  ['blown away', 3],
  ['best meal', 3],
  ['best dinner', 3],
  ['absolutely love', 3],
  ["can't wait to book", 3],
  ['highly recommend', 3],
  ['tell everyone', 3],
  ['told our friends', 3],
  ['rebook', 3],
  ['book again', 3],
  ['exceeded expectations', 3],
  ['above and beyond', 3],
  ['life changing', 3],

  // Moderate positive (+2)
  ['love', 2],
  ['loved', 2],
  ['wonderful', 2],
  ['fantastic', 2],
  ['delicious', 2],
  ['excellent', 2],
  ['impressed', 2],
  ['beautiful', 2],
  ['gorgeous', 2],
  ['stunning', 2],
  ['divine', 2],
  ['heavenly', 2],
  ['spectacular', 2],
  ['phenomenal', 2],
  ['superb', 2],
  ['so good', 2],
  ['really good', 2],
  ['so happy', 2],
  ['highlight of', 2],
  ['made our night', 2],
  ['made our day', 2],

  // Light positive (+1)
  ['great', 1],
  ['good', 1],
  ['nice', 1],
  ['enjoyed', 1],
  ['thank', 1],
  ['thanks', 1],
  ['appreciate', 1],
  ['grateful', 1],
  ['happy', 1],
  ['pleased', 1],
  ['satisfied', 1],
  ['yummy', 1],
  ['tasty', 1],
  ['lovely', 1],
  ['looking forward', 1],
  ['excited', 1],
  ["can't wait", 1],
  ['fun', 1],
]

const NEGATIVE_KEYWORDS: [string, number][] = [
  // Strong negative (-3)
  ['never again', -3],
  ["won't be booking", -3],
  ["won't book", -3],
  ['want a refund', -3],
  ['requesting refund', -3],
  ['demand refund', -3],
  ['terrible', -3],
  ['awful', -3],
  ['disgusting', -3],
  ['unacceptable', -3],
  ['worst', -3],
  ['ruined', -3],
  ['disaster', -3],
  ['waste of money', -3],
  ['not worth', -3],
  ['rip off', -3],
  ['rip-off', -3],
  ['food poisoning', -3],
  ['got sick', -3],
  ['made us sick', -3],

  // Moderate negative (-2)
  ['disappointed', -2],
  ['disappointing', -2],
  ['frustrat', -2],
  ['overcooked', -2],
  ['undercooked', -2],
  ['raw', -2],
  ['burnt', -2],
  ['cold food', -2],
  ['food was cold', -2],
  ['late', -2],
  ['waited too long', -2],
  ['not what we expected', -2],
  ['expected more', -2],
  ['expected better', -2],
  ['bland', -2],
  ['tasteless', -2],
  ['salty', -2],
  ['too salty', -2],
  ['greasy', -2],
  ['dry', -2],
  ['tough', -2],
  ['complaint', -2],
  ['complaining', -2],
  ['unhappy', -2],
  ['upset', -2],
  ['cancel', -2],
  ['cancelling', -2],
  ['canceling', -2],

  // Light negative (-1)
  ['okay', -1],
  ['just okay', -1],
  ['fine', -1],
  ['mediocre', -1],
  ['not great', -1],
  ['could be better', -1],
  ['room for improvement', -1],
  ['wish', -1],
  ['hoped', -1],
  ['hoping for more', -1],
  ['a bit', -1],
  ['slightly', -1],
  ['minor issue', -1],
  ['small concern', -1],
]

// ── Single Message Scoring ──────────────────────────────────────────────

export function scoreMessage(body: string): { score: number; sentiment: SentimentLevel } {
  const lower = body.toLowerCase()
  let score = 0

  for (const [keyword, weight] of POSITIVE_KEYWORDS) {
    if (lower.includes(keyword)) score += weight
  }
  for (const [keyword, weight] of NEGATIVE_KEYWORDS) {
    if (lower.includes(keyword)) score += weight // weight is already negative
  }

  // Clamp to reasonable range
  score = Math.max(-10, Math.min(10, score))

  let sentiment: SentimentLevel
  if (score >= 5) sentiment = 'very_positive'
  else if (score >= 2) sentiment = 'positive'
  else if (score >= -1) sentiment = 'neutral'
  else if (score >= -4) sentiment = 'negative'
  else sentiment = 'very_negative'

  return { score, sentiment }
}

// ── Thread Analysis ─────────────────────────────────────────────────────

export interface ThreadSentimentResult {
  overallSentiment: SentimentLevel
  trend: 'improving' | 'stable' | 'declining'
  riskFlag: boolean
  riskReason: string | null
  messageSentiments: { messageSnippet: string; sentiment: SentimentLevel }[]
  actionRecommendation: string | null
  confidence: 'high' | 'medium' | 'low'
}

export function analyzeThreadSentiment(
  messages: { body: string | null; created_at: string | null }[]
): ThreadSentimentResult {
  if (messages.length === 0) {
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

  // Score each message
  const scored = messages.map((m) => {
    const body = m.body ?? ''
    const { score, sentiment } = scoreMessage(body)
    return {
      body,
      score,
      sentiment,
      snippet: body.slice(0, 60),
    }
  })

  // Overall sentiment: weighted average (more recent messages matter more)
  const totalWeight = scored.reduce((sum, _, i) => sum + (i + 1), 0)
  const weightedScore =
    scored.reduce((sum, s, i) => sum + s.score * (i + 1), 0) / (totalWeight || 1)

  let overallSentiment: SentimentLevel
  if (weightedScore >= 4) overallSentiment = 'very_positive'
  else if (weightedScore >= 1.5) overallSentiment = 'positive'
  else if (weightedScore >= -1) overallSentiment = 'neutral'
  else if (weightedScore >= -3) overallSentiment = 'negative'
  else overallSentiment = 'very_negative'

  // Trend: compare first half vs second half average scores
  const midpoint = Math.floor(scored.length / 2) || 1
  const firstHalf = scored.slice(0, midpoint)
  const secondHalf = scored.slice(midpoint)
  const firstAvg = firstHalf.reduce((s, m) => s + m.score, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((s, m) => s + m.score, 0) / secondHalf.length
  const trendDiff = secondAvg - firstAvg

  let trend: 'improving' | 'stable' | 'declining'
  if (trendDiff > 1) trend = 'improving'
  else if (trendDiff < -1) trend = 'declining'
  else trend = 'stable'

  // Risk flag: declining trend + recent negative messages
  const recentNegative = scored.slice(-3).some((s) => s.score <= -2)
  const riskFlag = (trend === 'declining' && recentNegative) || weightedScore <= -3

  let riskReason: string | null = null
  let actionRecommendation: string | null = null

  if (riskFlag) {
    if (trend === 'declining') {
      riskReason = 'Client tone has been declining over recent messages.'
      actionRecommendation =
        'Reach out with a personal message acknowledging their feedback and offering to make their next experience better.'
    } else {
      riskReason = 'Multiple negative signals detected in client messages.'
      actionRecommendation =
        'Schedule a brief call to address concerns directly. Consider a complimentary add-on for their next booking.'
    }
  }

  // Confidence based on message count
  let confidence: 'high' | 'medium' | 'low'
  if (scored.length >= 5) confidence = 'high'
  else if (scored.length >= 3) confidence = 'medium'
  else confidence = 'low'

  return {
    overallSentiment,
    trend,
    riskFlag,
    riskReason,
    messageSentiments: scored.map((s) => ({
      messageSnippet: s.snippet,
      sentiment: s.sentiment,
    })),
    actionRecommendation,
    confidence,
  }
}
