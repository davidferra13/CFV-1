// Remy Lip-Sync Viseme Engine
// Maps text characters/phonemes to sprite sheet frame coordinates.
// Deterministic — no AI, no network calls. Pure lookup table.
//
// Sprite sheet: /public/images/remy/remy-sprite.png
// Layout: 4 columns x 4 rows = 16 frames, each ~260x256px
// Each frame is a COMPLETE Remy face (hat, eyes, mouth).

// ─── Viseme Types ─────────────────────────────────────────────────────────────

export type Viseme =
  | 'rest' // M P B — closed mouth
  | 'ah' // AH — wide open
  | 'eh' // EH — mid open
  | 'ee' // EE — tight teeth
  | 'oh' // OH — round open
  | 'ooh' // OO W Q — puckered
  | 'fv' // F V — bottom lip bite
  | 'lth' // L TH — tongue
  | 'chsh' // CH SH — forward flare
  | 'rer' // R ER — tight er
  | 'kgn' // K G N — relaxed open
  | 'gasp' // GASP — small vertical (surprise)

// ─── Emotion Types ──────────────────────────────────────────────────────────

export type RemyEmotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised'

// ─── Sprite Sheet Constants ─────────────────────────────────────────────────

export const SPRITE_PATH = '/images/remy/remy-sprite.png'
export const SPRITE_COLS = 4
export const SPRITE_ROWS = 4
export const FRAME_WIDTH = 260 // px per cell in the source image
export const FRAME_HEIGHT = 256 // px per cell in the source image

/** Pixels of label text at top of each sprite cell to skip via CSS offset */
export const LABEL_CROP_TOP = 40

export interface SpriteFrame {
  col: number // 0-3
  row: number // 0-3
}

// ─── Viseme → Sprite Frame Coordinates ──────────────────────────────────────

export const VISEME_FRAMES: Record<Viseme, SpriteFrame> = {
  rest: { col: 0, row: 0 }, // M P B
  ah: { col: 1, row: 0 }, // AH
  eh: { col: 2, row: 0 }, // EH
  ee: { col: 3, row: 0 }, // EE
  oh: { col: 0, row: 1 }, // OH
  ooh: { col: 1, row: 1 }, // OO W Q
  fv: { col: 2, row: 1 }, // F V
  lth: { col: 3, row: 1 }, // L TH
  chsh: { col: 0, row: 2 }, // CH SH
  rer: { col: 1, row: 2 }, // R ER
  kgn: { col: 2, row: 2 }, // K G N
  gasp: { col: 2, row: 3 }, // GASP
}

// ─── Emotion → Sprite Frame Coordinates ─────────────────────────────────────
// Used as the "rest" face between responses based on sentiment.

export const EMOTION_FRAMES: Record<RemyEmotion, SpriteFrame> = {
  neutral: { col: 0, row: 0 }, // same as rest (M P B)
  happy: { col: 3, row: 2 }, // closed smile
  sad: { col: 0, row: 3 }, // closed frown
  angry: { col: 1, row: 3 }, // teeth frown
  surprised: { col: 2, row: 3 }, // GASP
}

// ─── Digraph Detection ────────────────────────────────────────────────────────
// Order matters — check longer patterns first.

const DIGRAPHS: [string, Viseme][] = [
  ['SH', 'chsh'],
  ['CH', 'chsh'],
  ['TH', 'lth'],
  ['NG', 'kgn'],
  ['ER', 'rer'],
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

  // Ee — tight teeth (C, D, S, T, X, Y, Z)
  C: 'ee',
  D: 'ee',
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

  // R — tight ER (distinct from ee)
  R: 'rer',

  // K, G, N — relaxed open (distinct from ee)
  K: 'kgn',
  G: 'kgn',
  N: 'kgn',

  // H, J defaults
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
