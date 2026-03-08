import type { MessageIntent } from '@/lib/ai/remy-types'

type SupportedIntent = Extract<MessageIntent, 'question' | 'command' | 'mixed'>

export interface SimilarityClassificationResult {
  intent: SupportedIntent
  confidence: number
  commandPart?: string
  questionPart?: string
}

interface IntentPrototype {
  intent: SupportedIntent
  text: string
}

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'at',
  'be',
  'for',
  'from',
  'have',
  'how',
  'i',
  'is',
  'it',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'please',
  'the',
  'their',
  'them',
  'to',
  'what',
  'when',
  'where',
  'who',
  'why',
  'with',
  'you',
  'your',
])

const PROTOTYPES: IntentPrototype[] = [
  { intent: 'command', text: 'need Sarah allergies' },
  { intent: 'command', text: 'pull up my upcoming events' },
  { intent: 'command', text: 'draft a follow up email for the Hendersons' },
  { intent: 'command', text: 'create an event for next Saturday' },
  { intent: 'command', text: 'check if March 15 is free' },
  { intent: 'command', text: 'search the web for private chef rates' },
  { intent: 'command', text: 'show my culinary profile' },
  { intent: 'command', text: 'calculate portions for 30 guests' },
  { intent: 'command', text: 'generate a packing list for the wedding' },
  { intent: 'command', text: 'find my client Sarah Johnson' },
  { intent: 'command', text: 'import these client notes' },
  { intent: 'command', text: 'open the calendar' },
  { intent: 'question', text: 'how is my revenue this month' },
  { intent: 'question', text: 'what should I charge for a 20 person brunch' },
  { intent: 'question', text: 'any tips for pricing a tasting menu' },
  { intent: 'question', text: 'tell me about my upcoming events' },
  { intent: 'question', text: 'what is on my calendar this week' },
  { intent: 'question', text: 'am I overbooked next month' },
  { intent: 'question', text: 'explain the tasting menu' },
  { intent: 'question', text: 'compare this year to last year' },
  { intent: 'question', text: 'should I raise my rates' },
  { intent: 'question', text: 'how fast do I respond to inquiries' },
  { intent: 'question', text: 'give me an overview of my business' },
  { intent: 'mixed', text: 'what is my revenue this month and draft a follow up for Sarah' },
  { intent: 'mixed', text: 'tell me who has not paid and write a payment reminder' },
  { intent: 'mixed', text: 'what do I have tomorrow and create a todo for groceries' },
  { intent: 'mixed', text: 'how is next week looking and block off Friday morning' },
  { intent: 'mixed', text: 'show me upcoming events and draft a note for the Johnsons' },
]

const QUESTION_OPENERS =
  /^(how|what|why|when|where|who|which|can|could|should|would|do|does|did|is|are|am|tell me|give me)\b/i
const COMMAND_OPENERS =
  /^(draft|write|create|make|add|find|check|show|search|open|go to|navigate|pull|get|calculate|generate|list|import|process|read|block|remind|need)\b/i
const COMMAND_BODY_CUES =
  /\b(draft|follow.?up|allerg|availability|calendar|pack|search|find|quote|pricing|revenue|todo|create|make|write|send|reply|check|show|open|import|process|read|block|schedule)\b/i
const QUESTION_BODY_CUES =
  /\b(tips|advice|thoughts|overview|summary|compare|explain|should|why|how|what|when)\b/i
const MIXED_SEPARATOR_CUES = [
  ' and then ',
  ', and ',
  ' and ',
  ' then ',
  ' also ',
  ' plus ',
  '? and ',
]

const PROTOTYPE_VECTORS = PROTOTYPES.map((prototype) => ({
  ...prototype,
  vector: buildVector(tokenize(prototype.text)),
}))

function normalizeIntentText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9/$%? ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  const words = normalizeIntentText(text)
    .split(' ')
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token))

  const bigrams: string[] = []
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]}_${words[i + 1]}`)
  }

  return [...words, ...bigrams]
}

function buildVector(tokens: string[]): Map<string, number> {
  const vector = new Map<string, number>()
  for (const token of tokens) {
    vector.set(token, (vector.get(token) ?? 0) + 1)
  }
  return vector
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  if (a.size === 0 || b.size === 0) return 0

  let dot = 0
  let normA = 0
  let normB = 0

  for (const value of a.values()) normA += value * value
  for (const value of b.values()) normB += value * value
  for (const [token, value] of a) {
    dot += value * (b.get(token) ?? 0)
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function getCueProfile(message: string): Record<SupportedIntent, number> {
  const trimmed = message.trim()
  const lower = trimmed.toLowerCase()

  let question = 0
  let command = 0
  let mixed = 0

  if (QUESTION_OPENERS.test(trimmed)) question += 0.26
  if (COMMAND_OPENERS.test(trimmed)) command += 0.3
  if (trimmed.includes('?')) question += 0.18
  if (QUESTION_BODY_CUES.test(lower)) question += 0.12
  if (COMMAND_BODY_CUES.test(lower)) command += 0.12
  if (/https?:\/\//i.test(lower)) command += 0.18

  const hasSeparator = MIXED_SEPARATOR_CUES.some((separator) => lower.includes(separator))
  if (hasSeparator && question > 0.08 && command > 0.08) {
    mixed += 0.3
  }
  if (trimmed.includes('?') && command > 0.08) {
    mixed += 0.16
  }

  return { question, command, mixed }
}

function getPrototypeProfile(message: string): Record<SupportedIntent, number> {
  const vector = buildVector(tokenize(message))
  const byIntent: Record<SupportedIntent, number[]> = {
    question: [],
    command: [],
    mixed: [],
  }

  for (const prototype of PROTOTYPE_VECTORS) {
    byIntent[prototype.intent].push(cosineSimilarity(vector, prototype.vector))
  }

  const result = {
    question: 0,
    command: 0,
    mixed: 0,
  }

  for (const intent of Object.keys(byIntent) as SupportedIntent[]) {
    const top = byIntent[intent].sort((a, b) => b - a).slice(0, 3)
    if (top.length === 0) continue
    result[intent] =
      top.reduce((sum, score, index) => sum + score * (index === 0 ? 1 : 0.7), 0) /
      (top.length > 1 ? 1.7 : 1)
  }

  return result
}

function scoreSegmentIntent(segment: string): Record<'question' | 'command', number> {
  const cues = getCueProfile(segment)
  const prototypes = getPrototypeProfile(segment)
  return {
    question: prototypes.question * 0.75 + cues.question,
    command: prototypes.command * 0.75 + cues.command,
  }
}

function splitMixedMessage(
  message: string
): Pick<SimilarityClassificationResult, 'commandPart' | 'questionPart'> {
  const lower = message.toLowerCase()

  for (const separator of MIXED_SEPARATOR_CUES) {
    const index = lower.indexOf(separator)
    if (index === -1) continue

    const left = message
      .slice(0, index)
      .trim()
      .replace(/[?,\s]+$/, '')
    const right = message
      .slice(index + separator.length)
      .trim()
      .replace(/^[,\s]+/, '')
    if (!left || !right) continue

    const leftScore = scoreSegmentIntent(left)
    const rightScore = scoreSegmentIntent(right)

    if (leftScore.question > leftScore.command && rightScore.command >= rightScore.question) {
      return { questionPart: left, commandPart: right }
    }

    if (leftScore.command > leftScore.question && rightScore.question >= rightScore.command) {
      return { commandPart: left, questionPart: right }
    }
  }

  return {}
}

export function trySimilarityClassify(message: string): SimilarityClassificationResult | null {
  const trimmed = message.trim()
  const tokens = tokenize(trimmed)
  if (tokens.length < 3) return null

  const cueProfile = getCueProfile(trimmed)
  const prototypeProfile = getPrototypeProfile(trimmed)

  const scores: Record<SupportedIntent, number> = {
    question: prototypeProfile.question * 0.75 + cueProfile.question,
    command: prototypeProfile.command * 0.75 + cueProfile.command,
    mixed:
      prototypeProfile.mixed * 0.8 +
      cueProfile.mixed +
      Math.min(cueProfile.question, 0.14) +
      Math.min(cueProfile.command, 0.14),
  }

  const ranked = (Object.entries(scores) as Array<[SupportedIntent, number]>).sort(
    (a, b) => b[1] - a[1]
  )
  const [bestIntent, bestScore] = ranked[0]
  const secondScore = ranked[1]?.[1] ?? 0
  const margin = bestScore - secondScore

  if (bestScore < 0.52 || margin < 0.08) return null

  const confidence = Math.max(0.58, Math.min(0.88, 0.45 + bestScore * 0.38 + margin * 0.3))

  if (bestIntent === 'mixed') {
    return {
      intent: 'mixed',
      confidence,
      ...splitMixedMessage(trimmed),
    }
  }

  return {
    intent: bestIntent,
    confidence,
  }
}
