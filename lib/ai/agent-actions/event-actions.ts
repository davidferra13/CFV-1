// Remy Agent — Event Actions
// Create, update, transition events on the chef's behalf.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { createEvent, updateEvent, getEventById } from '@/lib/events/actions'
import { transitionEvent } from '@/lib/events/transitions'
import { searchClientsByName } from '@/lib/clients/actions'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ─── NL → Structured Event Parser ─────────────────────────────────────────

const ParsedEventSchema = z.object({
  client_name: z.string().optional(),
  event_date: z.string().optional(),
  serve_time: z.string().optional(),
  guest_count: z.number().optional(),
  occasion: z.string().optional(),
  service_style: z
    .enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'])
    .optional(),
  location_address: z.string().optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
  location_zip: z.string().optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  special_requests: z.string().optional(),
  quoted_price_cents: z.number().optional(),
  notes: z.string().optional(),
})

async function parseEventFromNL(description: string) {
  const systemPrompt = `You extract structured event data from natural language descriptions.
Extract any of: client_name, event_date (YYYY-MM-DD), serve_time (HH:MM 24h), guest_count (number), occasion, service_style (plated/family_style/buffet/cocktail/tasting_menu/other), location_address, location_city, location_state, location_zip, dietary_restrictions (array), allergies (array), special_requests, quoted_price_cents (convert dollars to cents, e.g. $50 → 5000), notes.
Return ONLY valid JSON. Omit fields not mentioned.`

  return parseWithOllama(systemPrompt, description, ParsedEventSchema, { modelTier: 'standard' })
}

// ─── NL → Event Update Parser ──────────────────────────────────────────────

const ParsedEventUpdateSchema = z.object({
  eventIdentifier: z.string(),
  updates: z.object({
    event_date: z.string().optional(),
    serve_time: z.string().optional(),
    guest_count: z.number().optional(),
    occasion: z.string().optional(),
    service_style: z
      .enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'])
      .optional(),
    location_address: z.string().optional(),
    location_city: z.string().optional(),
    dietary_restrictions: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    special_requests: z.string().optional(),
    quoted_price_cents: z.number().optional(),
  }),
})

async function parseEventUpdateFromNL(description: string) {
  const systemPrompt = `You extract an event identifier and the fields to update.
Return JSON with "eventIdentifier" (the event occasion, client name, or description to find it) and "updates" (only the fields being changed).
Available fields: event_date (YYYY-MM-DD), serve_time (HH:MM), guest_count, occasion, service_style, location_address, location_city, dietary_restrictions (array), allergies (array), special_requests, quoted_price_cents (dollars→cents).
Return ONLY valid JSON.`

  return parseWithOllama(systemPrompt, description, ParsedEventUpdateSchema, {
    modelTier: 'standard',
  })
}

// ─── Action Definitions ────────────────────────────────────────────────────

export const eventAgentActions: AgentActionDefinition[] = [
  {
    taskType: 'agent.create_event',
    name: 'Create Event',
    tier: 2,
    safety: 'reversible',
    description:
      'Create a new event from a natural language description. Extracts date, guest count, location, client, and more.',
    inputSchema:
      '{ "description": "string — full event description, e.g. Dinner party for Sarah Johnson on March 20, 12 guests at 123 Main St Portland OR 97201, plated service, serve at 7pm" }',
    tierNote: 'ALWAYS tier 2 — chef must review all event details before saving.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseEventFromNL(description)

      // Resolve client
      let clientId: string | null = null
      let clientName = parsed.client_name ?? 'Unknown'
      if (parsed.client_name) {
        const clients = await searchClientsByName(parsed.client_name)
        if (clients.length > 0) {
          clientId = clients[0].id
          clientName = clients[0].full_name ?? parsed.client_name
        }
      }

      const fields: AgentActionPreview['fields'] = []
      fields.push({ label: 'Client', value: clientName, editable: false })
      if (parsed.occasion)
        fields.push({ label: 'Occasion', value: parsed.occasion, editable: true })
      if (parsed.event_date)
        fields.push({ label: 'Date', value: parsed.event_date, editable: true })
      if (parsed.serve_time)
        fields.push({ label: 'Serve Time', value: parsed.serve_time, editable: true })
      if (parsed.guest_count)
        fields.push({ label: 'Guests', value: String(parsed.guest_count), editable: true })
      if (parsed.service_style)
        fields.push({
          label: 'Service Style',
          value: parsed.service_style.replace(/_/g, ' '),
          editable: true,
        })
      if (parsed.location_address)
        fields.push({ label: 'Address', value: parsed.location_address, editable: true })
      if (parsed.location_city)
        fields.push({ label: 'City', value: parsed.location_city, editable: true })
      if (parsed.location_state)
        fields.push({ label: 'State', value: parsed.location_state, editable: true })
      if (parsed.location_zip)
        fields.push({ label: 'ZIP', value: parsed.location_zip, editable: true })
      if (parsed.dietary_restrictions?.length)
        fields.push({ label: 'Dietary', value: parsed.dietary_restrictions.join(', ') })
      if (parsed.allergies?.length)
        fields.push({ label: 'Allergies', value: parsed.allergies.join(', ') })
      if (parsed.special_requests)
        fields.push({ label: 'Special Requests', value: parsed.special_requests })
      if (parsed.quoted_price_cents)
        fields.push({
          label: 'Quoted Price',
          value: `$${(parsed.quoted_price_cents / 100).toFixed(2)}`,
        })

      const warnings: string[] = []
      if (!clientId && parsed.client_name) {
        warnings.push(
          `Client "${parsed.client_name}" not found — event will be created without a linked client.`
        )
      }
      if (!parsed.event_date) warnings.push('No date specified — you can add it later.')
      if (!parsed.location_address)
        warnings.push(
          'No address specified — required fields will need to be filled in on the event page.'
        )

      return {
        preview: {
          actionType: 'agent.create_event',
          summary: `Create event: ${parsed.occasion ?? 'New Event'}${clientName !== 'Unknown' ? ` for ${clientName}` : ''}`,
          fields,
          warnings: warnings.length > 0 ? warnings : undefined,
          safety: 'reversible',
        },
        commitPayload: {
          ...parsed,
          client_id: clientId,
          _clientName: clientName,
          _rawDescription: description,
        },
      }
    },

    async commitAction(payload) {
      // Build the event input — fill required fields with defaults if missing
      const eventInput = {
        client_id: payload.client_id as string | undefined,
        event_date: (payload.event_date as string) ?? new Date().toISOString().slice(0, 10),
        serve_time: (payload.serve_time as string) ?? '18:00',
        guest_count: (payload.guest_count as number) ?? 2,
        location_address: (payload.location_address as string) ?? 'TBD',
        location_city: (payload.location_city as string) ?? 'TBD',
        location_state: payload.location_state as string | undefined,
        location_zip: (payload.location_zip as string) ?? '00000',
        occasion: payload.occasion as string | undefined,
        service_style: payload.service_style as
          | 'plated'
          | 'family_style'
          | 'buffet'
          | 'cocktail'
          | 'tasting_menu'
          | 'other'
          | undefined,
        dietary_restrictions: payload.dietary_restrictions as string[] | undefined,
        allergies: payload.allergies as string[] | undefined,
        special_requests: payload.special_requests as string | undefined,
        quoted_price_cents: payload.quoted_price_cents as number | undefined,
      }

      const result = await createEvent(eventInput as any)
      if ('error' in result) {
        return { success: false, message: `Failed to create event: ${result.error}` }
      }
      const eventId = (result as { event: { id: string } }).event?.id
      return {
        success: true,
        message: `Event "${payload.occasion ?? 'New Event'}" created successfully!`,
        redirectUrl: eventId ? `/events/${eventId}` : '/events',
      }
    },
  },

  {
    taskType: 'agent.update_event',
    name: 'Update Event',
    tier: 2,
    safety: 'reversible',
    description:
      'Update an existing event. Finds the event by occasion or client name and applies changes.',
    inputSchema:
      '{ "description": "string — what to change, e.g. Change the Johnson dinner to 15 guests and move it to March 25" }',
    tierNote: 'ALWAYS tier 2 — chef must review changes before saving.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const parsed = await parseEventUpdateFromNL(description)

      // Find the event by searching events
      const supabase: any = createServerClient()
      const { data: events } = await supabase
        .from('events')
        .select('id, occasion, event_date, status, guest_count, client:clients(full_name)')
        .eq('tenant_id', ctx.tenantId)
        .not('status', 'in', '("cancelled","completed")')
        .order('event_date', { ascending: true })
        .limit(20)

      const identifier = parsed.eventIdentifier.toLowerCase()
      const match = (events ?? []).find((e: Record<string, unknown>) => {
        const occasion = String(e.occasion ?? '').toLowerCase()
        const clientName = String(
          (e.client as Record<string, unknown> | null)?.full_name ?? ''
        ).toLowerCase()
        return (
          occasion.includes(identifier) ||
          clientName.includes(identifier) ||
          identifier.includes(occasion) ||
          identifier.includes(clientName)
        )
      })

      if (!match) {
        return {
          preview: {
            actionType: 'agent.update_event',
            summary: `Could not find event matching "${parsed.eventIdentifier}"`,
            fields: [
              {
                label: 'Error',
                value: `No active event found matching "${parsed.eventIdentifier}".`,
              },
            ],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const fields: AgentActionPreview['fields'] = [
        {
          label: 'Event',
          value: `${match.occasion ?? 'Event'} (${match.event_date ?? 'no date'})`,
        },
      ]

      const updates = parsed.updates
      for (const [key, val] of Object.entries(updates)) {
        if (val !== undefined) {
          const displayVal = Array.isArray(val)
            ? val.join(', ')
            : key === 'quoted_price_cents'
              ? `$${(Number(val) / 100).toFixed(2)}`
              : String(val)
          fields.push({ label: formatFieldLabel(key), value: displayVal, editable: true })
        }
      }

      return {
        preview: {
          actionType: 'agent.update_event',
          summary: `Update event: ${match.occasion ?? 'Event'}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: { eventId: match.id, updates: parsed.updates },
      }
    },

    async commitAction(payload) {
      if (payload._error) {
        return { success: false, message: 'Cannot update — event not found.' }
      }
      const eventId = String(payload.eventId)
      const updates = payload.updates as Record<string, unknown>

      await updateEvent(eventId, updates)
      return {
        success: true,
        message: 'Event updated successfully!',
        redirectUrl: `/events/${eventId}`,
      }
    },
  },

  {
    taskType: 'agent.transition_event',
    name: 'Move Event Forward',
    tier: 2,
    safety: 'significant',
    description:
      'Transition an event to a new status (e.g., draft → proposed, proposed → accepted). Shows current and target state with warnings.',
    inputSchema:
      '{ "eventIdentifier": "string — event occasion or client name", "toStatus": "string — target status: proposed, accepted, paid, confirmed, in_progress, completed, cancelled" }',
    tierNote: 'ALWAYS tier 2 — state transitions are significant and require chef confirmation.',

    async executor(inputs, ctx) {
      const identifier = String(inputs.eventIdentifier ?? '').toLowerCase()
      const toStatus = String(inputs.toStatus ?? '')

      const supabase: any = createServerClient()
      const { data: events } = await supabase
        .from('events')
        .select('id, occasion, event_date, status, client:clients(full_name)')
        .eq('tenant_id', ctx.tenantId)
        .not('status', 'in', '("cancelled","completed")')
        .order('event_date', { ascending: true })
        .limit(20)

      const match = (events ?? []).find((e: Record<string, unknown>) => {
        const occasion = String(e.occasion ?? '').toLowerCase()
        const clientName = String(
          (e.client as Record<string, unknown> | null)?.full_name ?? ''
        ).toLowerCase()
        return occasion.includes(identifier) || clientName.includes(identifier)
      })

      if (!match) {
        return {
          preview: {
            actionType: 'agent.transition_event',
            summary: `Could not find event matching "${inputs.eventIdentifier}"`,
            fields: [{ label: 'Error', value: 'No active event found.' }],
            safety: 'significant' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const clientName = (match.client as Record<string, unknown> | null)?.full_name ?? 'Unknown'
      const fields: AgentActionPreview['fields'] = [
        { label: 'Event', value: `${match.occasion ?? 'Event'} for ${clientName}` },
        { label: 'Current Status', value: String(match.status) },
        { label: 'New Status', value: toStatus },
      ]

      return {
        preview: {
          actionType: 'agent.transition_event',
          summary: `Move "${match.occasion ?? 'Event'}": ${match.status} → ${toStatus}`,
          fields,
          warnings: [
            `This will change the event from "${match.status}" to "${toStatus}".`,
            'State transitions affect client visibility and billing readiness.',
          ],
          safety: 'significant',
        },
        commitPayload: { eventId: match.id, toStatus },
      }
    },

    async commitAction(payload) {
      if (payload._error) {
        return { success: false, message: 'Cannot transition — event not found.' }
      }

      const result = await transitionEvent({
        eventId: String(payload.eventId),
        toStatus: String(payload.toStatus) as
          | 'proposed'
          | 'accepted'
          | 'paid'
          | 'confirmed'
          | 'in_progress'
          | 'completed'
          | 'cancelled',
      })

      if ('error' in result) {
        return { success: false, message: `Transition failed: ${result.error}` }
      }
      return {
        success: true,
        message: `Event moved to "${payload.toStatus}" successfully!`,
        redirectUrl: `/events/${payload.eventId}`,
      }
    },
  },
]

function formatFieldLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
