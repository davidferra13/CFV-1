'use server'

// Prep Timeline Generator
// AI creates a backward-scheduled prep plan from service time through all recipe prep needs.
// Routed to local Ollama (Gemma 4). No cloud dependency.
// Output is DRAFT ONLY - chef approves/edits before using.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'

// -- Types --

export interface PrepTask {
  time: string // e.g. "9:00 AM"
  task: string // e.g. "Make stock base, reduce by half"
  duration: string // e.g. "45 min"
  recipe: string // which menu item this is for
  canParallelize: boolean // can another task run simultaneously
  notes: string | null
}

export interface PrepTimeline {
  eventDate: string
  serviceTime: string
  tasks: PrepTask[]
  totalPrepHours: number
  suggestedStartTime: string
  criticalPath: string[] // tasks that cannot be delayed
  generatedAt: string
}

interface MenuComponentRow {
  name: string
  course_type: string | null
  description: string | null
  recipes: {
    name: string
    prep_time_minutes: number | null
    cook_time_minutes: number | null
    method: string | null
  } | null
}

const PrepTimelineSchema = z.object({
  tasks: z.array(
    z.object({
      time: z.string(),
      task: z.string(),
      duration: z.string(),
      recipe: z.string(),
      canParallelize: z.boolean(),
      notes: z.string().nullable(),
    })
  ),
  totalPrepHours: z.number(),
  suggestedStartTime: z.string(),
  criticalPath: z.array(z.string()),
})

// -- Server Action --

export async function generatePrepTimeline(eventId: string): Promise<PrepTimeline> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [eventResult, menuResult] = await Promise.all([
    db
      .from('events')
      .select('occasion, guest_count, event_date, serve_time, arrival_time, service_style')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    (db as any)
      .from('event_menu_components')
      .select(
        `
        name, course_type, description,
        recipes(name, prep_time_minutes, cook_time_minutes, method)
      `
      )
      .eq('event_id', eventId),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const menuItems = (menuResult.data ?? []) as MenuComponentRow[]
  const serveTime = event.serve_time ?? '7:00 PM'
  const guestCount = event.guest_count ?? 10

  const recipeDetails = menuItems.map((item) => {
    const recipe = Array.isArray(item.recipes) ? item.recipes[0] : item.recipes
    return {
      dish: item.name,
      course: item.course_type ?? 'Main',
      prepMinutes: recipe?.prep_time_minutes ?? null,
      cookMinutes: recipe?.cook_time_minutes ?? null,
      method: recipe?.method ?? null,
    }
  })

  const systemPrompt = `You are a culinary operations planner. Create a backward-scheduled prep timeline for a private chef event.

Rules for backward scheduling:
1. Work backward from service time
2. Account for plating time (3-5 min per course at scale)
3. Note which tasks can run in parallel (e.g. roast in oven while making sauce)
4. Flag the critical path - tasks with zero slack
5. Account for guest count - scaling affects timing
6. Add 15-20% buffer to all estimates`

  const userContent = `Event:
  Occasion: ${event.occasion ?? 'Private Dinner'}
  Date: ${event.event_date ?? 'TBD'}
  Guest count: ${guestCount}
  Service time (guests eat): ${serveTime}
  Chef arrival: ${event.arrival_time ?? 'TBD'}

Menu (${menuItems.length} dishes):
${recipeDetails.map((r) => `  - [${r.course}] ${r.dish}${r.prepMinutes ? ': prep ' + r.prepMinutes + 'min' : ''}${r.cookMinutes ? ', cook ' + r.cookMinutes + 'min' : ''}`).join('\n') || '  - No dishes assigned yet'}

Return JSON: {
  "tasks": [{ "time": "H:MM AM/PM", "task": "...", "duration": "X min", "recipe": "dish name", "canParallelize": bool, "notes": "...or null" }],
  "totalPrepHours": number,
  "suggestedStartTime": "H:MM AM/PM",
  "criticalPath": ["task description", ...]
}`

  const parsed = await parseWithOllama(systemPrompt, userContent, PrepTimelineSchema, {
    temperature: 0.3,
    maxTokens: 2048,
  })
  return {
    eventDate: event.event_date ?? '',
    serviceTime: serveTime,
    tasks: parsed.tasks ?? [],
    totalPrepHours: parsed.totalPrepHours ?? 0,
    suggestedStartTime: parsed.suggestedStartTime ?? 'TBD',
    criticalPath: parsed.criticalPath ?? [],
    generatedAt: new Date().toISOString(),
  }
}
