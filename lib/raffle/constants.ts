// Raffle system constants — shared between server actions and client components.
// NOT a 'use server' file — safe to export constants.

/** Food emoji pool for anonymous aliases. ~30 options ensures uniqueness within typical client lists. */
export const ALIAS_EMOJIS = [
  '🍕',
  '🌮',
  '🍣',
  '🧁',
  '🍩',
  '🥐',
  '🍔',
  '🌯',
  '🥗',
  '🍜',
  '🍝',
  '🥘',
  '🍱',
  '🥞',
  '🧇',
  '🍰',
  '🎂',
  '🍪',
  '🥧',
  '🍫',
  '🍿',
  '🥨',
  '🥯',
  '🫕',
  '🍲',
  '🥟',
  '🍤',
  '🍦',
  '🧆',
  '🥙',
] as const

/** Game config for Pan Catch */
export const PAN_CATCH = {
  /** Canvas dimensions */
  WIDTH: 400,
  HEIGHT: 600,
  /** Pan */
  PAN_WIDTH: 60,
  PAN_HEIGHT: 20,
  PAN_Y_OFFSET: 40,
  /** Items */
  ITEM_SIZE: 28,
  INITIAL_FALL_SPEED: 2,
  SPEED_INCREMENT: 0.3,
  SPEED_UP_EVERY: 10,
  /** Gameplay */
  STARTING_LIVES: 3,
  SPAWN_INTERVAL_MS: 900,
  MIN_SPAWN_INTERVAL_MS: 400,
  /** Bad item chance (0-1) */
  BAD_ITEM_CHANCE: 0.15,
} as const

/** Food items that fall in Pan Catch */
export const GOOD_ITEMS = [
  '🍎',
  '🍊',
  '🍋',
  '🍇',
  '🥕',
  '🌽',
  '🍅',
  '🥑',
  '🧅',
  '🫑',
  '🥚',
  '🧀',
  '🍗',
  '🥩',
  '🐟',
]
export const BAD_ITEMS = ['🦴', '🧊', '🪨', '💀']

/** Raffle entry limits */
export const ENTRIES_PER_DAY = 1
export const MIN_SCORE_FOR_ENTRY = 1

/** Winner categories — 3 ways to win each month */
export const WINNER_CATEGORIES = {
  random_draw: { label: 'Random Draw', emoji: '🎲', description: 'Every entry has equal odds' },
  top_scorer: {
    label: 'Top Scorer',
    emoji: '🏆',
    description: 'Highest single game score this month',
  },
  most_dedicated: {
    label: 'Most Dedicated',
    emoji: '🔥',
    description: 'Most days played this month',
  },
} as const

export type WinnerCategory = keyof typeof WINNER_CATEGORIES
