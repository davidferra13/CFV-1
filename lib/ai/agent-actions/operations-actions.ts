// Remy Agent — Operations Actions
// Schedule calls, create todos, log expenses on the chef's behalf.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { searchClientsByName } from '@/lib/clients/actions'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { z } from 'zod'

// ─── Schedule Call ──────────────────────────────────────────────────────────

const ParsedCallSchema = z.object({
  client_name: z.string(),
  title: z.string().optional(),
  call_type: z.string().optional(),
  scheduled_date: z.string().optional(),
  scheduled_time: z.string().optional(),
  duration_minutes: z.number().optional(),
  notes: z.string().optional(),
})

async function parseCallFromNL(description: string) {
  const systemPrompt = `Extract call/meeting data: client_name, title, call_type (phone/video/in_person), scheduled_date (YYYY-MM-DD), scheduled_time (HH:MM 24h), duration_minutes, notes.
Return ONLY valid JSON. Omit unmentioned fields.`

  return parseWithOllama(systemPrompt, description, ParsedCallSchema, { modelTier: 'standard' })
}

// ─── Create Todo ────────────────────────────────────────────────────────────

const ParsedTodoSchema = z.object({
  title: z.string(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  notes: z.string().optional(),
})

async function parseTodoFromNL(description: string) {
  const systemPrompt = `Extract todo/task data: title (short), due_date (YYYY-MM-DD), priority (low/medium/high/urgent), notes.
Return ONLY valid JSON. Omit unmentioned fields.`

  return parseWithOllama(systemPrompt, description, ParsedTodoSchema, { modelTier: 'standard' })
}

// ─── Log Expense ────────────────────────────────────────────────────────────

const ParsedExpenseSchema = z.object({
  description: z.string(),
  amount_cents: z.number(),
  category: z.string().optional(),
  vendor: z.string().optional(),
  date: z.string().optional(),
  event_identifier: z.string().optional(),
  notes: z.string().optional(),
})

async function parseExpenseFromNL(description: string) {
  const systemPrompt = `Extract expense data: description, amount_cents (convert dollars to cents, e.g. $45.50 → 4550), category (groceries/equipment/travel/supplies/labor/venue/other), vendor, date (YYYY-MM-DD), event_identifier (event name if expense is for a specific event), notes.
Return ONLY valid JSON. Omit unmentioned fields.`

  return parseWithOllama(systemPrompt, description, ParsedExpenseSchema, { modelTier: 'standard' })
}

export const operationsAgentActions: AgentActionDefinition[] = [
  {
    taskType: 'agent.schedule_call',
    name: 'Schedule Call',
    tier: 2,
    safety: 'reversible',
    description: 'Schedule a call or consultation with a client.',
    inputSchema:
      '{ "description": "string — e.g. Phone call with Sarah Johnson tomorrow at 2pm, 30 minutes, discuss menu options" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseCallFromNL(description)

      let clientId: string | null = null
      if (parsed.client_name) {
        const clients = await searchClientsByName(parsed.client_name)
        if (clients.length > 0) clientId = clients[0].id
      }

      const fields: AgentActionPreview['fields'] = [{ label: 'Client', value: parsed.client_name }]
      if (parsed.title) fields.push({ label: 'Title', value: parsed.title, editable: true })
      if (parsed.call_type) fields.push({ label: 'Type', value: parsed.call_type })
      if (parsed.scheduled_date)
        fields.push({ label: 'Date', value: parsed.scheduled_date, editable: true })
      if (parsed.scheduled_time)
        fields.push({ label: 'Time', value: parsed.scheduled_time, editable: true })
      if (parsed.duration_minutes)
        fields.push({ label: 'Duration', value: `${parsed.duration_minutes} min` })
      if (parsed.notes) fields.push({ label: 'Notes', value: parsed.notes })

      const warnings = !clientId ? [`Client "${parsed.client_name}" not found.`] : undefined

      return {
        preview: {
          actionType: 'agent.schedule_call',
          summary: `Schedule call with ${parsed.client_name}`,
          fields,
          warnings,
          safety: 'reversible',
        },
        commitPayload: { ...parsed, client_id: clientId },
      }
    },

    async commitAction(payload) {
      if (!payload.client_id)
        return { success: false, message: 'Client not found — create client first.' }

      const scheduledAt =
        payload.scheduled_date && payload.scheduled_time
          ? `${payload.scheduled_date}T${payload.scheduled_time}:00`
          : new Date().toISOString()

      const supabase: any = createServerClient()
      const { data, error } = await supabase
        .from('scheduled_calls')
        .insert({
          tenant_id: (await (await import('@/lib/auth/get-user')).requireChef()).tenantId,
          client_id: payload.client_id,
          title: payload.title ?? `Call with ${payload.client_name}`,
          call_type: payload.call_type ?? 'phone',
          scheduled_at: scheduledAt,
          duration_minutes: payload.duration_minutes ?? 30,
          notes: payload.notes ?? null,
          status: 'scheduled',
        })
        .select('id')
        .single()

      if (error) return { success: false, message: `Failed: ${error.message}` }
      return {
        success: true,
        message: `Call with ${payload.client_name} scheduled!`,
        redirectUrl: '/calendar',
      }
    },
  },

  {
    taskType: 'agent.create_todo',
    name: 'Create Todo',
    tier: 2,
    safety: 'reversible',
    description: 'Create a task/todo item for the chef.',
    inputSchema:
      '{ "description": "string — e.g. Order extra plates for the Johnson event by Friday, high priority" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseTodoFromNL(description)

      const fields: AgentActionPreview['fields'] = [
        { label: 'Title', value: parsed.title, editable: true },
      ]
      if (parsed.due_date)
        fields.push({ label: 'Due Date', value: parsed.due_date, editable: true })
      if (parsed.priority) fields.push({ label: 'Priority', value: parsed.priority })
      if (parsed.notes) fields.push({ label: 'Notes', value: parsed.notes })

      return {
        preview: {
          actionType: 'agent.create_todo',
          summary: `Create todo: ${parsed.title}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: parsed,
      }
    },

    async commitAction(payload) {
      const supabase: any = createServerClient()
      const user = await (await import('@/lib/auth/get-user')).requireChef()
      const { error } = await supabase.from('chef_todos').insert({
        tenant_id: user.tenantId,
        title: payload.title,
        due_date: payload.due_date ?? null,
        priority: payload.priority ?? 'medium',
        notes: payload.notes ?? null,
        status: 'pending',
      })

      if (error) return { success: false, message: `Failed: ${error.message}` }
      return { success: true, message: `Todo "${payload.title}" created!` }
    },
  },

  {
    taskType: 'agent.log_expense',
    name: 'Log Expense',
    tier: 2,
    safety: 'reversible',
    description: 'Log a business expense (groceries, equipment, supplies, etc.).',
    inputSchema:
      '{ "description": "string — e.g. $85 at Whole Foods for the Johnson dinner groceries" }',
    tierNote: 'ALWAYS tier 2 — chef reviews amount and category.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseExpenseFromNL(description)

      const fields: AgentActionPreview['fields'] = [
        { label: 'Description', value: parsed.description, editable: true },
        { label: 'Amount', value: `$${(parsed.amount_cents / 100).toFixed(2)}`, editable: true },
      ]
      if (parsed.category) fields.push({ label: 'Category', value: parsed.category })
      if (parsed.vendor) fields.push({ label: 'Vendor', value: parsed.vendor, editable: true })
      if (parsed.date) fields.push({ label: 'Date', value: parsed.date, editable: true })
      if (parsed.event_identifier)
        fields.push({ label: 'For Event', value: parsed.event_identifier })

      return {
        preview: {
          actionType: 'agent.log_expense',
          summary: `Log expense: $${(parsed.amount_cents / 100).toFixed(2)} — ${parsed.description}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: parsed,
      }
    },

    async commitAction(payload) {
      const supabase: any = createServerClient()
      const user = await (await import('@/lib/auth/get-user')).requireChef()
      const { error } = await supabase.from('expenses').insert({
        tenant_id: user.tenantId,
        description: payload.description,
        amount_cents: payload.amount_cents,
        category: payload.category ?? 'other',
        vendor: payload.vendor ?? null,
        expense_date: payload.date ?? new Date().toISOString().slice(0, 10),
        notes: payload.notes ?? null,
      })

      if (error) return { success: false, message: `Failed: ${error.message}` }
      return {
        success: true,
        message: `Expense of $${((payload.amount_cents as number) / 100).toFixed(2)} logged!`,
      }
    },
  },
]
