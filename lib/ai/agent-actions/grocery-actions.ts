// Remy Agent — Grocery Actions
// Run grocery price quotes and log actual costs.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { runGroceryPriceQuote, logActualGroceryCost } from '@/lib/grocery/pricing-actions'
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
    .order('event_date', { ascending: true })
    .limit(20)

  const lower = identifier.toLowerCase()
  return (events ?? []).find((e: Record<string, unknown>) => {
    const occ = String(e.occasion ?? '').toLowerCase()
    const cn = String((e.client as Record<string, unknown> | null)?.full_name ?? '').toLowerCase()
    return occ.includes(lower) || cn.includes(lower)
  })
}

// ─── Action Definitions ──────────────────────────────────────────────────────

export const groceryAgentActions: AgentActionDefinition[] = [
  // ─── Run Grocery Price Quote ─────────────────────────────────────────────
  {
    taskType: 'agent.run_grocery_quote',
    name: 'Run Grocery Price Quote',
    tier: 2,
    safety: 'reversible',
    description:
      "Price-check groceries for an event. Queries ingredient prices from multiple sources based on the event's menu and recipes.",
    inputSchema: '{ "eventIdentifier": "string — event occasion or client name" }',
    tierNote: 'ALWAYS tier 2 — chef reviews pricing results.',

    async executor(inputs, ctx) {
      const identifier = String(inputs.eventIdentifier ?? inputs.description ?? '')
      const event = await findEvent(identifier, ctx.tenantId)

      if (!event) {
        return {
          preview: {
            actionType: 'agent.run_grocery_quote',
            summary: `Event "${identifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching event found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const clientName = (event.client as Record<string, unknown> | null)?.full_name ?? 'Client'

      return {
        preview: {
          actionType: 'agent.run_grocery_quote',
          summary: `Run grocery quote: ${event.occasion}`,
          fields: [
            { label: 'Event', value: String(event.occasion) },
            { label: 'Date', value: String(event.event_date) },
            { label: 'Client', value: String(clientName) },
          ],
          warnings: ['This will query grocery pricing APIs. It may take a moment to fetch prices.'],
          safety: 'reversible',
        },
        commitPayload: { eventId: event.id },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Event not found.' }
      try {
        const result = await runGroceryPriceQuote(String(payload.eventId))
        if (!result) {
          return {
            success: false,
            message:
              'No grocery quote generated — make sure the event has a menu with recipes and ingredients.',
          }
        }
        return {
          success: true,
          message: 'Grocery price quote generated!',
          redirectUrl: `/events/${payload.eventId}/grocery-quote`,
        }
      } catch (err) {
        return {
          success: false,
          message: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }
      }
    },
  },

  // ─── Log Actual Grocery Cost ─────────────────────────────────────────────
  {
    taskType: 'agent.log_grocery_actual',
    name: 'Log Actual Grocery Cost',
    tier: 2,
    safety: 'reversible',
    description:
      'Record the actual amount spent on groceries for an event (vs. the estimated quote).',
    inputSchema:
      '{ "description": "string — e.g. Spent $340 on groceries for the Johnson dinner" }',
    tierNote: 'ALWAYS tier 2 — financial data requires chef confirmation.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: eventIdentifier, actualCostCents (dollars→cents). Return ONLY JSON.',
        description,
        z.object({ eventIdentifier: z.string(), actualCostCents: z.number() }),
        { modelTier: 'standard' }
      )

      const event = await findEvent(parsed.eventIdentifier, ctx.tenantId)
      if (!event) {
        return {
          preview: {
            actionType: 'agent.log_grocery_actual',
            summary: `Event "${parsed.eventIdentifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching event found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.log_grocery_actual',
          summary: `Log $${(parsed.actualCostCents / 100).toFixed(2)} grocery cost for ${event.occasion}`,
          fields: [
            { label: 'Event', value: String(event.occasion) },
            {
              label: 'Actual Cost',
              value: `$${(parsed.actualCostCents / 100).toFixed(2)}`,
              editable: true,
            },
          ],
          safety: 'reversible',
        },
        commitPayload: { eventId: event.id, actualCostCents: parsed.actualCostCents },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Event not found.' }
      try {
        await logActualGroceryCost(String(payload.eventId), Number(payload.actualCostCents))
        return {
          success: true,
          message: `Actual grocery cost of $${(Number(payload.actualCostCents) / 100).toFixed(2)} recorded!`,
        }
      } catch (err) {
        return {
          success: false,
          message: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }
      }
    },
  },
]
