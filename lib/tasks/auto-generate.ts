// Auto-generate tasks from events and recurring templates.
// Called by event lifecycle transitions and onboarding flows.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ============================================
// EVENT TASK TEMPLATES
// ============================================

type EventTaskTemplate = {
  daysBefore: number
  title: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  timeEstimate: number // minutes
}

const EVENT_TASK_TEMPLATES: EventTaskTemplate[] = [
  {
    daysBefore: 7,
    title: 'Review menu and finalize dishes',
    category: 'admin',
    priority: 'medium',
    timeEstimate: 30,
  },
  {
    daysBefore: 5,
    title: 'Place ingredient orders',
    category: 'shopping',
    priority: 'high',
    timeEstimate: 45,
  },
  {
    daysBefore: 3,
    title: 'Prep shopping list and check inventory',
    category: 'prep',
    priority: 'high',
    timeEstimate: 30,
  },
  {
    daysBefore: 2,
    title: 'Begin advance prep work',
    category: 'prep',
    priority: 'high',
    timeEstimate: 120,
  },
  {
    daysBefore: 1,
    title: 'Final prep and equipment check',
    category: 'prep',
    priority: 'urgent',
    timeEstimate: 90,
  },
  {
    daysBefore: 0,
    title: 'Pack and load equipment',
    category: 'setup',
    priority: 'urgent',
    timeEstimate: 60,
  },
  {
    daysBefore: 0,
    title: 'Execute service',
    category: 'service',
    priority: 'urgent',
    timeEstimate: 240,
  },
  {
    daysBefore: -1,
    title: 'Post-event cleanup and review',
    category: 'cleanup',
    priority: 'medium',
    timeEstimate: 45,
  },
]

// ============================================
// HELPERS
// ============================================

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function todayString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// ============================================
// GENERATE EVENT TASKS
// ============================================

export async function generateEventTasks(eventId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check idempotency: skip if tasks already generated for this event
  const { data: existing, error: checkError } = await db
    .from('tasks')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .eq('event_id', eventId)
    .eq('auto_source', 'event')
    .limit(1)

  if (checkError) {
    console.error('[generateEventTasks] Check error:', checkError)
    throw new Error('Failed to check existing event tasks')
  }

  if (existing && existing.length > 0) {
    // Tasks already generated for this event
    return
  }

  // Fetch the event
  const { data: event, error: eventError } = await db
    .from('events')
    .select('event_date, occasion, guest_count')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    console.error('[generateEventTasks] Event fetch error:', eventError)
    throw new Error('Failed to fetch event for task generation')
  }

  const eventDate = event.event_date
  if (!eventDate) {
    console.error('[generateEventTasks] Event has no date')
    return
  }

  const today = todayString()
  const eventLabel = event.occasion || 'Event'

  // Generate tasks, skipping those whose due date is already past
  const tasksToInsert = EVENT_TASK_TEMPLATES.map((template) => {
    const dueDate = addDays(eventDate, -template.daysBefore)
    return {
      chef_id: user.tenantId!,
      event_id: eventId,
      title: `${eventLabel}: ${template.title}`,
      description: null,
      assigned_to: null,
      station_id: null,
      due_date: dueDate,
      due_time: null,
      priority: template.priority,
      status: 'pending',
      notes: null,
      recurring_rule: null,
      auto_source: 'event',
      time_estimate_minutes: template.timeEstimate,
    }
  }).filter((task) => task.due_date >= today)

  if (tasksToInsert.length === 0) {
    return
  }

  const { error: insertError } = await db.from('tasks').insert(tasksToInsert)

  if (insertError) {
    console.error('[generateEventTasks] Insert error:', insertError)
    throw new Error('Failed to generate event tasks')
  }

  revalidatePath('/tasks')
}

// ============================================
// GENERATE RECURRING TASK TEMPLATES
// ============================================

type WeeklyTemplate = {
  title: string
  category: string
  dayOfWeek: number // 0=Sun, 1=Mon, ..., 6=Sat
  timeEstimate: number
}

const WEEKLY_TEMPLATES: WeeklyTemplate[] = [
  { title: 'Weekly: Inventory check', category: 'inventory', dayOfWeek: 1, timeEstimate: 30 },
  { title: 'Weekly: Menu planning', category: 'admin', dayOfWeek: 2, timeEstimate: 45 },
  { title: 'Weekly: Client follow-ups', category: 'admin', dayOfWeek: 5, timeEstimate: 30 },
]

export async function generateRecurringTaskTemplates(chefId: string): Promise<void> {
  const db: any = createServerClient()

  for (const template of WEEKLY_TEMPLATES) {
    // Check if this recurring template already exists
    const { data: existing } = await db
      .from('tasks')
      .select('id')
      .eq('chef_id', chefId)
      .eq('title', template.title)
      .eq('auto_source', 'template')
      .limit(1)

    if (existing && existing.length > 0) {
      continue
    }

    // Calculate next occurrence of the target day of week
    const now = new Date()
    const currentDay = now.getDay()
    let daysUntil = template.dayOfWeek - currentDay
    if (daysUntil <= 0) daysUntil += 7

    const nextDate = new Date(now)
    nextDate.setDate(nextDate.getDate() + daysUntil)
    const dueDate = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`

    const { error } = await db.from('tasks').insert({
      chef_id: chefId,
      title: template.title,
      description: null,
      assigned_to: null,
      station_id: null,
      due_date: dueDate,
      due_time: null,
      priority: 'medium',
      status: 'pending',
      notes: null,
      auto_source: 'template',
      time_estimate_minutes: template.timeEstimate,
      recurring_rule: {
        frequency: 'weekly',
        days_of_week: [template.dayOfWeek],
      },
    })

    if (error) {
      console.error(`[generateRecurringTaskTemplates] Failed to create "${template.title}":`, error)
    }
  }

  revalidatePath('/tasks')
}
