export type SectionMode = 'expanded' | 'compact' | 'whisper'

export type AttentionChip = {
  id: string
  icon: string
  label: string
  age?: string
  urgencyScore: number
  action: { label: string; href?: string; actionId?: string }
  sectionId: string
  dismissable: boolean
}

export type SectionWeight = {
  sectionId: string
  mode: SectionMode
  chips: AttentionChip[]
  whisperText: string | null
  compactSummary: string | null
}

type SectionOrderEntry = {
  id: string
  position: number
  label: string
  layer: 'urgent' | 'tactical' | 'safety' | 'strategic' | 'intelligence' | 'activity' | 'utility'
}

export const SECTION_ORDER: SectionOrderEntry[] = [
  { id: 'command-center', position: 1, label: 'Command Center', layer: 'urgent' },
  { id: 'daily-plan', position: 2, label: 'Daily Plan', layer: 'tactical' },
  { id: 'this-week', position: 3, label: 'This Week', layer: 'tactical' },
  { id: 'schedule', position: 4, label: 'Schedule', layer: 'tactical' },
  { id: 'tiered-rail', position: 5, label: 'Tiered Rail', layer: 'safety' },
  { id: 'pricing-alerts', position: 6, label: 'Pricing Alerts', layer: 'safety' },
  { id: 'onboarding', position: 7, label: 'Onboarding', layer: 'safety' },
  { id: 'hero-zone', position: 8, label: 'Hero Zone', layer: 'strategic' },
  { id: 'profit-at-a-glance', position: 9, label: 'Profit at a Glance', layer: 'strategic' },
  { id: 'revenue-goal', position: 10, label: 'Revenue Goal', layer: 'strategic' },
  { id: 'business-health', position: 11, label: 'Business Health', layer: 'strategic' },
  { id: 'chef-life-synthesis', position: 12, label: 'Chef Life Synthesis', layer: 'strategic' },
  { id: 'intelligence-digest', position: 13, label: 'Intelligence Digest', layer: 'intelligence' },
  { id: 'cil-signal-summary', position: 14, label: 'CIL Signal Summary', layer: 'intelligence' },
  { id: 'ambient-layer', position: 15, label: 'Ambient Layer', layer: 'intelligence' },
  { id: 'activity-feed', position: 16, label: 'Activity Feed', layer: 'activity' },
  { id: 'weekly-reflection', position: 17, label: 'Weekly Reflection', layer: 'activity' },
  { id: 'quick-notes-tips', position: 18, label: 'Quick Notes & Tips', layer: 'utility' },
  { id: 'feature-suggestions', position: 19, label: 'Feature Suggestions', layer: 'utility' },
] as const

export const SECTION_IDS = SECTION_ORDER.map((s) => s.id)

/**
 * Layers that are open the first time a chef lands on Today.
 *
 * All 19 sections used to render expanded, because the collapsed set started
 * empty and nothing had been stored yet. Measured on a near-empty account that
 * was 11,761px, about 14.5 screens of scrolling at 375px, 58 buttons and 104
 * links before the chef had done anything.
 *
 * Urgent and tactical are what "today" means: what needs me now, what I am
 * doing today, what is coming this week. Everything else keeps its header and
 * its one-line summary on screen and opens with one tap. Nothing is removed,
 * and once the chef opens or closes anything their own choice is stored and
 * wins from then on.
 */
export const DEFAULT_OPEN_SECTION_LAYERS = new Set(['urgent', 'tactical'])

export const DEFAULT_COLLAPSED_SECTION_IDS = SECTION_ORDER.filter(
  (s) => !DEFAULT_OPEN_SECTION_LAYERS.has(s.layer)
).map((s) => s.id)

export function getSectionEntry(id: string): SectionOrderEntry | undefined {
  return SECTION_ORDER.find((s) => s.id === id)
}
