// Remy Agent - Workflow Actions
// High-frequency workflow operations: complete todos, event timers, food budgets,
// goals, shopping lists, recipe dietary checks, follow-up tracking.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { createServerClient } from '@/lib/db/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { findTodoMatch } from '@/lib/todos/match'
import { z } from 'zod'

// ─── Complete Todo ─────────────────────────────────────────────────────────────
// "Mark the shopping done", "complete the Whole Foods todo"

async function findTodoByQuery(query: string): Promise<{ id: string; text: string } | null> {
  const { getTodos } = await import('@/lib/todos/actions')
  const todos = await getTodos()
  return findTodoMatch(todos, query)
}

// ─── Create Goal ───────────────────────────────────────────────────────────────

const ParsedGoalSchema = z.object({
  label: z.string(),
  goal_type: z.string().optional(),
  target_value: z.number().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
})

async function parseGoalFromNL(description: string) {
  const systemPrompt = `Extract business goal data: label (short description), goal_type (one of: revenue_monthly, revenue_annual, booking_count, new_clients, repeat_booking_rate, profit_margin, referrals_received, dishes_created, recipe_library), target_value (integer), period_start (YYYY-MM-DD), period_end (YYYY-MM-DD).
Return ONLY valid JSON. Omit unmentioned fields. Default goal_type to booking_count if unclear.`

  return parseWithOllama(systemPrompt, description, ParsedGoalSchema, { modelTier: 'standard' })
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function localDateISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

async function findEventByQuery(
  query: string,
  tenantId: string
): Promise<{
  id: string
  occasion: string
  event_date: string | null
  client_name: string
} | null> {
  const db: any = createServerClient()
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'in_progress', 'accepted', 'paid'])
    .order('event_date', { ascending: true })
    .limit(20)

  if (!events || events.length === 0) return null

  const q = query.toLowerCase()
  for (const e of events) {
    const occasion = ((e.occasion as string) ?? '').toLowerCase()
    const clientName = (((e.client as any)?.full_name as string) ?? '').toLowerCase()
    if (
      occasion.includes(q) ||
      clientName.includes(q) ||
      q.includes(occasion) ||
      q.includes(clientName)
    ) {
      return {
        id: e.id as string,
        occasion: (e.occasion as string) ?? 'Event',
        event_date: e.event_date as string | null,
        client_name: (e.client as any)?.full_name ?? 'Unknown',
      }
    }
  }

  // Default to next upcoming
  const next = events[0]
  return {
    id: next.id as string,
    occasion: (next.occasion as string) ?? 'Event',
    event_date: next.event_date as string | null,
    client_name: (next.client as any)?.full_name ?? 'Unknown',
  }
}

// ─── Exports ───────────────────────────────────────────────────────────────────

export const workflowAgentActions: AgentActionDefinition[] = [
  // ── Complete Todo ──────────────────────────────────────────────────────────
  {
    taskType: 'agent.complete_todo',
    name: 'Complete Todo',
    tier: 2,
    safety: 'reversible',
    description: 'Mark a todo/task as done.',
    inputSchema: '{ "description": "string - which todo to complete, e.g. Whole Foods shopping" }',
    tierNote: 'ALWAYS tier 2 - chef confirms which todo.',

    async executor(inputs) {
      const query = String(inputs.description ?? '')
      const todo = await findTodoByQuery(query)

      if (!todo) {
        return {
          preview: {
            actionType: 'agent.complete_todo',
            summary: 'No matching reminder found',
            fields: [{ label: 'Search', value: query }],
            warnings: ['No open reminders match that description.'],
            safety: 'reversible',
          },
          commitPayload: {},
        }
      }

      return {
        preview: {
          actionType: 'agent.complete_todo',
          summary: `Complete reminder: ${todo.text}`,
          fields: [{ label: 'Reminder', value: todo.text }],
          safety: 'reversible',
        },
        commitPayload: { todoId: todo.id, text: todo.text },
      }
    },

    async commitAction(payload) {
      if (!payload.todoId) return { success: false, message: 'No todo selected.' }

      const { toggleTodo } = await import('@/lib/todos/actions')
      const result = await toggleTodo(payload.todoId as string)
      if (!result.success)
        return { success: false, message: result.error ?? 'Failed to complete todo.' }

      return { success: true, message: `"${payload.text}" marked done!` }
    },
  },

  // ── Start Event Timer ──────────────────────────────────────────────────────
  {
    taskType: 'agent.start_timer',
    name: 'Start Event Timer',
    tier: 2,
    safety: 'reversible',
    description:
      'Start a work phase timer (shopping, prep, packing, driving, execution) for an event.',
    inputSchema: '{ "description": "string - e.g. start prep for the Henderson dinner" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const activities = ['shopping', 'prep', 'packing', 'driving', 'execution'] as const
      const activityMatch = activities.find((a) => description.toLowerCase().includes(a))
      const activity = activityMatch ?? 'prep'

      const event = await findEventByQuery(description, ctx.tenantId)
      if (!event) {
        return {
          preview: {
            actionType: 'agent.start_timer',
            summary: 'No matching event found',
            fields: [{ label: 'Search', value: description }],
            warnings: ['No active events match that description.'],
            safety: 'reversible',
          },
          commitPayload: {},
        }
      }

      return {
        preview: {
          actionType: 'agent.start_timer',
          summary: `Start ${activity} timer for ${event.occasion}`,
          fields: [
            { label: 'Event', value: `${event.occasion} - ${event.client_name}` },
            { label: 'Phase', value: activity },
            { label: 'Date', value: event.event_date ?? 'TBD' },
          ],
          safety: 'reversible',
        },
        commitPayload: { eventId: event.id, activity, occasion: event.occasion },
      }
    },

    async commitAction(payload) {
      if (!payload.eventId) return { success: false, message: 'No event selected.' }

      const { startEventActivity } = await import('@/lib/events/actions')
      await startEventActivity(payload.eventId as string, payload.activity as any)
      return {
        success: true,
        message: `${(payload.activity as string).charAt(0).toUpperCase() + (payload.activity as string).slice(1)} timer started for ${payload.occasion}!`,
      }
    },
  },

  // ── Stop Event Timer ───────────────────────────────────────────────────────
  {
    taskType: 'agent.stop_timer',
    name: 'Stop Event Timer',
    tier: 2,
    safety: 'reversible',
    description: 'Stop the current work phase timer for an event.',
    inputSchema: '{ "description": "string - e.g. stop the timer for Henderson dinner" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const activities = ['shopping', 'prep', 'packing', 'driving', 'execution'] as const
      const activityMatch = activities.find((a) => description.toLowerCase().includes(a))

      const event = await findEventByQuery(description, ctx.tenantId)
      if (!event) {
        return {
          preview: {
            actionType: 'agent.stop_timer',
            summary: 'No matching event found',
            fields: [{ label: 'Search', value: description }],
            warnings: ['No active events match that description.'],
            safety: 'reversible',
          },
          commitPayload: {},
        }
      }

      // If no explicit activity, try to find the active one
      const activity = activityMatch ?? 'prep'

      return {
        preview: {
          actionType: 'agent.stop_timer',
          summary: `Stop ${activity} timer for ${event.occasion}`,
          fields: [
            { label: 'Event', value: `${event.occasion} - ${event.client_name}` },
            { label: 'Phase', value: activity },
          ],
          safety: 'reversible',
        },
        commitPayload: { eventId: event.id, activity, occasion: event.occasion },
      }
    },

    async commitAction(payload) {
      if (!payload.eventId) return { success: false, message: 'No event selected.' }

      const { stopEventActivity } = await import('@/lib/events/actions')
      const result = await stopEventActivity(payload.eventId as string, payload.activity as any)
      return {
        success: true,
        message: `Timer stopped for ${payload.occasion}. ${result?.elapsedMinutes ? `Logged ${result.elapsedMinutes} minutes.` : ''}`,
      }
    },
  },

  // ── Set Food Cost Budget ───────────────────────────────────────────────────
  {
    taskType: 'agent.set_food_budget',
    name: 'Set Food Cost Budget',
    tier: 2,
    safety: 'reversible',
    description: 'Set the food cost budget for an event (helps track margins).',
    inputSchema:
      '{ "description": "string - e.g. set food budget at $800 for the Henderson dinner" }',
    tierNote: 'ALWAYS tier 2 - chef confirms amount.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const amountMatch = description.match(/\$?([\d,]+(?:\.\d{2})?)\b/)
      const amountCents = amountMatch
        ? Math.round(parseFloat(amountMatch[1].replace(/,/g, '')) * 100)
        : 0

      const event = await findEventByQuery(description, ctx.tenantId)
      if (!event) {
        return {
          preview: {
            actionType: 'agent.set_food_budget',
            summary: 'No matching event found',
            fields: [{ label: 'Search', value: description }],
            warnings: ['No active events match that description.'],
            safety: 'reversible',
          },
          commitPayload: {},
        }
      }

      if (amountCents <= 0) {
        return {
          preview: {
            actionType: 'agent.set_food_budget',
            summary: 'Could not parse budget amount',
            fields: [{ label: 'Event', value: event.occasion }],
            warnings: ['Please specify a dollar amount, e.g. "$800"'],
            safety: 'reversible',
          },
          commitPayload: {},
        }
      }

      return {
        preview: {
          actionType: 'agent.set_food_budget',
          summary: `Set $${(amountCents / 100).toFixed(0)} food budget for ${event.occasion}`,
          fields: [
            { label: 'Event', value: `${event.occasion} - ${event.client_name}` },
            { label: 'Budget', value: `$${(amountCents / 100).toFixed(2)}`, editable: true },
          ],
          safety: 'reversible',
        },
        commitPayload: { eventId: event.id, amountCents, occasion: event.occasion },
      }
    },

    async commitAction(payload) {
      if (!payload.eventId || !payload.amountCents)
        return { success: false, message: 'Missing event or amount.' }

      const { setEventFoodCostBudget } = await import('@/lib/events/actions')
      const result = await setEventFoodCostBudget(
        payload.eventId as string,
        payload.amountCents as number
      )
      if (!result.success)
        return { success: false, message: result.error ?? 'Failed to set budget.' }

      return {
        success: true,
        message: `Food budget set to $${((payload.amountCents as number) / 100).toFixed(0)} for ${payload.occasion}.`,
      }
    },
  },

  // ── Create Goal ────────────────────────────────────────────────────────────
  {
    taskType: 'agent.create_goal',
    name: 'Create Goal',
    tier: 2,
    safety: 'reversible',
    description: 'Set a business goal (revenue, bookings, clients, etc.).',
    inputSchema: '{ "description": "string - e.g. book 10 events this quarter" }',
    tierNote: 'ALWAYS tier 2 - chef reviews goal details.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseGoalFromNL(description)

      const now = new Date()
      const quarterEnd = new Date(now.getFullYear(), Math.ceil((now.getMonth() + 1) / 3) * 3, 0)

      const fields: AgentActionPreview['fields'] = [
        { label: 'Goal', value: parsed.label, editable: true },
        { label: 'Type', value: (parsed.goal_type ?? 'booking_count').replace(/_/g, ' ') },
      ]
      if (parsed.target_value)
        fields.push({ label: 'Target', value: String(parsed.target_value), editable: true })
      fields.push({
        label: 'Start',
        value: parsed.period_start ?? localDateISO(now),
        editable: true,
      })
      fields.push({
        label: 'End',
        value: parsed.period_end ?? localDateISO(quarterEnd),
        editable: true,
      })

      return {
        preview: {
          actionType: 'agent.create_goal',
          summary: `Set goal: ${parsed.label}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: {
          goalType: parsed.goal_type ?? 'booking_count',
          label: parsed.label,
          targetValue: parsed.target_value ?? 10,
          periodStart: parsed.period_start ?? localDateISO(now),
          periodEnd: parsed.period_end ?? localDateISO(quarterEnd),
          nudgeEnabled: true,
          nudgeLevel: 'moderate',
        },
      }
    },

    async commitAction(payload) {
      const { createGoal } = await import('@/lib/goals/actions')
      try {
        const result = await createGoal(payload as any)
        return {
          success: true,
          message: `Goal "${payload.label}" created!`,
          redirectUrl: '/goals',
        }
      } catch (err: any) {
        return { success: false, message: err.message ?? 'Failed to create goal.' }
      }
    },
  },

  // ── Mark Follow-Up Sent ────────────────────────────────────────────────────
  {
    taskType: 'agent.mark_followup',
    name: 'Mark Follow-Up Sent',
    tier: 2,
    safety: 'reversible',
    description: 'Mark that you sent a follow-up for a completed event.',
    inputSchema: '{ "description": "string - e.g. mark Henderson follow-up done" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const event = await findEventByQuery(description, ctx.tenantId)

      if (!event) {
        return {
          preview: {
            actionType: 'agent.mark_followup',
            summary: 'No matching event found',
            fields: [{ label: 'Search', value: description }],
            warnings: ['No events match that description.'],
            safety: 'reversible',
          },
          commitPayload: {},
        }
      }

      return {
        preview: {
          actionType: 'agent.mark_followup',
          summary: `Mark follow-up sent for ${event.occasion}`,
          fields: [
            { label: 'Event', value: `${event.occasion} - ${event.client_name}` },
            { label: 'Date', value: event.event_date ?? 'N/A' },
          ],
          safety: 'reversible',
        },
        commitPayload: { eventId: event.id, occasion: event.occasion },
      }
    },

    async commitAction(payload) {
      if (!payload.eventId) return { success: false, message: 'No event selected.' }

      const { markFollowUpSent } = await import('@/lib/events/actions')
      await markFollowUpSent(payload.eventId as string)
      return { success: true, message: `Follow-up marked as sent for ${payload.occasion}.` }
    },
  },

  // ── Get Shopping List ──────────────────────────────────────────────────────
  // Read-only: generates shopping list from a menu's ingredients
  {
    taskType: 'agent.shopping_list',
    name: 'Get Shopping List',
    tier: 2,
    safety: 'reversible',
    description: 'Generate a shopping list from a menu (ingredients, quantities, estimated costs).',
    inputSchema: '{ "description": "string - e.g. shopping list for the spring tasting menu" }',
    tierNote: 'Tier 2 but read-only. Chef reviews before shopping.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const db: any = createServerClient()

      // Find matching menu
      const { data: menus } = await db
        .from('menus')
        .select('id, name, target_guest_count')
        .eq('tenant_id', ctx.tenantId)
        .order('updated_at', { ascending: false })
        .limit(20)

      if (!menus || menus.length === 0) {
        return {
          preview: {
            actionType: 'agent.shopping_list',
            summary: 'No menus found',
            fields: [],
            warnings: ['No menus found. Create a menu first.'],
            safety: 'reversible',
          },
          commitPayload: {},
        }
      }

      const q = description.toLowerCase()
      const match = menus.find((m: any) => (m.name as string).toLowerCase().includes(q)) ?? menus[0]

      return {
        preview: {
          actionType: 'agent.shopping_list',
          summary: `Shopping list for "${match.name}"`,
          fields: [
            { label: 'Menu', value: match.name as string },
            { label: 'Guest count', value: String(match.target_guest_count ?? 1) },
          ],
          safety: 'reversible',
        },
        commitPayload: { menuId: match.id, menuName: match.name },
      }
    },

    async commitAction(payload) {
      if (!payload.menuId) return { success: false, message: 'No menu selected.' }

      const { getMenuShoppingList } = await import('@/lib/menus/actions')
      try {
        const result = await getMenuShoppingList(payload.menuId as string)

        if (!result.items || result.items.length === 0) {
          return {
            success: true,
            message: `Shopping list for "${payload.menuName}" is empty. Add ingredients to your dishes first.`,
          }
        }

        const lines = result.items.map((item: any) => {
          const cost = item.estimatedCostCents
            ? ` (~$${(item.estimatedCostCents / 100).toFixed(2)})`
            : ''
          return `- ${item.ingredientName}: ${item.totalQuantity} ${item.unit}${cost}`
        })

        const totalCost = result.items.reduce(
          (sum: number, i: any) => sum + (i.estimatedCostCents ?? 0),
          0
        )

        return {
          success: true,
          message: `Shopping list for "${payload.menuName}" (${result.items.length} items${totalCost > 0 ? `, ~$${(totalCost / 100).toFixed(0)} est.` : ''}):\n${lines.join('\n')}`,
        }
      } catch (err: any) {
        return { success: false, message: err.message ?? 'Failed to generate shopping list.' }
      }
    },
  },

  // ── Recipe Dietary Check ───────────────────────────────────────────────────
  // Read-only: checks if a recipe is compatible with common diets
  {
    taskType: 'agent.recipe_dietary_check',
    name: 'Recipe Dietary Check',
    tier: 2,
    safety: 'reversible',
    description:
      'Check if a recipe is compatible with common dietary restrictions (gluten-free, vegan, nut-free, etc.).',
    inputSchema: '{ "description": "string - e.g. is my risotto safe for celiac" }',
    tierNote: 'Tier 2 but read-only. Safety-critical information.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const db: any = createServerClient()

      // Find matching recipe
      const { data: recipes } = await db
        .from('recipes')
        .select('id, name')
        .eq('tenant_id', ctx.tenantId)
        .order('updated_at', { ascending: false })
        .limit(20)

      if (!recipes || recipes.length === 0) {
        return {
          preview: {
            actionType: 'agent.recipe_dietary_check',
            summary: 'No recipes found',
            fields: [],
            warnings: ['No recipes found. Create a recipe first.'],
            safety: 'reversible',
          },
          commitPayload: {},
        }
      }

      const q = description.toLowerCase()
      const match =
        recipes.find((r: any) => (r.name as string).toLowerCase().includes(q)) ?? recipes[0]

      return {
        preview: {
          actionType: 'agent.recipe_dietary_check',
          summary: `Dietary check for "${match.name}"`,
          fields: [{ label: 'Recipe', value: match.name as string }],
          safety: 'reversible',
        },
        commitPayload: { recipeId: match.id, recipeName: match.name },
      }
    },

    async commitAction(payload) {
      if (!payload.recipeId) return { success: false, message: 'No recipe selected.' }

      const { analyzeRecipeDietaryCompatibility } = await import('@/lib/recipes/actions')
      try {
        const result = await analyzeRecipeDietaryCompatibility(payload.recipeId as string)
        if (!result.success) return { success: false, message: result.error ?? 'Analysis failed.' }

        const lines: string[] = [`Dietary analysis for "${payload.recipeName}":`]
        if (result.compatible.length > 0) {
          lines.push(`Compatible: ${result.compatible.map((c) => c.label).join(', ')}`)
        }
        if (result.cautions.length > 0) {
          for (const c of result.cautions) {
            lines.push(`[CAUTION] ${c.label}: ${c.warnings.join('; ')}`)
          }
        }
        if (result.violations.length > 0) {
          for (const v of result.violations) {
            lines.push(`[ALERT] NOT ${v.label}: ${v.reasons.join('; ')}`)
          }
        }

        return { success: true, message: lines.join('\n') }
      } catch (err: any) {
        return { success: false, message: err.message ?? 'Failed to analyze recipe.' }
      }
    },
  },
]
