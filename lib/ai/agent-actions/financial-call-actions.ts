// Remy Agent — Financial & Call Actions
// Update/delete expenses, log call outcomes, cancel calls.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { updateExpense, deleteExpense } from '@/lib/expenses/actions'
import { logCallOutcome, cancelCall, getUpcomingCalls } from '@/lib/calls/actions'
import { updateInquiry, declineInquiry } from '@/lib/inquiries/actions'
import { getInquiries } from '@/lib/inquiries/actions'
import { createServerClient } from '@/lib/supabase/server'
import { dispatchPrivate } from '@/lib/ai/dispatch'
import { z } from 'zod'

// ─── Action Definitions ──────────────────────────────────────────────────────

export const financialCallAgentActions: AgentActionDefinition[] = [
  // ─── Update Expense ──────────────────────────────────────────────────────
  {
    taskType: 'agent.update_expense',
    name: 'Update Expense',
    tier: 2,
    safety: 'reversible',
    description: 'Update an existing expense (fix amount, vendor, category, etc.).',
    inputSchema: '{ "description": "string — e.g. Change the Whole Foods expense to $92.50" }',
    tierNote: 'ALWAYS tier 2 — financial data requires chef confirmation.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const parsed = (
        await dispatchPrivate(
          'Extract: expenseIdentifier (description or vendor to find), updates: { description?, amount_cents? (dollars→cents), category?, vendor?, expense_date?, notes? }. Return ONLY JSON.',
          description,
          z.object({
            expenseIdentifier: z.string(),
            updates: z.record(z.string(), z.unknown()),
          }),
          { modelTier: 'standard' }
        )
      ).result

      // Find the expense
      const supabase: any = createServerClient()
      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, description, amount_cents, vendor, category, expense_date')
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
        .limit(30)

      const lower = parsed.expenseIdentifier.toLowerCase()
      const match = (expenses ?? []).find((e: Record<string, unknown>) => {
        const desc = String(e.description ?? '').toLowerCase()
        const vendor = String(e.vendor ?? '').toLowerCase()
        return desc.includes(lower) || vendor.includes(lower) || lower.includes(desc)
      })

      if (!match) {
        return {
          preview: {
            actionType: 'agent.update_expense',
            summary: `Expense "${parsed.expenseIdentifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching expense found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const fields: AgentActionPreview['fields'] = [
        {
          label: 'Expense',
          value: `${match.description} — $${((match.amount_cents as number) / 100).toFixed(2)}`,
        },
      ]
      for (const [key, val] of Object.entries(parsed.updates)) {
        if (val !== undefined) {
          const displayVal =
            key === 'amount_cents' ? `$${(Number(val) / 100).toFixed(2)}` : String(val)
          fields.push({
            label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            value: displayVal,
            editable: true,
          })
        }
      }

      return {
        preview: {
          actionType: 'agent.update_expense',
          summary: `Update expense: ${match.description}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: { expenseId: match.id, updates: parsed.updates },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Expense not found.' }
      const result = await updateExpense(
        String(payload.expenseId),
        payload.updates as Record<string, unknown>
      )
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return { success: true, message: 'Expense updated!' }
    },
  },

  // ─── Log Call Outcome ────────────────────────────────────────────────────
  {
    taskType: 'agent.log_call_outcome',
    name: 'Log Call Outcome',
    tier: 2,
    safety: 'reversible',
    description: 'Record the outcome of a completed call — notes, next steps, client sentiment.',
    inputSchema:
      '{ "description": "string — e.g. Call with Sarah went well, she wants a tasting next Thursday, very interested" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = (
        await dispatchPrivate(
          'Extract: callIdentifier (client name or call title to find), outcome_notes (what happened), next_steps (follow-up actions), sentiment (positive/neutral/negative). Return ONLY JSON.',
          description,
          z.object({
            callIdentifier: z.string(),
            outcome_notes: z.string(),
            next_steps: z.string().optional(),
            sentiment: z.string().optional(),
          }),
          { modelTier: 'standard' }
        )
      ).result

      // Find the call
      const calls = await getUpcomingCalls(20)
      const lower = parsed.callIdentifier.toLowerCase()
      const match = (calls ?? []).find((c: any) => {
        const title = String(c.title ?? '').toLowerCase()
        return title.includes(lower) || lower.includes(title)
      })

      if (!match) {
        return {
          preview: {
            actionType: 'agent.log_call_outcome',
            summary: `Call "${parsed.callIdentifier}" not found`,
            fields: [
              {
                label: 'Error',
                value: 'No matching call found. Make sure the call is scheduled first.',
              },
            ],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const fields: AgentActionPreview['fields'] = [
        { label: 'Call', value: String((match as any).title) },
        { label: 'Notes', value: parsed.outcome_notes, editable: true },
      ]
      if (parsed.next_steps) fields.push({ label: 'Next Steps', value: parsed.next_steps })
      if (parsed.sentiment) fields.push({ label: 'Sentiment', value: parsed.sentiment })

      return {
        preview: {
          actionType: 'agent.log_call_outcome',
          summary: `Log outcome: ${(match as any).title}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: {
          callId: (match as any).id,
          outcome_notes: parsed.outcome_notes,
          next_steps: parsed.next_steps,
          sentiment: parsed.sentiment,
        },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Call not found.' }
      const result = await logCallOutcome(String(payload.callId), {
        outcome_notes: String(payload.outcome_notes),
        next_steps: payload.next_steps as string | undefined,
        sentiment: payload.sentiment as string | undefined,
      } as Parameters<typeof logCallOutcome>[1])
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return { success: true, message: 'Call outcome logged!' }
    },
  },

  // ─── Cancel Call ─────────────────────────────────────────────────────────
  {
    taskType: 'agent.cancel_call',
    name: 'Cancel Call',
    tier: 2,
    safety: 'reversible',
    description: 'Cancel a scheduled call.',
    inputSchema: '{ "callIdentifier": "string — client name or call title to find" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const identifier = String(inputs.callIdentifier ?? inputs.description ?? '').toLowerCase()
      const calls = await getUpcomingCalls(20)
      const match = (calls ?? []).find((c: any) => {
        const title = String(c.title ?? '').toLowerCase()
        return title.includes(identifier) || identifier.includes(title)
      })

      if (!match) {
        return {
          preview: {
            actionType: 'agent.cancel_call',
            summary: `Call "${inputs.callIdentifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching call found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.cancel_call',
          summary: `Cancel call: ${(match as any).title}`,
          fields: [{ label: 'Call', value: String((match as any).title) }],
          warnings: ['This will cancel the scheduled call.'],
          safety: 'reversible',
        },
        commitPayload: { callId: (match as any).id },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Call not found.' }
      const result = await cancelCall(String(payload.callId))
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return { success: true, message: 'Call cancelled.' }
    },
  },

  // ─── Decline Inquiry ─────────────────────────────────────────────────────
  {
    taskType: 'agent.decline_inquiry',
    name: 'Decline Inquiry',
    tier: 2,
    safety: 'significant',
    description:
      'Decline/pass on an inquiry. Optionally provide a reason (out of area, schedule conflict, etc.).',
    inputSchema:
      '{ "description": "string — e.g. Decline the Smith birthday inquiry — we\'re fully booked that weekend" }',
    tierNote: 'ALWAYS tier 2 — declining affects client relationship.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = (
        await dispatchPrivate(
          'Extract: inquiryIdentifier (occasion or client name), reason (why declining, optional). Return ONLY JSON.',
          description,
          z.object({ inquiryIdentifier: z.string(), reason: z.string().optional() }),
          { modelTier: 'standard' }
        )
      ).result

      const inquiries = await getInquiries()
      const lower = parsed.inquiryIdentifier.toLowerCase()
      const match = (inquiries ?? []).find((inq: Record<string, unknown>) => {
        const occ = String(inq.occasion ?? '').toLowerCase()
        const name = String(inq.lead_name ?? '').toLowerCase()
        return occ.includes(lower) || name.includes(lower)
      })

      if (!match) {
        return {
          preview: {
            actionType: 'agent.decline_inquiry',
            summary: `Inquiry "${parsed.inquiryIdentifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching inquiry found.' }],
            safety: 'significant' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const fields: AgentActionPreview['fields'] = [
        {
          label: 'Inquiry',
          value: String((match as any).occasion ?? 'Inquiry'),
        },
      ]
      if (parsed.reason) fields.push({ label: 'Reason', value: parsed.reason })

      return {
        preview: {
          actionType: 'agent.decline_inquiry',
          summary: `Decline inquiry: ${(match as any).occasion ?? 'Inquiry'}`,
          fields,
          warnings: ['This will mark the inquiry as declined.'],
          safety: 'significant',
        },
        commitPayload: { inquiryId: (match as any).id, reason: parsed.reason },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Inquiry not found.' }
      const result = await declineInquiry(
        String(payload.inquiryId),
        payload.reason as string | undefined
      )
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return { success: true, message: 'Inquiry declined.' }
    },
  },

  // ─── Update Inquiry ──────────────────────────────────────────────────────
  {
    taskType: 'agent.update_inquiry',
    name: 'Update Inquiry',
    tier: 2,
    safety: 'reversible',
    description: 'Update details on an existing inquiry (guest count, date, budget, notes).',
    inputSchema:
      '{ "description": "string — e.g. Update the Smith birthday inquiry to 20 guests and move date to April 10" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = (
        await dispatchPrivate(
          'Extract: inquiryIdentifier (occasion or client name), updates (guest_count, event_date YYYY-MM-DD, occasion, notes, budget_range_min_cents, budget_range_max_cents). Return JSON with "inquiryIdentifier" and "updates".',
          description,
          z.object({
            inquiryIdentifier: z.string(),
            updates: z.record(z.string(), z.unknown()),
          }),
          { modelTier: 'standard' }
        )
      ).result

      const inquiries = await getInquiries()
      const lower = parsed.inquiryIdentifier.toLowerCase()
      const match = (inquiries ?? []).find((inq: Record<string, unknown>) => {
        const occ = String(inq.occasion ?? '').toLowerCase()
        const name = String(inq.lead_name ?? '').toLowerCase()
        return occ.includes(lower) || name.includes(lower)
      })

      if (!match) {
        return {
          preview: {
            actionType: 'agent.update_inquiry',
            summary: `Inquiry "${parsed.inquiryIdentifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching inquiry found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const fields: AgentActionPreview['fields'] = [
        {
          label: 'Inquiry',
          value: String((match as any).occasion ?? 'Inquiry'),
        },
      ]
      for (const [key, val] of Object.entries(parsed.updates)) {
        if (val !== undefined) {
          const displayVal = key.includes('cents')
            ? `$${(Number(val) / 100).toFixed(0)}`
            : String(val)
          fields.push({
            label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            value: displayVal,
            editable: true,
          })
        }
      }

      return {
        preview: {
          actionType: 'agent.update_inquiry',
          summary: `Update inquiry: ${(match as any).occasion ?? 'Inquiry'}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: {
          inquiryId: (match as any).id,
          updates: parsed.updates,
        },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Inquiry not found.' }
      const result = await updateInquiry(
        String(payload.inquiryId),
        payload.updates as Record<string, unknown>
      )
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return {
        success: true,
        message: 'Inquiry updated!',
        redirectUrl: `/inquiries/${payload.inquiryId}`,
      }
    },
  },
]
