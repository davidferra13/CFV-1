// Client Memory - structured recall of client preferences and patterns

export type MemorySource =
  | 'manual'
  | 'event_parse'
  | 'message_parse'
  | 'completion_extract'
  | 'menu_parse'

export type ClientMemoryRow = {
  id: string
  tenant_id: string
  client_id: string
  key: string
  value: unknown // JSONB
  confidence: number
  source: MemorySource
  pinned: boolean
  source_event_id: string | null
  last_seen_at: string
  created_at: string
  updated_at: string
}

// Grouped memory for display
export type ClientMemoryGroup = {
  critical: ClientMemoryRow[] // allergies, hard dislikes
  behavior: ClientMemoryRow[] // pacing, service style, guest patterns
  history: ClientMemoryRow[] // last menus, recurring dishes
  context: ClientMemoryRow[] // kids, birthdays, traditions, wine preferences
}

// Well-known memory keys
export const MEMORY_KEY_CATEGORIES: Record<string, keyof ClientMemoryGroup> = {
  allergy: 'critical',
  hard_dislike: 'critical',
  dietary_restriction: 'critical',

  pacing_preference: 'behavior',
  service_style: 'behavior',
  guest_pattern: 'behavior',
  communication_style: 'behavior',

  last_menu: 'history',
  recurring_dish: 'history',
  favorite_dish: 'history',
  wine_preference: 'history',

  kids_names: 'context',
  birthday: 'context',
  anniversary: 'context',
  tradition: 'context',
  notable_preference: 'context',
  household_size: 'context',
  pet_info: 'context',
}

export function groupClientMemory(memories: ClientMemoryRow[]): ClientMemoryGroup {
  const grouped: ClientMemoryGroup = {
    critical: [],
    behavior: [],
    history: [],
    context: [],
  }

  for (const mem of memories) {
    const category = MEMORY_KEY_CATEGORIES[mem.key] ?? 'context'
    grouped[category].push(mem)
  }

  // Sort each group: pinned first, then by confidence desc
  for (const key of Object.keys(grouped) as (keyof ClientMemoryGroup)[]) {
    grouped[key].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.confidence - a.confidence
    })
  }

  return grouped
}

// AI extraction schema keys (what parseWithOllama outputs)
export type ExtractedMemory = {
  key: string
  value: unknown
  confidence?: number
}
