// Remy Agent — Calendar Actions
// Create, update, delete calendar entries (availability blocks, personal events).

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import {
  createCalendarEntry,
  updateCalendarEntry,
  deleteCalendarEntry,
} from '@/lib/calendar/entry-actions'
import { dispatchPrivate } from '@/lib/ai/dispatch'
import { z } from 'zod'

// ─── NL Parser ───────────────────────────────────────────────────────────────

const ParsedCalendarEntrySchema = z.object({
  title: z.string(),
  entry_type: z.enum(['blocked', 'available', 'personal', 'travel']).optional(),
  start_date: z.string(),
  end_date: z.string().optional(),
  notes: z.string().optional(),
  is_all_day: z.boolean().optional(),
})

async function parseCalendarEntryFromNL(description: string) {
  const systemPrompt = `Extract calendar entry data: title, entry_type (blocked/available/personal/travel), start_date (YYYY-MM-DD), end_date (YYYY-MM-DD, same as start if single day), notes, is_all_day (default true).
Return ONLY valid JSON. Omit unmentioned fields.`
  const { result } = await dispatchPrivate(systemPrompt, description, ParsedCalendarEntrySchema, {
    modelTier: 'standard',
  })
  return result
}

// ─── Action Definitions ──────────────────────────────────────────────────────

export const calendarAgentActions: AgentActionDefinition[] = [
  // ─── Create Calendar Entry ───────────────────────────────────────────────
  {
    taskType: 'agent.create_calendar_entry',
    name: 'Add Calendar Entry',
    tier: 2,
    safety: 'reversible',
    description:
      'Add an entry to the calendar — block off dates, mark available, add personal events, log travel days.',
    inputSchema:
      '{ "description": "string — e.g. Block off March 10-12 for vacation, or Mark March 20 as available for bookings" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseCalendarEntryFromNL(description)

      const fields: AgentActionPreview['fields'] = [
        { label: 'Title', value: parsed.title, editable: true },
        { label: 'Type', value: (parsed.entry_type ?? 'blocked').replace(/_/g, ' ') },
        { label: 'Start', value: parsed.start_date, editable: true },
      ]
      if (parsed.end_date && parsed.end_date !== parsed.start_date)
        fields.push({ label: 'End', value: parsed.end_date, editable: true })
      if (parsed.notes) fields.push({ label: 'Notes', value: parsed.notes })

      return {
        preview: {
          actionType: 'agent.create_calendar_entry',
          summary: `Add to calendar: ${parsed.title}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: parsed,
      }
    },

    async commitAction(payload) {
      try {
        await createCalendarEntry({
          title: String(payload.title),
          entry_type: (payload.entry_type as string) ?? 'blocked',
          start_date: String(payload.start_date),
          end_date: (payload.end_date as string) ?? (payload.start_date as string),
          notes: payload.notes as string | undefined,
          is_all_day: (payload.is_all_day as boolean) ?? true,
        } as unknown as Parameters<typeof createCalendarEntry>[0])
        return { success: true, message: 'Calendar entry added!', redirectUrl: '/calendar' }
      } catch (err) {
        return {
          success: false,
          message: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }
      }
    },
  },

  // ─── Update Calendar Entry ───────────────────────────────────────────────
  {
    taskType: 'agent.update_calendar_entry',
    name: 'Update Calendar Entry',
    tier: 2,
    safety: 'reversible',
    description: 'Update an existing calendar entry (change dates, title, or type).',
    inputSchema: '{ "description": "string — e.g. Move my vacation block to March 15-17" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = (
        await dispatchPrivate(
          'Extract: entryTitle (title to find), updates: { title?, start_date?, end_date?, entry_type?, notes? }. Return ONLY JSON.',
          description,
          z.object({
            entryTitle: z.string(),
            updates: z.record(z.string(), z.unknown()),
          }),
          { modelTier: 'standard' }
        )
      ).result

      const fields: AgentActionPreview['fields'] = [{ label: 'Entry', value: parsed.entryTitle }]
      for (const [key, val] of Object.entries(parsed.updates)) {
        if (val !== undefined) {
          fields.push({
            label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            value: String(val),
            editable: true,
          })
        }
      }

      return {
        preview: {
          actionType: 'agent.update_calendar_entry',
          summary: `Update calendar: ${parsed.entryTitle}`,
          fields,
          warnings: [
            'Calendar entry lookup by title is approximate — verify the correct entry is being updated.',
          ],
          safety: 'reversible',
        },
        commitPayload: { entryTitle: parsed.entryTitle, updates: parsed.updates },
      }
    },

    async commitAction(payload) {
      // Note: This requires finding the entry by title first, which is best-effort
      return {
        success: false,
        message:
          'Calendar entry update by title is not yet supported — please update it directly on the calendar page.',
      }
    },
  },
]
