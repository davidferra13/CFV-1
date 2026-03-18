// Remy - Conversation Summary Generator (Phase 3C)
// Auto-generates 2-3 sentence summaries when a conversation ends or reaches 10+ messages.
// Deterministic where possible (entity extraction, topic detection).
// Summaries stored in IndexedDB alongside conversations (local only - privacy).

import type { RemyMessage } from '@/lib/ai/remy-types'

export interface ConversationSummary {
  summary: string
  topics: string[]
  entities: string[]
  messageCount: number
  generatedAt: string
}

// Topic keywords to category mapping
const TOPIC_KEYWORDS: Record<string, string[]> = {
  events: [
    'event',
    'party',
    'dinner',
    'wedding',
    'brunch',
    'luncheon',
    'reception',
    'gala',
    'catering',
  ],
  clients: ['client', 'customer', 'guest', 'booking', 'booked'],
  finances: [
    'invoice',
    'payment',
    'revenue',
    'expense',
    'quote',
    'pricing',
    'deposit',
    'overdue',
    'profit',
    'margin',
  ],
  recipes: ['recipe', 'dish', 'menu', 'ingredient', 'cook', 'prep', 'sauce', 'course'],
  inquiries: ['inquiry', 'lead', 'prospect', 'follow-up', 'follow up', 'outreach'],
  scheduling: ['calendar', 'schedule', 'date', 'blocked', 'availability', 'waitlist'],
  operations: ['prep list', 'grocery list', 'staff', 'equipment', 'timeline'],
  analytics: ['analytics', 'trend', 'conversion', 'retention', 'performance', 'stats'],
}

/**
 * Extract topics discussed in a conversation based on message content.
 */
function extractTopics(messages: RemyMessage[]): string[] {
  const allText = messages.map((m) => m.content.toLowerCase()).join(' ')
  const found: string[] = []

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => allText.includes(kw))) {
      found.push(topic)
    }
  }

  return found
}

/**
 * Extract named entities (proper nouns) from messages.
 */
function extractNamedEntities(messages: RemyMessage[]): string[] {
  const names = new Set<string>()
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g

  const skipNames = new Set([
    'remy',
    'chefflow',
    'good morning',
    'good afternoon',
    'good evening',
    'let me',
    'here are',
    'no problem',
    'i can',
    'you have',
  ])

  for (const msg of messages) {
    let match
    while ((match = namePattern.exec(msg.content)) !== null) {
      const name = match[1]
      if (name.length >= 4 && name.length <= 40 && !skipNames.has(name.toLowerCase())) {
        names.add(name)
      }
    }
  }

  return Array.from(names).slice(0, 5)
}

/**
 * Detect the primary action types discussed (drafting, searching, scheduling, etc.)
 */
function detectActions(messages: RemyMessage[]): string[] {
  const actions: string[] = []
  const userMessages = messages.filter((m) => m.role === 'user')
  const allUserText = userMessages.map((m) => m.content.toLowerCase()).join(' ')

  if (/\b(?:draft|write|compose|create)\b/.test(allUserText)) actions.push('drafting')
  if (/\b(?:search|find|look up|lookup)\b/.test(allUserText)) actions.push('searching')
  if (/\b(?:check|review|show|list)\b/.test(allUserText)) actions.push('reviewing')
  if (/\b(?:schedule|book|calendar)\b/.test(allUserText)) actions.push('scheduling')
  if (/\b(?:analyze|compare|trend)\b/.test(allUserText)) actions.push('analyzing')

  return actions
}

/**
 * Generate a deterministic conversation summary.
 * Returns a 2-3 sentence summary without any LLM call.
 */
export function generateConversationSummary(messages: RemyMessage[]): ConversationSummary {
  const userMessages = messages.filter((m) => m.role === 'user')
  const remyMessages = messages.filter((m) => m.role === 'remy')
  const topics = extractTopics(messages)
  const entities = extractNamedEntities(messages)
  const actions = detectActions(messages)

  // Build summary sentence
  const parts: string[] = []

  // Part 1: What was discussed
  if (topics.length > 0) {
    parts.push(`Discussed ${topics.join(', ')}`)
  } else {
    parts.push('General conversation')
  }

  // Part 2: Who/what was involved
  if (entities.length > 0) {
    parts.push(`involving ${entities.slice(0, 3).join(', ')}`)
  }

  // Part 3: What actions were taken
  if (actions.length > 0) {
    parts.push(`(${actions.join(', ')})`)
  }

  // Part 4: Key user questions (first 2)
  const keyQuestions = userMessages
    .filter((m) => m.content.length > 10)
    .slice(0, 2)
    .map((m) => m.content.slice(0, 60).replace(/\n/g, ' ').trim())

  let summary = parts.join(' ') + '.'

  if (keyQuestions.length > 0) {
    summary += ` Key questions: "${keyQuestions.join('", "')}"`
  }

  // Check for task completions
  const tasksCompleted = remyMessages.reduce((count, m) => {
    if (!m.tasks) return count
    return count + m.tasks.filter((t) => t.status === 'done').length
  }, 0)

  if (tasksCompleted > 0) {
    summary += ` ${tasksCompleted} task${tasksCompleted !== 1 ? 's' : ''} completed.`
  }

  return {
    summary,
    topics,
    entities,
    messageCount: messages.length,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Check if a conversation should get a summary (10+ messages or conversation ending).
 */
export function shouldGenerateSummary(messages: RemyMessage[]): boolean {
  return messages.length >= 10
}

/**
 * Format recent summaries for inclusion in the system prompt.
 */
export function formatSummariesForPrompt(summaries: ConversationSummary[]): string {
  if (summaries.length === 0) return ''

  const lines = ['Recent conversation context:']
  for (const s of summaries.slice(0, 3)) {
    const age = Math.floor((Date.now() - new Date(s.generatedAt).getTime()) / (1000 * 60 * 60))
    const timeLabel =
      age < 1 ? 'just now' : age < 24 ? `${age}h ago` : `${Math.floor(age / 24)}d ago`
    lines.push(`- (${timeLabel}) ${s.summary}`)
  }
  return lines.join('\n')
}
