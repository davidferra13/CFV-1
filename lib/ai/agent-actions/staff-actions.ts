// Remy Agent - Staff Management Actions
// Assign staff to events, record hours, create staff members.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import {
  listStaffMembers,
  assignStaffToEvent,
  removeStaffFromEvent,
  recordStaffHours,
  createStaffMember,
  getEventStaffRoster,
} from '@/lib/staff/actions'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { z } from 'zod'

// ─── Event Finder ────────────────────────────────────────────────────────────

async function findEvent(identifier: string, tenantId: string) {
  const supabase: any = createServerClient()
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled","completed")')
    .limit(20)

  const lower = identifier.toLowerCase()
  return (events ?? []).find((e: Record<string, unknown>) => {
    const occ = String(e.occasion ?? '').toLowerCase()
    const cn = String((e.client as Record<string, unknown> | null)?.full_name ?? '').toLowerCase()
    return occ.includes(lower) || cn.includes(lower)
  })
}

// ─── Action Definitions ──────────────────────────────────────────────────────

export const staffAgentActions: AgentActionDefinition[] = [
  // ─── Create Staff Member ─────────────────────────────────────────────────
  {
    taskType: 'agent.create_staff',
    name: 'Create Staff Member',
    tier: 2,
    safety: 'reversible',
    description: 'Add a new staff member to your team.',
    inputSchema:
      '{ "description": "string - e.g. Add Maria Garcia, sous chef, $25/hour, phone 503-555-1234" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: full_name, role (sous_chef/line_cook/server/bartender/assistant/other), hourly_rate_cents (dollars→cents), phone, email, notes. Return ONLY JSON.',
        description,
        z.object({
          full_name: z.string(),
          role: z.string().optional(),
          hourly_rate_cents: z.number().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          notes: z.string().optional(),
        }),
        { modelTier: 'standard' }
      )

      const fields: AgentActionPreview['fields'] = [
        { label: 'Name', value: parsed.full_name, editable: true },
      ]
      if (parsed.role) fields.push({ label: 'Role', value: parsed.role })
      if (parsed.hourly_rate_cents)
        fields.push({
          label: 'Hourly Rate',
          value: `$${(parsed.hourly_rate_cents / 100).toFixed(2)}`,
          editable: true,
        })
      if (parsed.phone) fields.push({ label: 'Phone', value: parsed.phone })
      if (parsed.email) fields.push({ label: 'Email', value: parsed.email })

      return {
        preview: {
          actionType: 'agent.create_staff',
          summary: `Add staff: ${parsed.full_name}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: parsed,
      }
    },

    async commitAction(payload) {
      try {
        await createStaffMember({
          full_name: String(payload.full_name),
          role: payload.role as string | undefined,
          hourly_rate_cents: payload.hourly_rate_cents as number | undefined,
          phone: payload.phone as string | undefined,
          email: payload.email as string | undefined,
          notes: payload.notes as string | undefined,
        } as unknown as Parameters<typeof createStaffMember>[0])
        return { success: true, message: `Staff member "${payload.full_name}" added!` }
      } catch (err) {
        return {
          success: false,
          message: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }
      }
    },
  },

  // ─── Assign Staff to Event ───────────────────────────────────────────────
  {
    taskType: 'agent.assign_staff',
    name: 'Assign Staff to Event',
    tier: 2,
    safety: 'reversible',
    description: 'Assign a staff member to work an event.',
    inputSchema: '{ "description": "string - e.g. Put Maria on the Johnson dinner this Saturday" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: staffName (person to assign), eventIdentifier (event name or client). Return ONLY JSON.',
        description,
        z.object({ staffName: z.string(), eventIdentifier: z.string() }),
        { modelTier: 'standard' }
      )

      // Find staff
      const staff = await listStaffMembers(true)
      const staffLower = parsed.staffName.toLowerCase()
      const staffMatch = (staff ?? []).find((s: Record<string, unknown>) =>
        String(s.full_name ?? '')
          .toLowerCase()
          .includes(staffLower)
      )

      // Find event
      const event = await findEvent(parsed.eventIdentifier, ctx.tenantId)

      if (!staffMatch || !event) {
        const missing = !staffMatch
          ? `staff "${parsed.staffName}"`
          : `event "${parsed.eventIdentifier}"`
        return {
          preview: {
            actionType: 'agent.assign_staff',
            summary: `Could not find ${missing}`,
            fields: [{ label: 'Error', value: `${missing} not found.` }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.assign_staff',
          summary: `Assign ${(staffMatch as Record<string, unknown>).full_name} to ${event.occasion}`,
          fields: [
            { label: 'Staff', value: String((staffMatch as Record<string, unknown>).full_name) },
            { label: 'Event', value: String(event.occasion) },
            { label: 'Date', value: String(event.event_date) },
          ],
          safety: 'reversible',
        },
        commitPayload: {
          staffId: (staffMatch as Record<string, unknown>).id,
          eventId: event.id,
          staffName: (staffMatch as Record<string, unknown>).full_name,
        },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Staff or event not found.' }
      try {
        await assignStaffToEvent({
          staff_id: String(payload.staffId),
          event_id: String(payload.eventId),
        } as unknown as Parameters<typeof assignStaffToEvent>[0])
        return {
          success: true,
          message: `${payload.staffName} assigned to event!`,
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

  // ─── Record Staff Hours ──────────────────────────────────────────────────
  {
    taskType: 'agent.record_staff_hours',
    name: 'Record Staff Hours',
    tier: 2,
    safety: 'reversible',
    description: 'Log hours worked by a staff member at an event.',
    inputSchema: '{ "description": "string - e.g. Maria worked 6 hours at the Johnson dinner" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: staffName, eventIdentifier, hours (number). Return ONLY JSON.',
        description,
        z.object({
          staffName: z.string(),
          eventIdentifier: z.string(),
          hours: z.number(),
        }),
        { modelTier: 'standard' }
      )

      const staff = await listStaffMembers(true)
      const staffLower = parsed.staffName.toLowerCase()
      const staffMatch = (staff ?? []).find((s: Record<string, unknown>) =>
        String(s.full_name ?? '')
          .toLowerCase()
          .includes(staffLower)
      )

      const event = await findEvent(parsed.eventIdentifier, ctx.tenantId)

      if (!staffMatch || !event) {
        return {
          preview: {
            actionType: 'agent.record_staff_hours',
            summary: 'Staff or event not found',
            fields: [{ label: 'Error', value: 'Could not find matching staff or event.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      // Find the assignment
      const roster = await getEventStaffRoster(event.id)
      const assignment = (roster ?? []).find(
        (a: Record<string, unknown>) =>
          String(a.staff_id) === String((staffMatch as Record<string, unknown>).id)
      )

      if (!assignment) {
        return {
          preview: {
            actionType: 'agent.record_staff_hours',
            summary: `${(staffMatch as Record<string, unknown>).full_name} is not assigned to this event`,
            fields: [
              { label: 'Error', value: 'Assign the staff member first, then record hours.' },
            ],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.record_staff_hours',
          summary: `Log ${parsed.hours}h for ${(staffMatch as Record<string, unknown>).full_name}`,
          fields: [
            { label: 'Staff', value: String((staffMatch as Record<string, unknown>).full_name) },
            { label: 'Event', value: String(event.occasion) },
            { label: 'Hours', value: String(parsed.hours), editable: true },
          ],
          safety: 'reversible',
        },
        commitPayload: {
          assignmentId: (assignment as Record<string, unknown>).id,
          hours: parsed.hours,
        },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Not found.' }
      try {
        await recordStaffHours({
          assignment_id: String(payload.assignmentId),
          hours_worked: Number(payload.hours),
        } as unknown as Parameters<typeof recordStaffHours>[0])
        return { success: true, message: `${payload.hours} hours logged!` }
      } catch (err) {
        return {
          success: false,
          message: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }
      }
    },
  },
]
