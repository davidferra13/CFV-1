import { z } from 'zod'

export const NoteComponentTypeSchema = z.enum([
  'recipe_concept',
  'technique_variation',
  'ingredient_discovery',
  'seasonal_sourcing_insight',
  'task',
  'event_idea',
  'inventory_thought',
  'constraint',
  'review_prompt',
  'other',
])

export const NoteActionTypeSchema = z.enum(['task', 'calendar_alert', 'review_prompt'])
export const NoteUrgencySchema = z.enum(['low', 'normal', 'high', 'urgent'])
export const ConfidenceBandSchema = z.enum(['high', 'medium', 'low'])

export const NoteTimeWindowSchema = z.object({
  label: z.string().nullable().default(null),
  startDate: z.string().nullable().default(null),
  endDate: z.string().nullable().default(null),
  seasonality: z.string().nullable().default(null),
  urgencyReason: z.string().nullable().default(null),
})

export const InterpretedNoteComponentSchema = z.object({
  componentType: NoteComponentTypeSchema,
  title: z.string().min(1).max(180),
  summary: z.string().min(1).max(1000),
  routeLayer: z.string().min(1).max(160),
  sourceExcerpt: z.string().max(500).nullable().default(null),
  confidenceScore: z.number().int().min(0).max(100),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const InterpretedNoteActionSchema = z.object({
  actionType: NoteActionTypeSchema,
  title: z.string().min(1).max(180),
  description: z.string().max(1000).nullable().default(null),
  dueDate: z.string().nullable().default(null),
  dueTime: z.string().nullable().default(null),
  urgency: NoteUrgencySchema.default('normal'),
  componentIndex: z.number().int().min(0).nullable().default(null),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const InterpretedNoteSchema = z.object({
  confidenceScore: z.number().int().min(0).max(100),
  confidenceBand: ConfidenceBandSchema,
  summary: z.string().max(1000),
  classifications: z.array(NoteComponentTypeSchema).default([]),
  components: z.array(InterpretedNoteComponentSchema).default([]),
  actions: z.array(InterpretedNoteActionSchema).default([]),
  timeIntelligence: z.object({
    isTimeSensitive: z.boolean().default(false),
    windows: z.array(NoteTimeWindowSchema).default([]),
    urgency: NoteUrgencySchema.default('normal'),
  }),
  ambiguityNotes: z.array(z.string()).default([]),
})

export type NoteComponentType = z.infer<typeof NoteComponentTypeSchema>
export type NoteActionType = z.infer<typeof NoteActionTypeSchema>
export type NoteUrgency = z.infer<typeof NoteUrgencySchema>
export type ConfidenceBand = z.infer<typeof ConfidenceBandSchema>
export type InterpretedNote = z.infer<typeof InterpretedNoteSchema>
export type InterpretedNoteComponent = z.infer<typeof InterpretedNoteComponentSchema>
export type InterpretedNoteAction = z.infer<typeof InterpretedNoteActionSchema>

export const NOTE_ROUTE_LABELS: Record<NoteComponentType, string> = {
  recipe_concept: 'R&D / Recipe Development',
  technique_variation: 'Technique Library / Experimentation',
  ingredient_discovery: 'Ingredient Database',
  seasonal_sourcing_insight: 'Sourcing Intelligence / Seasonality Engine',
  task: 'Task System',
  event_idea: 'Event Planning',
  inventory_thought: 'Inventory Intelligence',
  constraint: 'Operational Constraint Register',
  review_prompt: 'Review Queue',
  other: 'Review Queue',
}

export const NOTE_ROUTE_KEYS: Record<NoteComponentType, string> = {
  recipe_concept: 'recipe_development',
  technique_variation: 'technique_library',
  ingredient_discovery: 'ingredient_database',
  seasonal_sourcing_insight: 'sourcing_seasonality',
  task: 'tasks',
  event_idea: 'event_planning',
  inventory_thought: 'inventory_intelligence',
  constraint: 'constraint_register',
  review_prompt: 'review_queue',
  other: 'review_queue',
}

export function confidenceBand(score: number): ConfidenceBand {
  if (score >= 80) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

export function taskPriorityFromUrgency(
  urgency: NoteUrgency
): 'low' | 'medium' | 'high' | 'urgent' {
  if (urgency === 'urgent') return 'urgent'
  if (urgency === 'high') return 'high'
  if (urgency === 'low') return 'low'
  return 'medium'
}

export function todayIsoDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`
}

export function addDaysIsoDate(days: number, now = new Date()): string {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  return todayIsoDate(date)
}

export function normalizeDueDate(
  action: InterpretedNoteAction,
  fallbackUrgency: NoteUrgency
): string {
  if (action.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(action.dueDate)) {
    return action.dueDate
  }

  const urgency = action.urgency ?? fallbackUrgency
  if (urgency === 'urgent' || urgency === 'high') return todayIsoDate()
  if (urgency === 'low') return addDaysIsoDate(7)
  return addDaysIsoDate(2)
}

export function normalizeDueTime(value: string | null | undefined): string | null {
  if (!value) return null
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)/)
  return match ? `${match[1]}:${match[2]}` : null
}

export function normalizeIngredientCategory(value: unknown): string {
  const allowed = new Set([
    'protein',
    'produce',
    'dairy',
    'pantry',
    'spice',
    'oil',
    'alcohol',
    'baking',
    'frozen',
    'canned',
    'fresh_herb',
    'dry_herb',
    'condiment',
    'beverage',
    'specialty',
    'other',
  ])
  return typeof value === 'string' && allowed.has(value) ? value : 'other'
}

export function noteDedupeKey(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) =>
      (part ?? '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
    )
    .filter(Boolean)
    .join('|')
    .slice(0, 240)
}

export function classifyCaptureSource(text: string): 'typed' | 'pasted' {
  return text.length > 280 || text.includes('\n') ? 'pasted' : 'typed'
}

export function buildNoteThreadKey(text: string): string {
  const normalized = noteDedupeKey([text])
  const words = normalized.split(' ').filter((word) => word.length > 2)
  return words.slice(0, 8).join('-').slice(0, 96) || 'untitled-note'
}

export function buildNoteThreadTitle(text: string): string {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)

  if (!firstLine) return 'Captured note'
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine
}

export function buildNoteInterpretationPrompt(corrections: Array<Record<string, unknown>>): string {
  const correctionContext =
    corrections.length > 0
      ? JSON.stringify(corrections.slice(0, 20))
      : 'No prior corrections are available.'

  return `You interpret raw ChefFlow notes into structured system intelligence.

The chef may type while distracted. Preserve intent and extract only what is stated or strongly implied.

Critical boundaries:
- Do not generate recipes, ingredient amounts, methods, menus, or creative culinary content.
- A recipe concept can be recorded only as the chef stated it. Never complete it.
- Every component must have a routeLayer. Use the canonical ChefFlow layers when possible.
- Every note must produce at least one action. If uncertain, create a review_prompt action.
- A single note can produce multiple components and classifications.
- Use confidenceScore 0-100. High is 80+, medium is 50-79, low is below 50.
- If time sensitivity is implied, infer the smallest honest window and explain the urgency. If only seasonality is implied, use a seasonal label and null dates.
- Never invent facts. Put ambiguity in ambiguityNotes.

Canonical route layers:
- Recipe concepts: R&D / Recipe Development
- Technique variations: Technique Library / Experimentation
- Ingredient discoveries: Ingredient Database
- Seasonal sourcing insights: Sourcing Intelligence / Seasonality Engine
- Tasks: Task System
- Event ideas: Event Planning
- Inventory thoughts: Inventory Intelligence
- Constraints: Operational Constraint Register
- Unknown or uncertain material: Review Queue

Prior correction patterns to honor:
${correctionContext}

Return only valid JSON matching the schema.`
}
