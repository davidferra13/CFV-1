// Remy Agent - Calendar Actions
// Create, update, delete calendar entries (availability blocks, personal events).

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import {
  createCalendarEntry,
  updateCalendarEntry,
} from '@/lib/calendar/entry-actions'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
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

const CalendarEntryTypeSchema = z.enum([
  'vacation',
  'time_off',
  'personal',
  'market',
  'festival',
  'class',
  'photo_shoot',
  'media',
  'meeting',
  'admin_block',
  'other',
  'target_booking',
  'soft_preference',
])

const CalendarEntryUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    entry_type: CalendarEntryTypeSchema.optional(),
    description: z.string().optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date').optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date').optional(),
    all_day: z.boolean().optional(),
    start_time: z.string().nullable().optional(),
    end_time: z.string().nullable().optional(),
    blocks_bookings: z.boolean().optional(),
    is_revenue_generating: z.boolean().optional(),
    revenue_type: z.enum(['income', 'promotional']).nullable().optional(),
    expected_revenue_cents: z.number().int().min(0).nullable().optional(),
    actual_revenue_cents: z.number().int().min(0).nullable().optional(),
    revenue_notes: z.string().optional(),
    is_public: z.boolean().optional(),
    public_note: z.string().max(500).optional(),
    color_override: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
  })
  .strict()

const ParsedCalendarEntryUpdateSchema = z.object({
  entryTitle: z.string().min(1),
  updates: CalendarEntryUpdateSchema,
})

async function parseCalendarEntryFromNL(description: string) {
  const systemPrompt = `Extract calendar entry data: title, entry_type (blocked/available/personal/travel), start_date (YYYY-MM-DD), end_date (YYYY-MM-DD, same as start if single day), notes, is_all_day (default true).
Return ONLY valid JSON. Omit unmentioned fields.`
  return parseWithOllama(systemPrompt, description, ParsedCalendarEntrySchema, {
    modelTier: 'standard',
  })
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
      'Add an entry to the calendar - block off dates, mark available, add personal events, log travel days.',
    inputSchema:
      '{ "description": "string - e.g. Block off March 10-12 for vacation, or Mark March 20 as available for bookings" }',
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
    inputSchema: '{ "description": "string - e.g. Move my vacation block to March 15-17" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: entryTitle (exact title to find), updates: { title?, start_date?, end_date?, entry_type?, description?, all_day?, start_time?, end_time?, blocks_bookings?, is_revenue_generating?, revenue_type?, expected_revenue_cents?, actual_revenue_cents?, revenue_notes?, is_public?, public_note?, color_override? }. entry_type must be one of vacation, time_off, personal, market, festival, class, photo_shoot, media, meeting, admin_block, other, target_booking, soft_preference. Return ONLY JSON. Omit unmentioned fields.',
        description,
        ParsedCalendarEntryUpdateSchema,
        { modelTier: 'standard' }
      )

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
            'Calendar entry updates require exactly one matching title for this chef.',
          ],
          safety: 'reversible',
        },
        commitPayload: { entryTitle: parsed.entryTitle, updates: parsed.updates },
      }
    },

    async commitAction(payload) {
      try {
        const parsedPayload = ParsedCalendarEntryUpdateSchema.safeParse(payload)
        if (!parsedPayload.success) {
          return {
            success: false,
            message: 'Calendar update could not be applied because the requested fields were invalid.',
          }
        }

        const titleToFind = parsedPayload.data.entryTitle.trim()
        const updates = parsedPayload.data.updates as Parameters<typeof updateCalendarEntry>[1]

        if (!titleToFind) {
          return { success: false, message: 'Calendar update needs a title to find.' }
        }

        if (Object.keys(updates).length === 0) {
          return { success: false, message: 'Calendar update needs at least one field to change.' }
        }

        const user = await requireChef()
        const db: any = createServerClient()
        const { data: matches, error } = await db
          .from('chef_calendar_entries')
          .select('id, title')
          .eq('chef_id', user.tenantId!)
          .ilike('title', titleToFind)

        if (error) {
          return { success: false, message: `Failed to find calendar entry: ${error.message}` }
        }

        if (!matches || matches.length === 0) {
          return {
            success: false,
            message: `No calendar entry titled "${titleToFind}" was found for this chef.`,
          }
        }

        if (matches.length > 1) {
          return {
            success: false,
            message: `Found ${matches.length} calendar entries titled "${titleToFind}". Update the entry directly on the calendar page or rename one entry first.`,
          }
        }

        await updateCalendarEntry(matches[0].id, updates)
        return { success: true, message: 'Calendar entry updated!', redirectUrl: '/calendar' }
      } catch (err) {
        return {
          success: false,
          message: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }
      }
    },
  },
]
