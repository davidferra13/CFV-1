// Remy Agent - Event Operations Actions
// Clone events, debrief, safety/equipment checklists, alcohol logging,
// prep timelines, photo tagging, tips, mileage, scope drift.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { cloneEvent } from '@/lib/events/clone-actions'
import { saveDebriefReflection, completeDebrief } from '@/lib/events/debrief-actions'
import {
  getOrCreateSafetyChecklist,
  completeSafetyChecklist,
} from '@/lib/events/safety-checklist-actions'
import { saveEquipmentChecklist } from '@/lib/events/equipment-checklist-actions'
import {
  getOrCreateAlcoholLog,
  addAlcoholLogEntry,
  setLastCall,
} from '@/lib/events/alcohol-log-actions'
import { recordTip, updateMileage } from '@/lib/events/financial-summary-actions'
import { acknowledgeScopeDrift } from '@/lib/events/scope-drift-actions'
import { generatePrepTimeline } from '@/lib/ai/prep-timeline-actions'
import { suggestPhotoTags, confirmPhotoTag } from '@/lib/events/photo-tagging-actions'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { z } from 'zod'

// ─── Event Finder Helper ─────────────────────────────────────────────────────

async function findEvent(identifier: string, tenantId: string) {
  const supabase: any = createServerClient()
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date, status, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .order('event_date', { ascending: false })
    .limit(30)

  const lower = identifier.toLowerCase()
  return (events ?? []).find((e: Record<string, unknown>) => {
    const occ = String(e.occasion ?? '').toLowerCase()
    const cn = String((e.client as Record<string, unknown> | null)?.full_name ?? '').toLowerCase()
    return occ.includes(lower) || cn.includes(lower) || lower.includes(occ) || lower.includes(cn)
  })
}

// ─── Action Definitions ──────────────────────────────────────────────────────

export const eventOpsAgentActions: AgentActionDefinition[] = [
  // ─── Clone Event ─────────────────────────────────────────────────────────
  {
    taskType: 'agent.clone_event',
    name: 'Clone Event',
    tier: 2,
    safety: 'reversible',
    description:
      'Make a copy of an existing event for a new date. Copies menu, guest count, service style, etc.',
    inputSchema: '{ "description": "string - e.g. Clone the Johnson dinner to April 15" }',
    tierNote: 'ALWAYS tier 2 - chef reviews cloned event details.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: eventIdentifier (event to clone), newDate (YYYY-MM-DD). Return ONLY JSON.',
        description,
        z.object({ eventIdentifier: z.string(), newDate: z.string() }),
        { modelTier: 'standard' }
      )

      const event = await findEvent(parsed.eventIdentifier, ctx.tenantId)
      if (!event) {
        return {
          preview: {
            actionType: 'agent.clone_event',
            summary: `Event "${parsed.eventIdentifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching event found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const clientName = (event.client as Record<string, unknown> | null)?.full_name ?? 'Client'

      return {
        preview: {
          actionType: 'agent.clone_event',
          summary: `Clone "${event.occasion}" to ${parsed.newDate}`,
          fields: [
            { label: 'Original Event', value: `${event.occasion} (${event.event_date})` },
            { label: 'Client', value: String(clientName) },
            { label: 'New Date', value: parsed.newDate, editable: true },
          ],
          safety: 'reversible',
        },
        commitPayload: { eventId: event.id, newDate: parsed.newDate },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Event not found.' }
      const result = await cloneEvent(String(payload.eventId), String(payload.newDate))
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      const newId = (result as { event?: { id: string } }).event?.id
      return {
        success: true,
        message: 'Event cloned!',
        redirectUrl: newId ? `/events/${newId}` : '/events',
      }
    },
  },

  // ─── Save Debrief Reflection ─────────────────────────────────────────────
  {
    taskType: 'agent.save_debrief',
    name: 'Save Event Debrief',
    tier: 2,
    safety: 'reversible',
    description:
      'Save chef reflections and outcome notes for a completed event. Rate the event and add notes about what went well or what to improve.',
    inputSchema:
      '{ "description": "string - e.g. The Johnson dinner went great, 5 out of 5. The scallops were a hit, would skip the soup course next time." }',
    tierNote: 'ALWAYS tier 2 - chef reviews debrief before saving.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: eventIdentifier (event name or client), chef_outcome_notes (reflections), chef_outcome_rating (1-5 number). Return ONLY JSON.',
        description,
        z.object({
          eventIdentifier: z.string(),
          chef_outcome_notes: z.string().optional(),
          chef_outcome_rating: z.number().optional(),
        }),
        { modelTier: 'standard' }
      )

      const event = await findEvent(parsed.eventIdentifier, ctx.tenantId)
      if (!event) {
        return {
          preview: {
            actionType: 'agent.save_debrief',
            summary: `Event "${parsed.eventIdentifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching event found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const fields: AgentActionPreview['fields'] = [
        { label: 'Event', value: String(event.occasion) },
      ]
      if (parsed.chef_outcome_rating)
        fields.push({ label: 'Rating', value: `${parsed.chef_outcome_rating}/5` })
      if (parsed.chef_outcome_notes)
        fields.push({ label: 'Notes', value: parsed.chef_outcome_notes, editable: true })

      return {
        preview: {
          actionType: 'agent.save_debrief',
          summary: `Save debrief: ${event.occasion}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: {
          eventId: event.id,
          chef_outcome_notes: parsed.chef_outcome_notes,
          chef_outcome_rating: parsed.chef_outcome_rating,
        },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Event not found.' }
      const result = await saveDebriefReflection(String(payload.eventId), {
        chef_outcome_notes: payload.chef_outcome_notes as string | undefined,
        chef_outcome_rating: payload.chef_outcome_rating as number | undefined,
      })
      if (result.error) return { success: false, message: `Failed: ${result.error}` }
      return {
        success: true,
        message: 'Debrief saved!',
        redirectUrl: `/events/${payload.eventId}`,
      }
    },
  },

  // ─── Complete Safety Checklist ───────────────────────────────────────────
  {
    taskType: 'agent.complete_safety_checklist',
    name: 'Complete Safety Checklist',
    tier: 2,
    safety: 'significant',
    description:
      'Initialize or complete the safety checklist for an event. Confirms all safety items are addressed.',
    inputSchema: '{ "eventIdentifier": "string - event to complete safety checklist for" }',
    tierNote: 'ALWAYS tier 2 - chef confirms safety compliance.',

    async executor(inputs, ctx) {
      const identifier = String(inputs.eventIdentifier ?? inputs.description ?? '')
      const event = await findEvent(identifier, ctx.tenantId)

      if (!event) {
        return {
          preview: {
            actionType: 'agent.complete_safety_checklist',
            summary: `Event "${identifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching event found.' }],
            safety: 'significant' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.complete_safety_checklist',
          summary: `Complete safety checklist: ${event.occasion}`,
          fields: [{ label: 'Event', value: String(event.occasion) }],
          warnings: ['This marks the safety checklist as complete for this event.'],
          safety: 'significant',
        },
        commitPayload: { eventId: event.id },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Event not found.' }
      const checklist = await getOrCreateSafetyChecklist(String(payload.eventId))
      const checklistId = (checklist as Record<string, unknown>).id as string
      await completeSafetyChecklist(checklistId)
      return {
        success: true,
        message: 'Safety checklist completed!',
        redirectUrl: `/events/${payload.eventId}`,
      }
    },
  },

  // ─── Record Tip ──────────────────────────────────────────────────────────
  {
    taskType: 'agent.record_tip',
    name: 'Record Tip',
    tier: 2,
    safety: 'significant',
    description: 'Record a tip/gratuity received for an event.',
    inputSchema: '{ "description": "string - e.g. Got a $150 cash tip at the Johnson dinner" }',
    tierNote: 'ALWAYS tier 2 - financial data requires chef confirmation.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: eventIdentifier, amountCents (dollars→cents), paymentMethod (cash/check/card/venmo/other). Return ONLY JSON.',
        description,
        z.object({
          eventIdentifier: z.string(),
          amountCents: z.number(),
          paymentMethod: z.string().optional(),
        }),
        { modelTier: 'standard' }
      )

      const event = await findEvent(parsed.eventIdentifier, ctx.tenantId)
      if (!event) {
        return {
          preview: {
            actionType: 'agent.record_tip',
            summary: `Event "${parsed.eventIdentifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching event found.' }],
            safety: 'significant' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.record_tip',
          summary: `Record $${(parsed.amountCents / 100).toFixed(2)} tip for ${event.occasion}`,
          fields: [
            { label: 'Event', value: String(event.occasion) },
            {
              label: 'Amount',
              value: `$${(parsed.amountCents / 100).toFixed(2)}`,
              editable: true,
            },
            {
              label: 'Payment Method',
              value: parsed.paymentMethod ?? 'cash',
            },
          ],
          safety: 'significant',
        },
        commitPayload: {
          eventId: event.id,
          amountCents: parsed.amountCents,
          paymentMethod: parsed.paymentMethod ?? 'cash',
        },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Event not found.' }
      const result = await recordTip({
        eventId: String(payload.eventId),
        amountCents: Number(payload.amountCents),
        paymentMethod: ((payload.paymentMethod as string) ?? 'cash') as any,
      })
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return {
        success: true,
        message: `Tip of $${(Number(payload.amountCents) / 100).toFixed(2)} recorded!`,
        redirectUrl: `/events/${payload.eventId}`,
      }
    },
  },

  // ─── Log Mileage ─────────────────────────────────────────────────────────
  {
    taskType: 'agent.log_mileage',
    name: 'Log Mileage',
    tier: 2,
    safety: 'reversible',
    description: 'Record mileage driven for an event (for tax deduction tracking).',
    inputSchema: '{ "description": "string - e.g. 45 miles round trip for the Johnson dinner" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: eventIdentifier, miles (number). Return ONLY JSON.',
        description,
        z.object({ eventIdentifier: z.string(), miles: z.number() }),
        { modelTier: 'standard' }
      )

      const event = await findEvent(parsed.eventIdentifier, ctx.tenantId)
      if (!event) {
        return {
          preview: {
            actionType: 'agent.log_mileage',
            summary: `Event "${parsed.eventIdentifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching event found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.log_mileage',
          summary: `Log ${parsed.miles} miles for ${event.occasion}`,
          fields: [
            { label: 'Event', value: String(event.occasion) },
            { label: 'Miles', value: String(parsed.miles), editable: true },
          ],
          safety: 'reversible',
        },
        commitPayload: { eventId: event.id, miles: parsed.miles },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Event not found.' }
      const result = await updateMileage(String(payload.eventId), Number(payload.miles))
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return {
        success: true,
        message: `${payload.miles} miles logged!`,
        redirectUrl: `/events/${payload.eventId}`,
      }
    },
  },

  // ─── Log Alcohol Served ──────────────────────────────────────────────────
  {
    taskType: 'agent.log_alcohol',
    name: 'Log Alcohol Served',
    tier: 2,
    safety: 'reversible',
    description: 'Log alcohol served at an event for compliance tracking.',
    inputSchema:
      '{ "description": "string - e.g. Served red wine to 8 guests at the Johnson dinner" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: eventIdentifier, drink_type (e.g. "red wine", "champagne"), guests_served (number), notes. Return ONLY JSON.',
        description,
        z.object({
          eventIdentifier: z.string(),
          drink_type: z.string(),
          guests_served: z.number(),
          notes: z.string().optional(),
        }),
        { modelTier: 'standard' }
      )

      const event = await findEvent(parsed.eventIdentifier, ctx.tenantId)
      if (!event) {
        return {
          preview: {
            actionType: 'agent.log_alcohol',
            summary: `Event "${parsed.eventIdentifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching event found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.log_alcohol',
          summary: `Log ${parsed.drink_type} at ${event.occasion}`,
          fields: [
            { label: 'Event', value: String(event.occasion) },
            { label: 'Drink', value: parsed.drink_type, editable: true },
            { label: 'Guests Served', value: String(parsed.guests_served) },
          ],
          safety: 'reversible',
        },
        commitPayload: {
          eventId: event.id,
          drink_type: parsed.drink_type,
          guests_served: parsed.guests_served,
          notes: parsed.notes,
        },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Event not found.' }
      const log = await getOrCreateAlcoholLog(String(payload.eventId))
      const logId = (log as Record<string, unknown>).id as string
      await addAlcoholLogEntry(logId, {
        drink_type: String(payload.drink_type),
        guests_served: Number(payload.guests_served),
        notes: payload.notes as string | undefined,
      })
      return { success: true, message: 'Alcohol serving logged!' }
    },
  },

  // ─── Generate Prep Timeline ──────────────────────────────────────────────
  {
    taskType: 'agent.generate_prep_timeline',
    name: 'Generate Prep Timeline',
    tier: 2,
    safety: 'reversible',
    description: 'Generate an AI prep timeline/schedule for an event, showing what to do and when.',
    inputSchema: '{ "eventIdentifier": "string - event to generate prep timeline for" }',
    tierNote: 'ALWAYS tier 2 - chef reviews before following the timeline.',

    async executor(inputs, ctx) {
      const identifier = String(inputs.eventIdentifier ?? inputs.description ?? '')
      const event = await findEvent(identifier, ctx.tenantId)

      if (!event) {
        return {
          preview: {
            actionType: 'agent.generate_prep_timeline',
            summary: `Event "${identifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching event found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.generate_prep_timeline',
          summary: `Generate prep timeline: ${event.occasion}`,
          fields: [
            { label: 'Event', value: String(event.occasion) },
            { label: 'Date', value: String(event.event_date) },
          ],
          safety: 'reversible',
        },
        commitPayload: { eventId: event.id },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Event not found.' }
      try {
        await generatePrepTimeline(String(payload.eventId))
        return {
          success: true,
          message: 'Prep timeline generated!',
          redirectUrl: `/events/${payload.eventId}`,
        }
      } catch (err) {
        return {
          success: false,
          message: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }
      }
    },
  },

  // ─── Acknowledge Scope Drift ─────────────────────────────────────────────
  {
    taskType: 'agent.acknowledge_scope_drift',
    name: 'Acknowledge Scope Drift',
    tier: 2,
    safety: 'significant',
    description:
      'Acknowledge that an event scope has changed (e.g., more guests, changed menu) so financials can be reviewed.',
    inputSchema: '{ "eventIdentifier": "string - event with scope drift to acknowledge" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs, ctx) {
      const identifier = String(inputs.eventIdentifier ?? inputs.description ?? '')
      const event = await findEvent(identifier, ctx.tenantId)

      if (!event) {
        return {
          preview: {
            actionType: 'agent.acknowledge_scope_drift',
            summary: `Event "${identifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching event found.' }],
            safety: 'significant' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.acknowledge_scope_drift',
          summary: `Acknowledge scope drift: ${event.occasion}`,
          fields: [{ label: 'Event', value: String(event.occasion) }],
          warnings: [
            'Acknowledging scope drift confirms you are aware the event scope has changed from the original quote.',
          ],
          safety: 'significant',
        },
        commitPayload: { eventId: event.id },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Event not found.' }
      await acknowledgeScopeDrift(String(payload.eventId))
      return {
        success: true,
        message: 'Scope drift acknowledged!',
        redirectUrl: `/events/${payload.eventId}`,
      }
    },
  },
]
