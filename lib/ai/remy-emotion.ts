// Remy Emotion Detection - Deterministic keyword matching
// Formula > AI: simple, instant, free, and correct enough.
// Runs once per completed response, not per character.

import type { RemyEmotion } from './remy-visemes'

const HAPPY_SIGNALS = [
  'great',
  'wonderful',
  'excellent',
  'perfect',
  'love',
  'fantastic',
  'awesome',
  'glad',
  'happy',
  'excited',
  'congrat',
  'beautiful',
  'delicious',
  'brilliant',
  'amazing',
  'enjoy',
]

const SAD_SIGNALS = [
  'sorry',
  'unfortunately',
  'sad',
  'regret',
  'apologize',
  'miss',
  'disappoint',
  'unable',
  'cannot',
  "can't",
  'afraid',
]

const ANGRY_SIGNALS = [
  'frustrated',
  'unacceptable',
  'wrong',
  'terrible',
  'awful',
  'angry',
  'furious',
  'outraged',
]

const SURPRISED_SIGNALS = [
  'wow',
  'incredible',
  'whoa',
  'surprising',
  'unexpected',
  'unbelievable',
  'remarkable',
]

/**
 * Detect Remy's emotional state from the text of a completed AI response.
 * Returns the dominant emotion based on keyword frequency.
 * Ties go to the first match in priority order: happy > surprised > sad > angry.
 */
export function detectEmotion(text: string): RemyEmotion {
  const lower = text.toLowerCase()

  const scores = {
    happy: HAPPY_SIGNALS.filter((s) => lower.includes(s)).length,
    surprised: SURPRISED_SIGNALS.filter((s) => lower.includes(s)).length,
    sad: SAD_SIGNALS.filter((s) => lower.includes(s)).length,
    angry: ANGRY_SIGNALS.filter((s) => lower.includes(s)).length,
  }

  // Also count exclamation marks as a happy/excited signal
  const exclamations = (text.match(/!/g) || []).length
  if (exclamations >= 2) scores.happy += 1
  // "!?" or "?!" is a surprise signal
  if (text.includes('!?') || text.includes('?!')) scores.surprised += 1

  const max = Math.max(...Object.values(scores))
  if (max === 0) return 'neutral'

  // Priority order for ties: happy > surprised > sad > angry
  if (scores.happy >= max) return 'happy'
  if (scores.surprised >= max) return 'surprised'
  if (scores.sad >= max) return 'sad'
  if (scores.angry >= max) return 'angry'

  return 'neutral'
}
