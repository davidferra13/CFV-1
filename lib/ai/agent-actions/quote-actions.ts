// Remy Agent - Quote Actions
// Create and transition quotes on the chef's behalf.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { createQuote, transitionQuote, getQuotes } from '@/lib/quotes/actions'
import { searchClientsByName } from '@/lib/clients/actions'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { z } from 'zod'

function localDateISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

const ParsedQuoteSchema = z.object({
  client_name: z.string(),
  quote_name: z.string().optional(),
  pricing_model: z.enum(['per_person', 'flat_rate', 'custom']).optional(),
  total_quoted_cents: z.number().optional(),
  price_per_person_cents: z.number().optional(),
  guest_count_estimated: z.number().optional(),
  deposit_percent: z.number().optional(),
  valid_days: z.number().optional(),
  pricing_notes: z.string().optional(),
})

async function parseQuoteFromNL(description: string) {
  const systemPrompt = `You extract quote/pricing data from natural language.
Extract: client_name, quote_name (short title), pricing_model (per_person/flat_rate/custom), total_quoted_cents (convert dollars to cents), price_per_person_cents, guest_count_estimated, deposit_percent (e.g. 50 for 50%), valid_days (how many days the quote is valid), pricing_notes.
Return ONLY valid JSON. Omit unmentioned fields.`

  return parseWithOllama(systemPrompt, description, ParsedQuoteSchema, { modelTier: 'standard' })
}

export const quoteAgentActions: AgentActionDefinition[] = [
  {
    taskType: 'agent.create_quote',
    name: 'Create Quote',
    tier: 2,
    safety: 'reversible',
    description:
      'Create a pricing quote for a client. Extracts pricing model, total, deposit, and validity.',
    inputSchema:
      '{ "description": "string - quote details, e.g. Quote for Sarah Johnson, flat rate $2500, 50% deposit, valid 14 days" }',
    tierNote: 'ALWAYS tier 2 - chef reviews pricing before saving.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseQuoteFromNL(description)

      let clientId: string | null = null
      const clients = await searchClientsByName(parsed.client_name)
      if (clients.length > 0) clientId = clients[0].id

      const fields: AgentActionPreview['fields'] = [{ label: 'Client', value: parsed.client_name }]
      if (parsed.quote_name)
        fields.push({ label: 'Quote Name', value: parsed.quote_name, editable: true })
      if (parsed.pricing_model)
        fields.push({ label: 'Pricing Model', value: parsed.pricing_model.replace(/_/g, ' ') })
      if (parsed.total_quoted_cents)
        fields.push({
          label: 'Total',
          value: `$${(parsed.total_quoted_cents / 100).toFixed(2)}`,
          editable: true,
        })
      if (parsed.price_per_person_cents)
        fields.push({
          label: 'Per Person',
          value: `$${(parsed.price_per_person_cents / 100).toFixed(2)}`,
        })
      if (parsed.guest_count_estimated)
        fields.push({ label: 'Estimated Guests', value: String(parsed.guest_count_estimated) })
      if (parsed.deposit_percent)
        fields.push({ label: 'Deposit', value: `${parsed.deposit_percent}%` })
      if (parsed.valid_days) fields.push({ label: 'Valid For', value: `${parsed.valid_days} days` })
      if (parsed.pricing_notes) fields.push({ label: 'Notes', value: parsed.pricing_notes })

      const warnings: string[] = []
      if (!clientId)
        warnings.push(`Client "${parsed.client_name}" not found - please create the client first.`)

      return {
        preview: {
          actionType: 'agent.create_quote',
          summary: `Create quote: ${parsed.quote_name ?? 'Quote'} for ${parsed.client_name}`,
          fields,
          warnings: warnings.length > 0 ? warnings : undefined,
          safety: 'reversible',
        },
        commitPayload: { ...parsed, client_id: clientId },
      }
    },

    async commitAction(payload) {
      if (!payload.client_id)
        return { success: false, message: 'Client not found - create the client first.' }

      const _now = new Date()
      const validDays = (payload.valid_days as number) ?? 14
      const validUntil = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate() + validDays)

      const depositCents =
        payload.deposit_percent && payload.total_quoted_cents
          ? Math.round(
              ((payload.deposit_percent as number) / 100) * (payload.total_quoted_cents as number)
            )
          : undefined

      const result = await createQuote({
        client_id: String(payload.client_id),
        quote_name: (payload.quote_name as string) ?? 'Quote',
        pricing_model:
          (payload.pricing_model as 'per_person' | 'flat_rate' | 'custom') ?? 'flat_rate',
        total_quoted_cents: (payload.total_quoted_cents as number) ?? 0,
        price_per_person_cents: payload.price_per_person_cents as number | undefined,
        guest_count_estimated: payload.guest_count_estimated as number | undefined,
        deposit_amount_cents: depositCents,
        valid_until: localDateISO(validUntil),
        pricing_notes: payload.pricing_notes as string | undefined,
      })
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      const quoteId = (result as { quote: { id: string } }).quote?.id
      return {
        success: true,
        message: 'Quote created!',
        redirectUrl: quoteId ? `/quotes/${quoteId}` : '/quotes',
      }
    },
  },

  {
    taskType: 'agent.transition_quote',
    name: 'Move Quote Forward',
    tier: 2,
    safety: 'significant',
    description: 'Transition a quote to a chef-managed status (draft -> sent, sent -> expired).',
    inputSchema:
      '{ "quoteIdentifier": "string - quote name or client name", "toStatus": "string - target: sent or expired" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const identifier = String(inputs.quoteIdentifier ?? '').toLowerCase()
      const toStatus = String(inputs.toStatus ?? '')

      if (!['sent', 'expired'].includes(toStatus)) {
        return {
          preview: {
            actionType: 'agent.transition_quote',
            summary: 'Unsupported quote transition target',
            fields: [
              { label: 'Requested Status', value: toStatus || '(empty)' },
              { label: 'Allowed', value: 'sent, expired' },
            ],
            warnings: ['Use client portal response for accepted/rejected decisions.'],
            safety: 'significant' as const,
          },
          commitPayload: { _error: true, errorMessage: 'Invalid status target' },
        }
      }

      const quotes = await getQuotes({})
      const match = (quotes ?? []).find((q: Record<string, unknown>) => {
        const name = String(q.quote_name ?? '').toLowerCase()
        return name.includes(identifier) || identifier.includes(name)
      })

      if (!match) {
        return {
          preview: {
            actionType: 'agent.transition_quote',
            summary: `Quote "${inputs.quoteIdentifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching quote found.' }],
            safety: 'significant' as const,
          },
          commitPayload: { _error: true, errorMessage: 'Quote not found.' },
        }
      }

      return {
        preview: {
          actionType: 'agent.transition_quote',
          summary: `Move quote: ${(match as Record<string, unknown>).status} -> ${toStatus}`,
          fields: [
            {
              label: 'Quote',
              value: String((match as Record<string, unknown>).quote_name ?? 'Quote'),
            },
            { label: 'Current Status', value: String((match as Record<string, unknown>).status) },
            { label: 'New Status', value: toStatus },
          ],
          warnings: [`This will change the quote status to "${toStatus}".`],
          safety: 'significant',
        },
        commitPayload: { quoteId: (match as Record<string, unknown>).id, toStatus },
      }
    },

    async commitAction(payload) {
      if (payload._error) {
        const message =
          typeof payload.errorMessage === 'string' ? payload.errorMessage : 'Quote not found.'
        return { success: false, message }
      }

      const result = await transitionQuote(
        String(payload.quoteId),
        payload.toStatus as Parameters<typeof transitionQuote>[1]
      )
      if ('error' in result)
        return { success: false, message: `Transition failed: ${result.error}` }
      return {
        success: true,
        message: `Quote moved to "${payload.toStatus}"!`,
        redirectUrl: `/quotes/${payload.quoteId}`,
      }
    },
  },
]
