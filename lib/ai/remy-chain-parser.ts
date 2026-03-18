// Remy - Multi-Step Task Chain Parser (Phase 3B)
// Deterministic parser that splits compound requests into ordered steps.
// "Draft a thank-you for Henderson and log the final expense" ->
//   Step 1: "Draft a thank-you for Henderson"
//   Step 2: "Log the final expense"
// Max 3 steps per chain. Each step gets individual confirmation.
// NO LLM - pure regex splitting.

const MAX_CHAIN_STEPS = 3

// Conjunctions that indicate a separate action (not just a compound noun)
// We need to be careful: "find and show" is one action, but "draft a message and log an expense" is two
const CHAIN_SPLITTERS = [
  /\s+and\s+then\s+/i,
  /\s+then\s+/i,
  /\s+also\s+/i,
  /\s+after\s+that\s*,?\s+/i,
  /\s*,\s+and\s+/i,
  /\s*,\s+then\s+/i,
]

// Action verbs that signal the start of a new command
const ACTION_VERBS = new Set([
  'draft',
  'write',
  'create',
  'make',
  'add',
  'set',
  'build',
  'generate',
  'prepare',
  'find',
  'search',
  'look',
  'check',
  'show',
  'pull',
  'get',
  'grab',
  'fetch',
  'send',
  'email',
  'text',
  'message',
  'respond',
  'reply',
  'decline',
  'log',
  'record',
  'track',
  'update',
  'edit',
  'change',
  'remove',
  'delete',
  'schedule',
  'book',
  'cancel',
  'reschedule',
  'remind',
  'notify',
  'alert',
  'scale',
  'calculate',
  'analyze',
  'import',
  'export',
  'parse',
  'process',
])

/**
 * Parse a compound request into ordered task steps.
 * Returns null if the message is a single command (no splitting needed).
 * Returns an array of 2-3 steps if compound commands are detected.
 */
export function parseTaskChain(message: string): string[] | null {
  const trimmed = message.trim()

  // Try each splitter pattern
  for (const splitter of CHAIN_SPLITTERS) {
    const parts = trimmed
      .split(splitter)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)

    if (parts.length < 2) continue

    // Validate that each part starts with or contains an action verb
    const validParts = parts.filter((part) => {
      const firstWord = part.split(/\s+/)[0].toLowerCase()
      return ACTION_VERBS.has(firstWord)
    })

    // Need at least 2 valid action parts to consider it a chain
    if (validParts.length >= 2) {
      return validParts.slice(0, MAX_CHAIN_STEPS)
    }
  }

  // Fallback: check for "and" between two action-verb-led clauses
  const andMatch = trimmed.match(/^(.+?)\s+and\s+(.+)$/i)
  if (andMatch) {
    const part1 = andMatch[1].trim()
    const part2 = andMatch[2].trim()
    const word1 = part1.split(/\s+/)[0].toLowerCase()
    const word2 = part2.split(/\s+/)[0].toLowerCase()

    if (ACTION_VERBS.has(word1) && ACTION_VERBS.has(word2)) {
      return [part1, part2]
    }
  }

  return null
}

/**
 * Check if a message looks like it contains multiple commands.
 * Quick pre-check before calling parseTaskChain.
 */
export function looksLikeChain(message: string): boolean {
  // Must contain a conjunction that could separate commands
  if (!/\b(?:and|then|also|after that)\b/i.test(message)) return false

  // Must contain at least 2 action verbs
  const words = message.toLowerCase().split(/\s+/)
  let actionVerbCount = 0
  for (const word of words) {
    if (ACTION_VERBS.has(word)) actionVerbCount++
    if (actionVerbCount >= 2) return true
  }

  return false
}
