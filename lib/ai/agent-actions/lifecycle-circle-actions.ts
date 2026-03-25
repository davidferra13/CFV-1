// Remy Agent - Lifecycle Circle Actions
// Pre-event briefing and arrival notification via Dinner Circle.
// Formula > AI for briefing (deterministic template), simple action for arrival.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { createServerClient } from '@/lib/db/server'
import { generatePreEventBriefing } from '@/lib/templates/pre-event-briefing'

// ─── Pre-Event Briefing ─────────────────────────────────────────────────────

const sendPreEventBriefing: AgentActionDefinition = {
  taskType: 'send.pre_event_briefing',
  name: 'Send Pre-Event Briefing',
  tier: 2,
  safety: 'reversible',
  description:
    'Share the pre-event briefing with the client in the Dinner Circle. Includes timeline, menu highlights, dietary confirmation, and what to have ready. No LLM needed.',
  inputSchema: '{ eventId: string }',

  async executor(inputs, ctx) {
    const eventId = inputs.eventId as string
    if (!eventId) throw new Error('eventId is required')

    const db: any = createServerClient()

    // Load event
    const { data: event } = await db
      .from('events')
      .select(
        'event_date, serve_time, arrival_time, occasion, guest_count, location_name, client_id'
      )
      .eq('id', eventId)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!event) throw new Error(`Event ${eventId} not found`)

    // Load client + chef in parallel
    const [{ data: client }, { data: chef }] = await Promise.all([
      db.from('clients').select('full_name').eq('id', event.client_id).single(),
      db.from('chefs').select('display_name, business_name').eq('id', ctx.tenantId).single(),
    ])

    // Load menu highlights
    const { data: menu } = await db
      .from('menus')
      .select('id, name')
      .eq('event_id', eventId)
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    let courseHighlights: string[] = []
    if (menu) {
      const { data: courses } = await db
        .from('menu_courses')
        .select('id, name')
        .eq('menu_id', menu.id)
        .order('display_order', { ascending: true })

      for (const course of courses ?? []) {
        const { data: dishes } = await db
          .from('menu_dishes')
          .select('name')
          .eq('course_id', course.id)
          .order('display_order', { ascending: true })
          .limit(2)

        const dishNames = (dishes ?? []).map((d: { name: string }) => d.name).join(', ')
        if (dishNames) courseHighlights.push(`${course.name}: ${dishNames}`)
      }
    }

    // Load dietary
    const { data: inquiry } = await db
      .from('inquiries')
      .select('confirmed_dietary_restrictions')
      .eq('converted_to_event_id', eventId)
      .limit(1)
      .maybeSingle()

    const dietaryConfirmed: string[] = inquiry?.confirmed_dietary_restrictions || []

    const chefName = chef?.display_name || chef?.business_name || 'Chef'
    const chefFirstName = chefName.split(' ')[0]

    const { body } = generatePreEventBriefing({
      clientName: client?.full_name || 'there',
      chefFirstName,
      eventDate: event.event_date || 'your event',
      eventTime: event.serve_time ?? null,
      arrivalTime: event.arrival_time ?? null,
      location: event.location_name ?? null,
      guestCount: event.guest_count ?? null,
      menuName: menu?.name ?? null,
      courseHighlights,
      dietaryConfirmed,
      whatToHaveReady: [],
    })

    const preview: AgentActionPreview = {
      actionType: 'send.pre_event_briefing',
      summary: `Pre-event briefing for ${client?.full_name || 'client'} (${event.event_date})`,
      fields: [{ label: 'Briefing', value: body }],
      safety: 'reversible',
    }

    return {
      preview,
      commitPayload: { eventId, body },
    }
  },

  async commitAction(payload, ctx) {
    try {
      const { postPreEventBriefing } = await import('@/lib/hub/pre-event-briefing-actions')
      const result = await postPreEventBriefing({
        eventId: payload.eventId as string,
      })

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to post briefing.' }
      }

      return {
        success: true,
        message: 'Pre-event briefing shared in the Dinner Circle.',
      }
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to post briefing.',
      }
    }
  },
}

// ─── Arrival Notification ────────────────────────────────────────────────────

const sendArrivalNotification: AgentActionDefinition = {
  taskType: 'send.arrival_notification',
  name: 'Send Arrival Notification',
  tier: 2,
  safety: 'reversible',
  description:
    'Notify the client that the chef is on the way. Posts to the Dinner Circle. Chef can include a custom message or arrival time.',
  inputSchema: '{ eventId: string, arrivalTime?: string, message?: string }',

  async executor(inputs, ctx) {
    const eventId = inputs.eventId as string
    if (!eventId) throw new Error('eventId is required')

    const arrivalTime = (inputs.arrivalTime as string) || null
    const customMessage = (inputs.message as string) || null

    const db: any = createServerClient()
    const { data: event } = await db
      .from('events')
      .select('occasion, event_date, client_id')
      .eq('id', eventId)
      .eq('tenant_id', ctx.tenantId)
      .single()

    if (!event) throw new Error(`Event ${eventId} not found`)

    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', event.client_id)
      .single()

    let body = customMessage || "I'm on my way!"
    if (arrivalTime && !customMessage) {
      body = `I'm on my way! Arriving at ${arrivalTime}.`
    }

    const preview: AgentActionPreview = {
      actionType: 'send.arrival_notification',
      summary: `Arrival notification for ${client?.full_name || 'client'}`,
      fields: [{ label: 'Message', value: body }],
      safety: 'reversible',
    }

    return {
      preview,
      commitPayload: { eventId, arrivalTime, message: customMessage },
    }
  },

  async commitAction(payload, ctx) {
    try {
      const { postArrivalToCircle } = await import('@/lib/hub/circle-lifecycle-hooks')
      await postArrivalToCircle({
        eventId: payload.eventId as string,
        arrivalTime: payload.arrivalTime as string | null,
        message: payload.message as string | null,
      })

      return {
        success: true,
        message: 'Arrival notification posted to the Dinner Circle.',
      }
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to post arrival notification.',
      }
    }
  },
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const lifecycleCircleAgentActions: AgentActionDefinition[] = [
  sendPreEventBriefing,
  sendArrivalNotification,
]
