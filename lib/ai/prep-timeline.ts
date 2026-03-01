'use server'

// Prep Timeline Generator
// AI creates a backward-scheduled prep plan from service time through all recipe prep needs.
// Routed to Gemini (creative scheduling, not PII).
// Output is DRAFT ONLY — chef approves/edits before using.

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

// ── Zod Schema ────────────────────────────────────────────────────────────

const PrepTaskSchema = z.object({
  time: z.string(),
  task: z.string(),
  duration: z.string(),
  recipe: z.string(),
  canParallelize: z.boolean(),
  notes: z.string().nullable(),
})

const PrepTimelineResponseSchema = z.object({
  tasks: z.array(PrepTaskSchema),
  totalPrepHours: z.number(),
  suggestedStartTime: z.string(),
  criticalPath: z.array(z.string()),
})

// ── Types ─────────────────────────────────────────────────────────────────

export interface PrepTask {
  time: string
  task: string
  duration: string
  recipe: string
  canParallelize: boolean
  notes: string | null
}

export interface PrepTimeline {
  eventDate: string
  serviceTime: string
  tasks: PrepTask[]
  totalPrepHours: number
  suggestedStartTime: string
  criticalPath: string[]
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

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

// ── Server Action ─────────────────────────────────────────────────────────

export async function generatePrepTimeline(eventId: string): Promise<PrepTimeline> {
  const user = await requireChef()
  const supabase = createServerClient()

  const [eventResult, menuResult] = await Promise.all([
    supabase
      .from('events')
      .select('occasion, guest_count, event_date, serve_time, arrival_time, service_style')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    supabase
      .from('menus')
      .select(
        `dishes(name, course_name, description,
          dish_components(recipe:recipes(name, prep_time_minutes, cook_time_minutes, method))
        )`
      )
      .eq('event_id', eventId)
      .limit(1)
      .single(),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  // Extract dishes from the menu join
  const rawDishes = (menuResult.data?.dishes ?? []) as unknown as Array<{
    name: string
    course_name: string | null
    description: string | null
    dish_components: Array<{
      recipe: {
        name: string
        prep_time_minutes: number | null
        cook_time_minutes: number | null
        method: string | null
      } | null
    }>
  }>
  const menuItems: MenuComponentRow[] = rawDishes.map((d) => ({
    name: d.name,
    course_type: d.course_name,
    description: d.description,
    recipes: d.dish_components?.[0]?.recipe ?? null,
  }))
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

  const prompt = `You are a culinary operations planner. Create a backward-scheduled prep timeline for a private chef event.

Event:
  Occasion: ${event.occasion ?? 'Private Dinner'}
  Date: ${event.event_date ?? 'TBD'}
  Guest count: ${guestCount}
  Service time (guests eat): ${serveTime}
  Chef arrival: ${event.arrival_time ?? 'TBD'}

Menu (${menuItems.length} dishes):
${recipeDetails.map((r) => `  - [${r.course}] ${r.dish}${r.prepMinutes ? ': prep ' + r.prepMinutes + 'min' : ''}${r.cookMinutes ? ', cook ' + r.cookMinutes + 'min' : ''}`).join('\n') || '  - No dishes assigned yet'}

Rules for backward scheduling:
1. Work backward from service time
2. Account for plating time (3–5 min per course at scale)
3. Note which tasks can run in parallel (e.g. roast in oven while making sauce)
4. Flag the critical path — tasks with zero slack
5. Account for ${guestCount} guests — scaling affects timing
6. Add 15–20% buffer to all estimates

Return JSON: {
  "tasks": [{ "time": "H:MM AM/PM", "task": "...", "duration": "X min", "recipe": "dish name", "canParallelize": bool, "notes": "...or null" }],
  "totalPrepHours": number,
  "suggestedStartTime": "H:MM AM/PM",
  "criticalPath": ["task description", ...]
}

Return ONLY valid JSON.`

  try {
    const ai = getClient()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { temperature: 0.3, responseMimeType: 'application/json' },
    })
    const text = (response.text || '').replace(/```json\n?|\n?```/g, '').trim()
    const raw = JSON.parse(text)
    const validated = PrepTimelineResponseSchema.safeParse(raw)
    if (!validated.success) {
      console.error('[prep-timeline] Zod validation failed:', validated.error.format())
      throw new Error('Prep timeline response did not match expected format. Please try again.')
    }
    return {
      eventDate: event.event_date ?? '',
      serviceTime: serveTime,
      ...validated.data,
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[prep-timeline] Failed:', err)
    throw new Error('Could not generate prep timeline. Please try again.')
  }
}
