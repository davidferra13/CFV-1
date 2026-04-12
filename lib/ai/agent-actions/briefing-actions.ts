// Remy Agent - Daily Briefing & Date Hold Actions
// Morning briefing summarizes today's events, prep needs, overdue items, and new inquiries.
// Date hold tentatively blocks a calendar date (reversible).

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { createServerClient } from '@/lib/db/server'
import { createCalendarEntry } from '@/lib/calendar/entry-actions'
import { dateToDateString } from '@/lib/utils/format'

// ─── Action Definitions ──────────────────────────────────────────────────────

export const briefingAgentActions: AgentActionDefinition[] = [
  // ─── Daily Briefing ──────────────────────────────────────────────────────
  {
    taskType: 'agent.daily_briefing',
    name: 'Daily Briefing',
    tier: 2,
    safety: 'reversible',
    description:
      "Generate the chef's morning briefing: today's events, prep needed, overdue todos, new inquiries, and pending payments.",
    inputSchema: '{ "context": "optional string - any specific area to focus on" }',
    tierNote: 'Tier 2 - presents structured briefing for chef review.',

    async executor(_inputs, ctx) {
      const db: any = createServerClient()
      // Use local date parts to avoid UTC offset shifting dates after ~7pm ET
      const _now = new Date()
      const today = [
        _now.getFullYear(),
        String(_now.getMonth() + 1).padStart(2, '0'),
        String(_now.getDate()).padStart(2, '0'),
      ].join('-')
      const _tmr = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate() + 1)
      const tomorrow = [
        _tmr.getFullYear(),
        String(_tmr.getMonth() + 1).padStart(2, '0'),
        String(_tmr.getDate()).padStart(2, '0'),
      ].join('-')

      const [
        { data: todayEvents },
        { data: tomorrowEvents },
        { data: overdueTodos },
        { data: newInquiries },
        { data: pendingPayments },
      ] = await Promise.all([
        // Today's events
        db
          .from('events')
          .select(
            'id, occasion, event_date, serve_time, status, guest_count, client:clients(full_name)'
          )
          .eq('tenant_id', ctx.tenantId)
          .eq('event_date', today)
          .not('status', 'in', '("cancelled","completed")')
          .order('serve_time', { ascending: true }),
        // Tomorrow's events (for prep planning)
        db
          .from('events')
          .select(
            'id, occasion, event_date, serve_time, status, guest_count, client:clients(full_name)'
          )
          .eq('tenant_id', ctx.tenantId)
          .eq('event_date', tomorrow)
          .not('status', 'in', '("cancelled","completed")')
          .order('serve_time', { ascending: true }),
        // Overdue tasks
        db
          .from('tasks')
          .select('id, title, due_date, priority')
          .eq('chef_id', ctx.tenantId)
          .eq('status', 'pending')
          .lte('due_date', today)
          .order('priority', { ascending: false })
          .limit(5),
        // New inquiries (last 48 hours)
        db
          .from('inquiries')
          .select('id, lead_name, occasion, status, created_at')
          .eq('tenant_id', ctx.tenantId)
          .in('status', ['new', 'awaiting_chef'])
          .gte('created_at', new Date(Date.now() - 2 * 86400000).toISOString())
          .order('created_at', { ascending: false })
          .limit(5),
        // Pending payments
        db
          .from('events')
          .select('id, occasion, client:clients(full_name), event_date')
          .eq('tenant_id', ctx.tenantId)
          .in('status', ['accepted', 'confirmed'])
          .limit(5),
      ])

      const formatEvent = (e: Record<string, unknown>) => {
        const client = e.client as Record<string, unknown> | null
        return `${(e.occasion as string) ?? 'Event'} - ${(client?.full_name as string) ?? 'Unknown'} (${(e.guest_count as number) ?? '?'} guests, ${e.serve_time ?? 'TBD'})`
      }

      const lines: string[] = []
      if ((todayEvents ?? []).length > 0) {
        lines.push(`TODAY'S EVENTS (${(todayEvents ?? []).length}):`)
        for (const e of todayEvents ?? [])
          lines.push(`• ${formatEvent(e as Record<string, unknown>)}`)
      } else {
        lines.push('TODAY: No events - clear day for prep, admin, or creative work')
      }

      if ((tomorrowEvents ?? []).length > 0) {
        lines.push(`\nTOMORROW (prep now):`)
        for (const e of tomorrowEvents ?? [])
          lines.push(`• ${formatEvent(e as Record<string, unknown>)}`)
      }

      if ((overdueTodos ?? []).length > 0) {
        lines.push(`\n⚠️ OVERDUE (${(overdueTodos ?? []).length}):`)
        for (const t of overdueTodos ?? []) {
          const todo = t as Record<string, unknown>
          lines.push(`• ${todo.title} (due ${dateToDateString(todo.due_date as Date | string)})`)
        }
      }

      if ((newInquiries ?? []).length > 0) {
        lines.push(`\n📬 NEW INQUIRIES (${(newInquiries ?? []).length}):`)
        for (const i of newInquiries ?? []) {
          const inq = i as Record<string, unknown>
          lines.push(`• ${inq.lead_name ?? 'Unknown'} - ${inq.occasion ?? 'TBD'}`)
        }
      }

      const briefing = lines.join('\n')

      const fields: AgentActionPreview['fields'] = [
        { label: 'Date', value: today },
        { label: "Today's Events", value: String((todayEvents ?? []).length) },
        { label: "Tomorrow's Events", value: String((tomorrowEvents ?? []).length) },
        { label: 'Overdue Todos', value: String((overdueTodos ?? []).length) },
        { label: 'New Inquiries', value: String((newInquiries ?? []).length) },
      ]

      return {
        preview: {
          actionType: 'agent.daily_briefing',
          summary: briefing,
          fields,
          safety: 'reversible' as const,
        },
        commitPayload: { briefing },
      }
    },

    async commitAction(payload) {
      // Briefing is read-only - nothing to persist
      return {
        success: true,
        message: (payload.briefing as string) ?? 'Briefing complete.',
      }
    },
  },

  // ─── Hold Date (Tentative Calendar Block) ──────────────────────────────
  {
    taskType: 'agent.hold_date',
    name: 'Hold Date',
    tier: 2,
    safety: 'reversible',
    description:
      'Tentatively block a date on the calendar. Creates a "blocked" calendar entry that can be removed later.',
    inputSchema:
      '{ "date": "string - YYYY-MM-DD date to hold", "reason": "string - optional reason for the hold" }',
    tierNote: 'Tier 2 - chef confirms before blocking the date.',

    async executor(inputs) {
      const date = String(inputs.date ?? '')
      const reason = String(inputs.reason ?? 'Tentative hold')

      if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error(`Invalid date format: "${date}". Expected YYYY-MM-DD.`)
      }

      const fields: AgentActionPreview['fields'] = [
        { label: 'Date', value: date, editable: true },
        { label: 'Reason', value: reason, editable: true },
        { label: 'Type', value: 'Tentative Hold (blocked)' },
      ]

      return {
        preview: {
          actionType: 'agent.hold_date',
          summary: `Block ${date} - ${reason}`,
          fields,
          safety: 'reversible' as const,
        },
        commitPayload: { date, reason },
      }
    },

    async commitAction(payload) {
      const date = String(payload.date)
      const reason = String(payload.reason ?? 'Tentative hold')

      try {
        await createCalendarEntry({
          title: `HOLD: ${reason}`,
          entry_type: 'admin_block',
          start_date: date,
          end_date: date,
          all_day: true,
          blocks_bookings: true,
          description: `Tentative hold created by Remy. Reason: ${reason}`,
          is_revenue_generating: false,
          is_public: false,
        })

        return {
          success: true,
          message: `Date ${date} is now held - "${reason}". Remove it from Calendar if plans change.`,
          redirectUrl: '/calendar',
        }
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : 'Failed to create calendar hold.',
        }
      }
    },
  },
]
