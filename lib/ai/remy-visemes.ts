// Remy Lip-Sync Viseme Engine
// Maps text characters/phonemes to mouth-shape image paths.
// Deterministic — no AI, no network calls. Pure lookup table.

// ─── Viseme Types ─────────────────────────────────────────────────────────────

export type Viseme = 'rest' | 'ah' | 'eh' | 'ee' | 'oh' | 'ooh' | 'fv' | 'lth' | 'chsh'

// ─── Image Paths ──────────────────────────────────────────────────────────────
// These map to the files in /public/images/
// Filenames will be normalized once the developer finalizes all 9 images.

export const VISEME_IMAGES: Record<Viseme, string> = {
  rest: '/images/remy/remy-mouth-rest.jpg',
  ah: '/images/remy/remy-mouth-ah.png',
  eh: '/images/remy/remy-mouth-eh.png',
  ee: '/images/remy/remy-mouth-ee.png',
  oh: '/images/remy/remy-mouth-oh.png',
  ooh: '/images/remy/remy-mouth-ooh.png',
  fv: '/images/remy/remy-mouth-fv.png',
  lth: '/images/remy/remy-mouth-lth.png',
  chsh: '/images/remy/remy-mouth-chsh.png',
}

// ─── Digraph Detection ────────────────────────────────────────────────────────
// Order matters — check longer patterns first.

const DIGRAPHS: [string, Viseme][] = [
  ['SH', 'chsh'],
  ['CH', 'chsh'],
  ['TH', 'lth'],
]

// ─── Single Character → Viseme Map ───────────────────────────────────────────

const CHAR_VISEME: Record<string, Viseme> = {
  // Resting — closed mouth (M, B, P)
  M: 'rest',
  B: 'rest',
  P: 'rest',

  // Ah — wide open (A, I)
  A: 'ah',
  I: 'ah',

  // Eh — slightly open (E)
  E: 'eh',

  // Ee — wide smile, teeth touching (C, D, G, K, N, R, S, T, X, Y, Z)
  C: 'ee',
  D: 'ee',
  G: 'ee',
  K: 'ee',
  N: 'ee',
  R: 'ee',
  S: 'ee',
  T: 'ee',
  X: 'ee',
  Y: 'ee',
  Z: 'ee',

  // Oh — round O shape (O)
  O: 'oh',

  // Ooh — puckered (U, W, Q)
  U: 'ooh',
  W: 'ooh',
  Q: 'ooh',

  // F/V — top teeth on bottom lip
  F: 'fv',
  V: 'fv',

  // L — tongue behind teeth
  L: 'lth',

  // H, J default to slightly open
  H: 'eh',
  J: 'ee',
}

// ─── Core Viseme Resolution ──────────────────────────────────────────────────

/**
 * Given a text string and a character index, resolve the viseme for that position.
 * Returns [viseme, charsConsumed] — charsConsumed is 2 for digraphs, 1 otherwise.
 *
 * Non-letter characters (spaces, punctuation, numbers, emoji) return 'rest'.
 */
export function resolveViseme(text: string, index: number): [Viseme, number] {
  const upper = text.toUpperCase()
  const char = upper[index]

  // Non-letter → resting
  if (!char || !/[A-Z]/.test(char)) {
    return ['rest', 1]
  }

  // Check digraphs first (2-char patterns)
  if (index + 1 < upper.length) {
    const pair = upper[index] + upper[index + 1]
    for (const [digraph, viseme] of DIGRAPHS) {
      if (pair === digraph) {
        return [viseme, 2]
      }
    }
  }

  // Single character lookup
  const viseme = CHAR_VISEME[char] ?? 'rest'
  return [viseme, 1]
}

// ─── Text → Viseme Sequence ─────────────────────────────────────────────────

export interface VisemeFrame {
  viseme: Viseme
  char: string
  index: number
}

/**
 * Convert a full text string into a sequence of viseme frames.
 * Each frame represents one "mouth position" with the character(s) that produced it.
 *
 * Consecutive identical visemes are NOT collapsed — the consumer controls timing.
 * Whitespace and punctuation produce 'rest' frames (mouth closes between words).
 */
export function textToVisemes(text: string): VisemeFrame[] {
  const frames: VisemeFrame[] = []
  let i = 0

  while (i < text.length) {
    const [viseme, consumed] = resolveViseme(text, i)
    frames.push({
      viseme,
      char: text.slice(i, i + consumed),
      index: i,
    })
    i += consumed
  }

  return frames
}

// ─── Streaming Viseme Resolver ──────────────────────────────────────────────

/**
 * For streaming text that arrives token-by-token, this processes a new chunk
 * and returns the viseme frames for just that chunk.
 *
 * `pendingChar` handles edge cases where a digraph spans two tokens:
 * e.g., token "S" followed by token "HOULD" — the "SH" digraph bridges them.
 *
 * Returns [frames, newPendingChar].
 */
export function processStreamChunk(
  chunk: string,
  pendingChar: string | null
): [VisemeFrame[], string | null] {
  // Prepend any pending character from the previous chunk
  const text = pendingChar ? pendingChar + chunk : chunk
  const frames: VisemeFrame[] = []
  let i = 0

  while (i < text.length) {
    // If we're at the last character and it could start a digraph, hold it
    if (i === text.length - 1) {
      const char = text[i].toUpperCase()
      const couldStartDigraph = DIGRAPHS.some(([d]) => d[0] === char)
      if (couldStartDigraph && /[A-Z]/.test(char)) {
        return [frames, text[i]]
      }
    }

    const [viseme, consumed] = resolveViseme(text, i)
    frames.push({
      viseme,
      char: text.slice(i, i + consumed),
      index: i,
    })
    i += consumed
  }

  return [frames, null]
}

// ─── Timing Constants ───────────────────────────────────────────────────────

/** How long each viseme frame is displayed (ms). Tuned for natural-looking speech. */
export const VISEME_DURATION_MS = 80

/** How long the mouth stays in resting after punctuation (ms). Creates natural pauses. */
export const PAUSE_DURATION_MS = 200

/** Characters that trigger a longer rest pause */
export const PAUSE_CHARS = new Set(['.', ',', '!', '?', ';', ':', '\n', '—', '–'])

/**
 * Get the display duration for a viseme frame.
 * Punctuation and spaces get longer pauses for natural rhythm.
 */
export function getFrameDuration(frame: VisemeFrame): number {
  if (PAUSE_CHARS.has(frame.char)) return PAUSE_DURATION_MS
  if (frame.char === ' ') return VISEME_DURATION_MS * 0.6 // Brief rest between words
  return VISEME_DURATION_MS
}
