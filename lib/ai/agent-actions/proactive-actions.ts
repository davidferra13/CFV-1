// Remy Agent — Proactive "What's Next?" Actions
// Helps the chef figure out what to do next based on their current state.
// Also includes contingency contacts and document management.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { createEmergencyContact } from '@/lib/contingency/actions'
import { createFolder, searchDocuments } from '@/lib/ai/document-management-actions'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { z } from 'zod'

// ─── Action Definitions ──────────────────────────────────────────────────────

export const proactiveAgentActions: AgentActionDefinition[] = [
  // ─── What Should I Do Next? ──────────────────────────────────────────────
  {
    taskType: 'agent.whats_next',
    name: "What's Next?",
    tier: 2,
    safety: 'reversible',
    description:
      "Analyze the chef's current workload and suggest the most important next action. Looks at upcoming events, pending inquiries, overdue tasks, unpaid invoices, and incomplete debriefs.",
    inputSchema: '{ "context": "optional string — any specific area to focus on" }',
    tierNote: 'Tier 2 — presents recommendation, chef decides to act.',

    async executor(_inputs, ctx) {
      const supabase: any = createServerClient()
      const now = new Date().toISOString().slice(0, 10)

      // Gather data in parallel
      const [
        { data: upcomingEvents },
        { data: pendingInquiries },
        { data: overdueTodos },
        { data: recentCompleted },
      ] = await Promise.all([
        supabase
          .from('events')
          .select('id, occasion, event_date, status, client:clients(full_name)')
          .eq('tenant_id', ctx.tenantId)
          .gte('event_date', now)
          .not('status', 'in', '("cancelled","completed")')
          .order('event_date', { ascending: true })
          .limit(5),
        supabase
          .from('inquiries')
          .select('id, occasion, lead_name, status, created_at')
          .eq('tenant_id', ctx.tenantId)
          .in('status', ['new', 'awaiting_chef'])
          .order('created_at', { ascending: true })
          .limit(5),
        supabase
          .from('chef_todos')
          .select('id, title, due_date, priority')
          .eq('tenant_id', ctx.tenantId)
          .eq('status', 'pending')
          .lte('due_date', now)
          .order('due_date', { ascending: true })
          .limit(5),
        supabase
          .from('events')
          .select('id, occasion, event_date, status')
          .eq('tenant_id', ctx.tenantId)
          .eq('status', 'completed')
          .order('event_date', { ascending: false })
          .limit(3),
      ])

      // Build recommendation
      const suggestions: string[] = []
      const fields: AgentActionPreview['fields'] = []

      // Priority 1: Overdue tasks
      if (overdueTodos?.length) {
        const task = overdueTodos[0] as Record<string, unknown>
        suggestions.push(`Complete overdue task: "${task.title}" (due ${task.due_date})`)
        fields.push({
          label: 'Overdue Task',
          value: `${task.title} — due ${task.due_date}`,
        })
      }

      // Priority 2: Unanswered inquiries
      if (pendingInquiries?.length) {
        const inq = pendingInquiries[0] as Record<string, unknown>
        suggestions.push(
          `Respond to inquiry from ${inq.lead_name ?? 'unknown'}: ${inq.occasion ?? 'new lead'}`
        )
        fields.push({
          label: 'Pending Inquiry',
          value: `${inq.lead_name ?? 'Lead'} — ${inq.occasion ?? 'inquiry'}`,
        })
      }

      // Priority 3: Upcoming events needing prep
      if (upcomingEvents?.length) {
        const evt = upcomingEvents[0] as Record<string, unknown>
        const clientName = (evt.client as Record<string, unknown> | null)?.full_name ?? 'Client'
        suggestions.push(
          `Prep for upcoming event: ${evt.occasion} on ${evt.event_date} (${evt.status})`
        )
        fields.push({
          label: 'Next Event',
          value: `${evt.occasion} — ${evt.event_date} (${clientName})`,
        })
      }

      // Priority 4: Completed events needing debrief
      if (recentCompleted?.length) {
        const evt = recentCompleted[0] as Record<string, unknown>
        suggestions.push(`Debrief completed event: ${evt.occasion} (${evt.event_date})`)
        fields.push({
          label: 'Needs Debrief',
          value: `${evt.occasion} — ${evt.event_date}`,
        })
      }

      if (suggestions.length === 0) {
        suggestions.push(
          'All caught up! No urgent items. Consider marketing outreach or recipe development.'
        )
        fields.push({ label: 'Status', value: 'All clear — no urgent items right now.' })
      }

      const topSuggestion = suggestions[0]

      return {
        preview: {
          actionType: 'agent.whats_next',
          summary: topSuggestion,
          fields,
          safety: 'reversible',
        },
        commitPayload: { suggestions, _noAction: true },
      }
    },

    async commitAction(payload) {
      // This is informational — no write action needed
      const suggestions = payload.suggestions as string[]
      return {
        success: true,
        message: suggestions.join('\n• '),
      }
    },
  },

  // ─── Add Emergency Contact ───────────────────────────────────────────────
  {
    taskType: 'agent.add_emergency_contact',
    name: 'Add Emergency Contact',
    tier: 2,
    safety: 'reversible',
    description: 'Add an emergency contact for event contingency planning.',
    inputSchema:
      '{ "description": "string — e.g. Add backup sous chef Maria Garcia, 503-555-0123, available for emergencies" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: name, phone, email, role (e.g. backup_chef, plumber, electrician, venue_contact), notes. Return ONLY JSON.',
        description,
        z.object({
          name: z.string(),
          phone: z.string().optional(),
          email: z.string().optional(),
          role: z.string().optional(),
          notes: z.string().optional(),
        }),
        { modelTier: 'standard' }
      )

      const fields: AgentActionPreview['fields'] = [
        { label: 'Name', value: parsed.name, editable: true },
      ]
      if (parsed.role) fields.push({ label: 'Role', value: parsed.role })
      if (parsed.phone) fields.push({ label: 'Phone', value: parsed.phone })
      if (parsed.email) fields.push({ label: 'Email', value: parsed.email })
      if (parsed.notes) fields.push({ label: 'Notes', value: parsed.notes })

      return {
        preview: {
          actionType: 'agent.add_emergency_contact',
          summary: `Add emergency contact: ${parsed.name}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: parsed,
      }
    },

    async commitAction(payload) {
      try {
        await createEmergencyContact({
          name: String(payload.name),
          phone: payload.phone as string | undefined,
          email: payload.email as string | undefined,
          role: payload.role as string | undefined,
          notes: payload.notes as string | undefined,
        } as Parameters<typeof createEmergencyContact>[0])
        return { success: true, message: `Emergency contact "${payload.name}" added!` }
      } catch (err) {
        return {
          success: false,
          message: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }
      }
    },
  },

  // ─── Create Document Folder ──────────────────────────────────────────────
  {
    taskType: 'agent.create_doc_folder',
    name: 'Create Document Folder',
    tier: 2,
    safety: 'reversible',
    description: 'Create a new folder for organizing documents (contracts, recipes, photos, etc.).',
    inputSchema: '{ "name": "string — folder name, e.g. 2026 Contracts" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const name = String(inputs.name ?? inputs.description ?? '')

      return {
        preview: {
          actionType: 'agent.create_doc_folder',
          summary: `Create folder: ${name}`,
          fields: [{ label: 'Folder Name', value: name, editable: true }],
          safety: 'reversible',
        },
        commitPayload: { name },
      }
    },

    async commitAction(payload) {
      const result = await createFolder(String(payload.name))
      if ('error' in result && result.error)
        return { success: false, message: `Failed: ${result.error}` }
      return { success: true, message: `Folder "${payload.name}" created!` }
    },
  },

  // ─── Search Documents ────────────────────────────────────────────────────
  {
    taskType: 'agent.search_documents',
    name: 'Search Documents',
    tier: 2,
    safety: 'reversible',
    description: 'Search through your documents by keyword.',
    inputSchema: '{ "query": "string — search term" }',
    tierNote: 'Tier 2 — shows results for chef review.',

    async executor(inputs) {
      const query = String(inputs.query ?? inputs.description ?? '')

      return {
        preview: {
          actionType: 'agent.search_documents',
          summary: `Search documents: "${query}"`,
          fields: [{ label: 'Search', value: query }],
          safety: 'reversible',
        },
        commitPayload: { query },
      }
    },

    async commitAction(payload) {
      try {
        const results = await searchDocuments(String(payload.query))
        if (!results || (results as unknown[]).length === 0) {
          return { success: true, message: `No documents found matching "${payload.query}".` }
        }
        const count = (results as unknown[]).length
        return { success: true, message: `Found ${count} document(s) matching "${payload.query}".` }
      } catch (err) {
        return {
          success: false,
          message: `Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }
      }
    },
  },
]
