// Kitchen Voice Commands
// Maps spoken phrases to KDS actions.
// Pure string matching with fuzzy tolerance, no AI needed.

// ── Types ──────────────────────────────────────────────────────────────────

export type KitchenCommand =
  | { type: 'fire'; courseNumber?: number; dishName?: string }
  | { type: 'plate'; courseNumber?: number }
  | { type: 'serve'; courseNumber?: number }
  | { type: 'eighty_six'; dishName: string }
  | { type: 'next_step' }
  | { type: 'timer'; minutes: number }
  | { type: 'mark_complete'; taskName?: string }
  | { type: 'whats_next' }
  | { type: 'all_day'; dishName?: string }
  | { type: 'heard' } // acknowledgment
  | { type: 'corner' } // movement callout
  | { type: 'behind' } // movement callout
  | { type: 'hot' } // safety callout
  | { type: 'picking_up'; dishName?: string } // taking food from pass
  | { type: 'unknown'; raw: string }

// ── Number word mapping ────────────────────────────────────────────────────

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  forty5: 45,
  sixty: 60,
}

function extractNumber(text: string): number | undefined {
  // Try direct number first
  const numMatch = text.match(/\d+/)
  if (numMatch) return parseInt(numMatch[0], 10)

  // Try word numbers
  for (const [word, num] of Object.entries(NUMBER_WORDS)) {
    if (text.includes(word)) return num
  }

  return undefined
}

// ── Extract dish name after keyword ────────────────────────────────────────

function extractAfter(text: string, keyword: string): string | undefined {
  const idx = text.indexOf(keyword)
  if (idx === -1) return undefined
  const rest = text.slice(idx + keyword.length).trim()
  return rest.length > 0 ? rest : undefined
}

// ── Command parser ─────────────────────────────────────────────────────────

/**
 * Parses a spoken transcript into a kitchen command.
 * Uses keyword matching with common variations.
 * No AI, just pattern matching.
 */
export function parseKitchenCommand(transcript: string): KitchenCommand {
  const t = transcript.toLowerCase().trim()

  // ── Fire commands ──
  if (t.startsWith('fire') || t.includes('fire course') || t.includes('firing')) {
    const courseNum = extractNumber(t)
    const dishName = extractAfter(t, 'fire') ?? extractAfter(t, 'firing')
    return { type: 'fire', courseNumber: courseNum, dishName }
  }

  // ── Plate commands ──
  if (t.startsWith('plate') || t.includes('plating') || t.includes('plate course')) {
    return { type: 'plate', courseNumber: extractNumber(t) }
  }

  // ── Serve commands ──
  if (t.startsWith('serve') || t.includes('service') || t.includes('serve course')) {
    return { type: 'serve', courseNumber: extractNumber(t) }
  }

  // ── 86 commands ──
  if (t.includes('86') || t.includes('eighty six') || t.includes('eighty-six')) {
    const dishName =
      extractAfter(t, '86') ?? extractAfter(t, 'eighty six') ?? extractAfter(t, 'eighty-six')
    return { type: 'eighty_six', dishName: dishName ?? 'unknown item' }
  }

  // ── Timer commands ──
  if (t.includes('timer') || t.includes('set timer') || t.startsWith('time')) {
    const minutes = extractNumber(t)
    if (minutes) {
      return { type: 'timer', minutes }
    }
  }

  // ── Next step ──
  if (t === 'next' || t === 'next step' || t.includes('next step') || t === 'go') {
    return { type: 'next_step' }
  }

  // ── What's next ──
  if (t.includes("what's next") || t.includes('whats next') || t.includes('what next')) {
    return { type: 'whats_next' }
  }

  // ── Mark complete ──
  if (
    t.includes('mark complete') ||
    t.includes('done') ||
    t.includes('complete') ||
    t.includes('finished')
  ) {
    const taskName = extractAfter(t, 'complete') ?? extractAfter(t, 'done')
    return { type: 'mark_complete', taskName }
  }

  // ── All day (KDS: how many of a dish are needed) ──
  if (t.includes('all day')) {
    const dishName = extractAfter(t, 'all day')
    return { type: 'all_day', dishName }
  }

  // ── Heard / acknowledgment ──
  if (t === 'heard' || t === 'yes chef' || t === 'yes' || t === 'copy' || t === 'got it') {
    return { type: 'heard' }
  }

  // ── Kitchen callouts (safety / movement) ──
  if (t === 'corner' || t === 'corner coming' || t.startsWith('corner')) {
    return { type: 'corner' }
  }

  if (t === 'behind' || t === 'behind you' || t === 'hot behind') {
    return { type: 'behind' }
  }

  if (t === 'hot' || t === 'hot pan' || t === 'hot coming' || t === 'hot coming through') {
    return { type: 'hot' }
  }

  // ── Picking up (taking food from pass) ──
  if (t.startsWith('picking up') || t.startsWith('pick up')) {
    const dishName = extractAfter(t, 'picking up') ?? extractAfter(t, 'pick up')
    return { type: 'picking_up', dishName }
  }

  return { type: 'unknown', raw: t }
}

// ── Command descriptions (for help overlay) ────────────────────────────────

export const COMMAND_HELP: Array<{ command: string; description: string; example: string }> = [
  {
    command: 'Fire',
    description: 'Start cooking a course or dish',
    example: '"Fire course 2" or "Fire salmon"',
  },
  { command: 'Plate', description: 'Mark a course as being plated', example: '"Plate course 1"' },
  { command: 'Serve', description: 'Mark a course as served', example: '"Serve course 3"' },
  {
    command: '86',
    description: 'Mark an item as unavailable',
    example: '"86 the salmon" or "Eighty six risotto"',
  },
  {
    command: 'Timer',
    description: 'Set a countdown timer',
    example: '"Timer 12 minutes" or "Set timer five"',
  },
  { command: 'Next', description: 'Move to the next step', example: '"Next step" or "Next"' },
  {
    command: "What's next",
    description: 'Hear the next upcoming task',
    example: '"What\'s next?"',
  },
  {
    command: 'Done',
    description: 'Mark current task as complete',
    example: '"Mark complete" or "Done"',
  },
  { command: 'All day', description: 'Check total count for a dish', example: '"All day salmon"' },
  { command: 'Heard', description: 'Acknowledge a command', example: '"Heard" or "Yes chef"' },
  { command: 'Corner', description: 'Alert others you are rounding a corner', example: '"Corner"' },
  {
    command: 'Behind',
    description: 'Alert others you are passing behind them',
    example: '"Behind" or "Hot behind"',
  },
  {
    command: 'Hot',
    description: 'Warn about a hot pan or dish',
    example: '"Hot" or "Hot coming through"',
  },
  {
    command: 'Picking up',
    description: 'Taking food from the pass',
    example: '"Picking up course 2"',
  },
]
