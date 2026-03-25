'use server'

// Service Timeline / Run-of-Show Generator
// AI creates a minute-by-minute execution plan for the full service.
// Routed to OLLAMA (contains dietary restrictions, allergies, special requests,
// staff names, location address — all PII that must stay local).
// Output is DRAFT ONLY — chef approves before printing or sharing with staff.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import { parseWithOllama } from './parse-ollama'

// ── Types ─────────────────────────────────────────────────────────────────

export interface TimelineEntry {
  time: string // e.g. "5:30 PM"
  duration: string // e.g. "30 min"
  task: string // e.g. "Final mise en place, plate garnishes"
  who: string // e.g. "Chef", "Staff", "Both"
  notes: string | null
}

export interface ServiceTimeline {
  eventOccasion: string
  serviceDate: string
  entries: TimelineEntry[]
  printReady: string // plain text version for single-page print
  generatedAt: string
}

interface MenuComponentRow {
  name: string
  course_type: string | null
  description: string | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
}

interface EventStaffRow {
  role_override: string | null
  staff_members: { name: string; role: string } | null
}

const TimelineEntrySchema = z.object({
  time: z.string(),
  duration: z.string(),
  task: z.string(),
  who: z.string(),
  notes: z.string().nullable(),
})

const ServiceTimelineResponseSchema = z.object({
  entries: z.array(TimelineEntrySchema),
  printReady: z.string(),
})

const SYSTEM_PROMPT = `You are a professional event planner creating a minute-by-minute service run-of-show for a private chef event.

RULES:
- Create a complete timeline from chef arrival through post-service cleanup.
- Include: setup, prep, cooking windows, service timing for each course, cleanup.
- Be realistic; build in buffer time between courses.
- Assign each task to "Chef", "Staff", or "Both".
- The printReady field should be a clean plain-text version suitable for printing on one page.
- NO em dashes. Use commas, periods, semicolons, or colons instead.

Return ONLY valid JSON:
{
  "entries": [{ "time": "H:MM AM/PM", "duration": "X min", "task": "description", "who": "Chef|Staff|Both", "notes": "additional context or null" }],
  "printReady": "full plain text run-of-show for single-page print"
}`

// ── Server Action ─────────────────────────────────────────────────────────

export async function generateServiceTimeline(eventId: string): Promise<ServiceTimeline> {
  const user = await requireChef()
  const db = createServerClient()

  const [eventResult, menuResult, staffResult] = await Promise.all([
    db
      .from('events')
      .select(
        'occasion, guest_count, event_date, serve_time, arrival_time, location_address, service_style, dietary_restrictions, allergies, special_requests'
      )
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    (db as any)
      .from('event_menu_components')
      .select('name, course_type, description, prep_time_minutes, cook_time_minutes')
      .eq('event_id', eventId),
    db
      .from('event_staff_assignments')
      .select('role_override, staff_members(name, role)')
      .eq('event_id', eventId),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const menuItems = (menuResult.data ?? []) as MenuComponentRow[]
  const staffRoster = staffResult.data ?? []

  const serveTime = event.serve_time ?? '7:00 PM'
  const arrivalTime = event.arrival_time ?? '4:00 PM'
  const staffNames = staffRoster
    .map((s) => s.staff_members?.name ?? 'Staff')
    .filter(Boolean)
    .join(', ')

  const userPrompt = `Create a run-of-show for this event:

Event Details:
  Occasion: ${event.occasion ?? 'Private Dinner'}
  Date: ${event.event_date ?? 'TBD'}
  Guest count: ${event.guest_count ?? 'TBD'}
  Chef arrival: ${arrivalTime}
  Service start: ${serveTime}
  Location: ${event.location_address ?? 'TBD'}
  Service style: ${event.service_style ?? 'plated'}
  Dietary restrictions: ${event.dietary_restrictions?.join(', ') || 'None'}
  Special requests: ${event.special_requests ?? 'None'}

Menu Courses:
${menuItems.map((m) => `  - ${m.course_type ?? 'Course'}: ${m.name}${m.prep_time_minutes ? ' (prep: ' + m.prep_time_minutes + 'min)' : ''}${m.cook_time_minutes ? ', cook: ' + m.cook_time_minutes + 'min' : ''}`).join('\n') || '  - Menu not yet assigned'}

Staff: ${staffNames || 'Chef only'}

Create a complete timeline from arrival through cleanup.`

  const parsed = await parseWithOllama(SYSTEM_PROMPT, userPrompt, ServiceTimelineResponseSchema, {
    modelTier: 'standard',
    timeoutMs: 90_000,
    maxTokens: 2048,
  })

  return {
    eventOccasion: event.occasion ?? 'Private Event',
    serviceDate: event.event_date ?? '',
    entries: parsed.entries ?? [],
    printReady: parsed.printReady ?? '',
    generatedAt: new Date().toISOString(),
  }
}
