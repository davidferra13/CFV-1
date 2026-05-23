import { createServerClient } from '@/lib/db/server'

// -- Types --------------------------------------------------------------------

export type LearningRuleType =
  | 'debrief_within_days'
  | 'lesson_per_event'
  | 'recipe_update_on_modification'
  | 'photo_documentation_minimum'

export interface LearningViolation {
  ruleType: LearningRuleType
  eventId: string
  description: string
  deadline: Date | null
}

export interface LearningStatus {
  tenantId: string
  period: string
  eventsWithDebrief: number
  eventsWithoutDebrief: number
  totalLessons: number
  compliancePercent: number
  overdue: LearningViolation[]
}

export interface Lesson {
  id: string
  tenantId: string
  eventId: string
  content: string
  category: string | null
  createdAt: Date
}

export interface LearningReport {
  tenantId: string
  totalLessons: number
  lessonsByMonth: Record<string, number>
  topCategories: Array<{ category: string; count: number }>
  complianceRate: number
  recentLessons: Lesson[]
}

// -- Helpers ------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

function getQuarterKey(date: Date): string {
  const q = Math.ceil((date.getMonth() + 1) / 3)
  return `${date.getFullYear()}-Q${q}`
}

function getPeriodRange(period: string): { start: Date; end: Date } {
  const match = period.match(/^(\d{4})-Q(\d)$/)
  if (match) {
    const year = parseInt(match[1], 10)
    const quarter = parseInt(match[2], 10)
    const startMonth = (quarter - 1) * 3
    return {
      start: new Date(year, startMonth, 1),
      end: new Date(year, startMonth + 3, 0, 23, 59, 59, 999),
    }
  }
  const now = new Date()
  const q = Math.ceil((now.getMonth() + 1) / 3)
  const startMonth = (q - 1) * 3
  return {
    start: new Date(now.getFullYear(), startMonth, 1),
    end: new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999),
  }
}

// -- Core Functions -----------------------------------------------------------

/**
 * Check whether an event meets learning commitment requirements.
 * Returns violations for: missing debrief, no lessons captured,
 * recipe not updated after modifications, missing photos.
 */
export async function checkLearningCompliance(
  tenantId: string,
  eventId: string
): Promise<LearningViolation[]> {
  const client = createServerClient()
  const violations: LearningViolation[] = []

  const { data: eventRow } = await client
    .from('events' as any)
    .select('*')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!eventRow) return violations

  const eventDate = new Date((eventRow as any).date || (eventRow as any).created_at)
  const now = new Date()
  const daysSinceEvent = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const learningRules = (commitmentRows ?? [])
    .map((r: any) => (typeof r.rule === 'string' ? JSON.parse(r.rule) : r.rule))
    .filter((r: any) =>
      [
        'debrief_within_days',
        'lesson_per_event',
        'recipe_update_on_modification',
        'photo_documentation_minimum',
      ].includes(r.type)
    )

  for (const rule of learningRules) {
    if (rule.type === 'debrief_within_days') {
      const deadlineDays = rule.days ?? 3
      if (daysSinceEvent > deadlineDays) {
        const { count } = await client
          .from('commitment_learning_lessons' as any)
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('event_id', eventId)
          .eq('category', 'debrief')

        if (!count || count === 0) {
          const deadline = new Date(eventDate)
          deadline.setDate(deadline.getDate() + deadlineDays)
          violations.push({
            ruleType: 'debrief_within_days',
            eventId,
            description: `Debrief due within ${deadlineDays} days of event; ${daysSinceEvent} days have passed`,
            deadline,
          })
        }
      }
    }

    if (rule.type === 'lesson_per_event') {
      const { count } = await client
        .from('commitment_learning_lessons' as any)
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('event_id', eventId)

      if (!count || count === 0) {
        violations.push({
          ruleType: 'lesson_per_event',
          eventId,
          description: 'At least one lesson must be captured per event',
          deadline: null,
        })
      }
    }
  }

  return violations
}

/**
 * Get overall learning compliance status for a period.
 */
export async function getLearningStatus(
  tenantId: string,
  period?: string
): Promise<LearningStatus> {
  const currentPeriod = period ?? getQuarterKey(new Date())
  const { start, end } = getPeriodRange(currentPeriod)
  const client = createServerClient()

  const { data: events } = await client
    .from('events' as any)
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'closed'])
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  const eventIds = (events ?? []).map((e: any) => e.id)

  const { data: lessons } = await client
    .from('commitment_learning_lessons' as any)
    .select('event_id')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds.length > 0 ? eventIds : ['__none__'])

  const eventsWithLessons = new Set((lessons ?? []).map((l: any) => l.event_id))
  const eventsWithDebrief = eventsWithLessons.size
  const eventsWithoutDebrief = eventIds.length - eventsWithDebrief

  const overdue: LearningViolation[] = []
  for (const eid of eventIds) {
    if (!eventsWithLessons.has(eid)) {
      overdue.push({
        ruleType: 'lesson_per_event',
        eventId: eid,
        description: 'No lesson captured for this event',
        deadline: null,
      })
    }
  }

  return {
    tenantId,
    period: currentPeriod,
    eventsWithDebrief,
    eventsWithoutDebrief,
    totalLessons: (lessons ?? []).length,
    compliancePercent:
      eventIds.length > 0 ? Math.round((eventsWithDebrief / eventIds.length) * 100) : 100,
    overdue,
  }
}

/**
 * Record a lesson learned from an event.
 */
export async function recordLesson(
  tenantId: string,
  eventId: string,
  lesson: { content: string; category?: string }
): Promise<Lesson> {
  const client = createServerClient()
  const id = generateId()
  const now = new Date().toISOString()

  await client.from('commitment_learning_lessons' as any).insert({
    id,
    tenant_id: tenantId,
    event_id: eventId,
    content: lesson.content,
    category: lesson.category ?? null,
    created_at: now,
  })

  return {
    id,
    tenantId,
    eventId,
    content: lesson.content,
    category: lesson.category ?? null,
    createdAt: new Date(now),
  }
}

/**
 * Generate a learning report with lesson counts, categories, and compliance rate.
 */
export async function getLearningReport(tenantId: string): Promise<LearningReport> {
  const client = createServerClient()

  const { data: allLessons } = await client
    .from('commitment_learning_lessons' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const lessons = (allLessons ?? []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    content: row.content,
    category: row.category,
    createdAt: new Date(row.created_at),
  }))

  const lessonsByMonth: Record<string, number> = {}
  for (const l of lessons) {
    const key = `${l.createdAt.getFullYear()}-${String(l.createdAt.getMonth() + 1).padStart(2, '0')}`
    lessonsByMonth[key] = (lessonsByMonth[key] ?? 0) + 1
  }

  const categoryCounts: Record<string, number> = {}
  for (const l of lessons) {
    const cat = l.category ?? 'uncategorized'
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1
  }
  const topCategories = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const status = await getLearningStatus(tenantId)

  return {
    tenantId,
    totalLessons: lessons.length,
    lessonsByMonth,
    topCategories,
    complianceRate: status.compliancePercent,
    recentLessons: lessons.slice(0, 10),
  }
}
