// Remy Agent - Inquiry Actions
// Create, update, transition, convert inquiries on the chef's behalf.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import {
  createInquiry,
  updateInquiry,
  transitionInquiry,
  convertInquiryToEvent,
  getInquiries,
} from '@/lib/inquiries/actions'
import { searchClientsByName } from '@/lib/clients/actions'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { z } from 'zod'

const ParsedInquirySchema = z.object({
  client_name: z.string().optional(),
  client_email: z.string().optional(),
  client_phone: z.string().optional(),
  event_date: z.string().optional(),
  guest_count: z.number().optional(),
  occasion: z.string().optional(),
  channel: z
    .enum([
      'text',
      'email',
      'instagram',
      'take_a_chef',
      'phone',
      'website',
      'referral',
      'walk_in',
      'other',
    ])
    .optional(),
  budget_range_min_cents: z.number().optional(),
  budget_range_max_cents: z.number().optional(),
  service_style: z.string().optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

async function parseInquiryFromNL(description: string) {
  const systemPrompt = `You extract structured inquiry/lead data from natural language.
Extract: client_name, client_email, client_phone, event_date (YYYY-MM-DD), guest_count, occasion, channel (text/email/instagram/take_a_chef/phone/website/referral/walk_in/other), budget_range_min_cents and budget_range_max_cents (dollars→cents), service_style, dietary_restrictions (array), notes.
Return ONLY valid JSON. Omit unmentioned fields.`

  return parseWithOllama(systemPrompt, description, ParsedInquirySchema, { modelTier: 'standard' })
}

export const inquiryAgentActions: AgentActionDefinition[] = [
  {
    taskType: 'agent.create_inquiry',
    name: 'Log Inquiry',
    tier: 2,
    safety: 'reversible',
    description:
      'Log a new inquiry/lead from any channel. Parses client info, event details, budget, and source.',
    inputSchema:
      '{ "description": "string - inquiry details, e.g. Got a text from Jane Doe (jane@mail.com) asking about a birthday dinner for 8 on April 5, budget $800-1200" }',
    tierNote: 'ALWAYS tier 2 - chef reviews before saving.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseInquiryFromNL(description)

      let clientId: string | null = null
      if (parsed.client_name) {
        const clients = await searchClientsByName(parsed.client_name)
        if (clients.length > 0) clientId = clients[0].id
      }

      const fields: AgentActionPreview['fields'] = []
      if (parsed.client_name)
        fields.push({ label: 'Client', value: parsed.client_name, editable: true })
      if (parsed.client_email)
        fields.push({ label: 'Email', value: parsed.client_email, editable: true })
      if (parsed.client_phone)
        fields.push({ label: 'Phone', value: parsed.client_phone, editable: true })
      if (parsed.channel) fields.push({ label: 'Channel', value: parsed.channel })
      if (parsed.occasion)
        fields.push({ label: 'Occasion', value: parsed.occasion, editable: true })
      if (parsed.event_date)
        fields.push({ label: 'Event Date', value: parsed.event_date, editable: true })
      if (parsed.guest_count)
        fields.push({ label: 'Guests', value: String(parsed.guest_count), editable: true })
      if (parsed.budget_range_min_cents || parsed.budget_range_max_cents) {
        const min = parsed.budget_range_min_cents
          ? `$${(parsed.budget_range_min_cents / 100).toFixed(0)}`
          : '?'
        const max = parsed.budget_range_max_cents
          ? `$${(parsed.budget_range_max_cents / 100).toFixed(0)}`
          : '?'
        fields.push({ label: 'Budget', value: `${min} – ${max}` })
      }
      if (parsed.dietary_restrictions?.length)
        fields.push({ label: 'Dietary', value: parsed.dietary_restrictions.join(', ') })
      if (parsed.notes) fields.push({ label: 'Notes', value: parsed.notes })

      const warnings: string[] = []
      if (!clientId && parsed.client_name)
        warnings.push(
          `Client "${parsed.client_name}" not found - will be stored as an unlinked lead.`
        )

      return {
        preview: {
          actionType: 'agent.create_inquiry',
          summary: `Log inquiry: ${parsed.occasion ?? 'New Lead'}${parsed.client_name ? ` from ${parsed.client_name}` : ''}`,
          fields,
          warnings: warnings.length > 0 ? warnings : undefined,
          safety: 'reversible',
        },
        commitPayload: { ...parsed, client_id: clientId, _rawDescription: description },
      }
    },

    async commitAction(payload) {
      const input: Record<string, unknown> = {
        channel: payload.channel ?? 'other',
        occasion: payload.occasion,
        event_date: payload.event_date,
        guest_count: payload.guest_count,
        budget_range_min_cents: payload.budget_range_min_cents,
        budget_range_max_cents: payload.budget_range_max_cents,
        notes: payload.notes ?? payload._rawDescription,
        dietary_restrictions: payload.dietary_restrictions,
      }
      if (payload.client_id) input.client_id = payload.client_id
      if (payload.client_name) input.lead_name = payload.client_name
      if (payload.client_email) input.lead_email = payload.client_email
      if (payload.client_phone) input.lead_phone = payload.client_phone

      const result = await createInquiry(input as Parameters<typeof createInquiry>[0])
      if ('error' in result) {
        return { success: false, message: `Failed to create inquiry: ${result.error}` }
      }
      const inquiryId = (result as { inquiry: { id: string } }).inquiry?.id
      return {
        success: true,
        message: 'Inquiry logged successfully!',
        redirectUrl: inquiryId ? `/inquiries/${inquiryId}` : '/inquiries',
      }
    },
  },

  {
    taskType: 'agent.transition_inquiry',
    name: 'Move Inquiry Forward',
    tier: 2,
    safety: 'significant',
    description:
      'Transition an inquiry to a new status (e.g., new → awaiting_client, quoted → confirmed).',
    inputSchema:
      '{ "inquiryIdentifier": "string - client name or occasion to find the inquiry", "toStatus": "string - target: awaiting_client, awaiting_chef, quoted, confirmed, declined, expired" }',
    tierNote: 'ALWAYS tier 2 - status changes require chef confirmation.',

    async executor(inputs, ctx) {
      const identifier = String(inputs.inquiryIdentifier ?? '').toLowerCase()
      const toStatus = String(inputs.toStatus ?? '')

      const inquiries = await getInquiries()
      const match = (inquiries ?? []).find((inq: Record<string, unknown>) => {
        const occasion = String(inq.occasion ?? '').toLowerCase()
        const clientName = String((inq as Record<string, unknown>).lead_name ?? '').toLowerCase()
        return occasion.includes(identifier) || clientName.includes(identifier)
      })

      if (!match) {
        return {
          preview: {
            actionType: 'agent.transition_inquiry',
            summary: `Could not find inquiry matching "${inputs.inquiryIdentifier}"`,
            fields: [{ label: 'Error', value: 'No matching inquiry found.' }],
            safety: 'significant' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.transition_inquiry',
          summary: `Move inquiry: ${(match as Record<string, unknown>).status} → ${toStatus}`,
          fields: [
            {
              label: 'Inquiry',
              value: String((match as Record<string, unknown>).occasion ?? 'Inquiry'),
            },
            { label: 'Current Status', value: String((match as Record<string, unknown>).status) },
            { label: 'New Status', value: toStatus },
          ],
          warnings: [`This will change the inquiry status to "${toStatus}".`],
          safety: 'significant',
        },
        commitPayload: { inquiryId: (match as Record<string, unknown>).id, toStatus },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Inquiry not found.' }
      const result = await transitionInquiry(
        String(payload.inquiryId),
        payload.toStatus as Parameters<typeof transitionInquiry>[1]
      )
      if ('error' in result)
        return { success: false, message: `Transition failed: ${result.error}` }
      return {
        success: true,
        message: `Inquiry moved to "${payload.toStatus}"!`,
        redirectUrl: `/inquiries/${payload.inquiryId}`,
      }
    },
  },

  {
    taskType: 'agent.convert_inquiry',
    name: 'Convert Inquiry to Event',
    tier: 2,
    safety: 'significant',
    description:
      'Convert a confirmed inquiry into a draft event. The inquiry must be in "confirmed" status.',
    inputSchema: '{ "inquiryIdentifier": "string - client name or occasion to find the inquiry" }',
    tierNote: 'ALWAYS tier 2 - creates a new event from the inquiry.',

    async executor(inputs) {
      const identifier = String(inputs.inquiryIdentifier ?? '').toLowerCase()
      const inquiries = await getInquiries({ status: 'confirmed' })
      const match = (inquiries ?? []).find((inq: Record<string, unknown>) => {
        const occasion = String(inq.occasion ?? '').toLowerCase()
        const clientName = String((inq as Record<string, unknown>).lead_name ?? '').toLowerCase()
        return occasion.includes(identifier) || clientName.includes(identifier)
      })

      if (!match) {
        return {
          preview: {
            actionType: 'agent.convert_inquiry',
            summary: 'No confirmed inquiry found to convert',
            fields: [
              {
                label: 'Error',
                value: `No confirmed inquiry matching "${inputs.inquiryIdentifier}". Only confirmed inquiries can be converted.`,
              },
            ],
            safety: 'significant' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.convert_inquiry',
          summary: `Convert inquiry to event: ${(match as Record<string, unknown>).occasion ?? 'Inquiry'}`,
          fields: [
            {
              label: 'Inquiry',
              value: String((match as Record<string, unknown>).occasion ?? 'Inquiry'),
            },
            { label: 'Status', value: 'confirmed' },
          ],
          warnings: ['This will create a new draft event from this inquiry.'],
          safety: 'significant',
        },
        commitPayload: { inquiryId: (match as Record<string, unknown>).id },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'No confirmed inquiry found.' }
      const result = await convertInquiryToEvent(String(payload.inquiryId))
      if ('error' in result)
        return { success: false, message: `Conversion failed: ${result.error}` }
      const eventId = (result as { event: { id: string } }).event?.id
      const wasSeries = Boolean((result as { series?: { id: string } }).series?.id)
      return {
        success: true,
        message: wasSeries
          ? 'Inquiry converted to draft multi-day series!'
          : 'Inquiry converted to draft event!',
        redirectUrl: eventId ? `/events/${eventId}` : '/events',
      }
    },
  },
]
