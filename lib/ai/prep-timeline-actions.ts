'use server'

// Prep Timeline Generator
// PRIVACY: Uses event details + menu items + guest count = PII → Ollama only.
// Generates a day-of prep timeline with estimated times for each step.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { withAiFallback } from '@/lib/ai/with-ai-fallback'
import { buildPrepTimelineFormula } from '@/lib/templates/prep-timeline'
import { z } from 'zod'
import type { PrepTimeline } from './prep-timeline-types'

const PrepTimelineSchema = z.object({
  steps: z.array(
    z.object({
      time: z.string(),
      task: z.string(),
      duration: z.string(),
      category: z.enum([
        'shopping',
        'prep',
        'cooking',
        'plating',
        'service',
        'cleanup',
        'transport',
      ]),
      notes: z.string().optional(),
    })
  ),
  totalPrepHours: z.number(),
  summary: z.string(),
})

/**
 * Generate a prep timeline for an event using Ollama.
 */
export async function generatePrepTimeline(eventId: string): Promise<PrepTimeline> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Load event details
  const { data: event } = await supabase
    .from('events')
    .select('id, occasion, event_date, guest_count, start_time, notes, client:clients(full_name)')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    return {
      eventName: 'Unknown',
      eventDate: null,
      guestCount: null,
      serviceTime: null,
      steps: [],
      totalPrepHours: 0,
      summary: 'Event not found.',
    }
  }

  // Load menu items if any menus are linked
  const { data: eventMenus } = await (supabase
    .from('event_menus' as any)
    .select('menu_id')
    .eq('event_id', eventId) as any)

  const menuIds = ((eventMenus ?? []) as Array<{ menu_id: string }>).map((em) => em.menu_id)
  let menuItemNames: string[] = []

  if (menuIds.length > 0) {
    const { data: items } = await (supabase
      .from('menu_items' as any)
      .select('name')
      .in('menu_id', menuIds) as any)
    menuItemNames = ((items ?? []) as Array<{ name: string }>).map((i) => i.name)
  }

  const eventName = (event as any).occasion ?? 'Event'
  const clientName = ((event as any).client as any)?.full_name ?? 'Client'
  const guestCount = (event as any).guest_count
  const eventDate = (event as any).event_date
  const serviceTime = (event as any).start_time

  // Build Ollama prompt
  const systemPrompt = `You are a professional private chef's prep timeline assistant.
Generate a detailed, realistic prep timeline for an event.
Account for shopping, prep, cooking, transport (if applicable), plating, and service.
Work backward from the service time to determine when each step needs to start.
Be specific about timing. Include buffer time.

Return JSON matching this schema:
{
  "steps": [{ "time": "2:00 PM", "task": "Begin sauce reduction", "duration": "45 min", "category": "cooking", "notes": "Optional tips" }],
  "totalPrepHours": 8.5,
  "summary": "Brief overview of the timeline"
}

Categories: shopping, prep, cooking, plating, service, cleanup, transport`

  const userPrompt = `Generate a prep timeline for this event:
- Event: ${eventName} for ${clientName}
- Guests: ${guestCount ?? 'Unknown'}
- Date: ${eventDate ?? 'TBD'}
- Service time: ${serviceTime ?? 'Evening (assume 7:00 PM)'}
- Menu items: ${menuItemNames.length > 0 ? menuItemNames.join(', ') : 'No menu specified - generate a general timeline'}
- Notes: ${(event as any).notes ?? 'None'}`

  const { result, source } = await withAiFallback(
    // Formula: backward-from-service-time scheduling with guest scaling - deterministic
    () =>
      buildPrepTimelineFormula({
        eventName,
        eventDate,
        guestCount,
        serviceTime,
        menuItems: menuItemNames,
        isOffsite: true, // default conservative - offsite adds transport buffer
        notes: (event as any).notes ?? undefined,
      }),
    // AI: enhanced timeline with contextual tips (when Ollama is online)
    async () => {
      const aiResult = await parseWithOllama(systemPrompt, userPrompt, PrepTimelineSchema, {
        modelTier: 'standard',
      })
      return {
        eventName,
        eventDate,
        guestCount,
        serviceTime,
        steps: aiResult.steps,
        totalPrepHours: aiResult.totalPrepHours,
        summary: aiResult.summary,
      }
    }
  )

  return { ...result, _aiSource: source }
}

/**
 * Generate a prep timeline by event name search (for Remy command).
 */
export async function generatePrepTimelineByName(eventName: string): Promise<PrepTimeline> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, occasion')
    .eq('tenant_id', user.tenantId!)
    .ilike('occasion', `%${eventName}%`)
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: false })
    .limit(1)

  if (!events || events.length === 0) {
    return {
      eventName,
      eventDate: null,
      guestCount: null,
      serviceTime: null,
      steps: [],
      totalPrepHours: 0,
      summary: `No event found matching "${eventName}". Check the name and try again.`,
    }
  }

  return generatePrepTimeline(events[0].id)
}
