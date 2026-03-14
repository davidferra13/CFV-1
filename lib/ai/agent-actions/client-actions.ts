// Remy Agent — Client Actions
// Create, update, invite clients on the chef's behalf.

import type { AgentActionDefinition, AgentActionContext } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import {
  searchClientsByName,
  createClient,
  updateClient,
  getClientById,
  inviteClient,
} from '@/lib/clients/actions'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { z } from 'zod'

// ─── NL → Structured Client Parser ────────────────────────────────────────

const ParsedClientSchema = z.object({
  full_name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  occupation: z.string().optional(),
  notes: z.string().optional(),
  address: z.string().optional(),
  preferred_contact_method: z.enum(['phone', 'email', 'text', 'instagram']).optional(),
})

async function parseClientFromText(description: string) {
  const systemPrompt = `You extract structured client data from natural language descriptions.
Extract any of these fields: full_name, email, phone, dietary_restrictions (array), allergies (array), occupation, notes, address, preferred_contact_method (phone/email/text/instagram).
Return ONLY valid JSON. If a field is not mentioned, omit it.`

  return parseWithOllama(systemPrompt, description, ParsedClientSchema, { modelTier: 'standard' })
}

// ─── NL → Client Update Parser ─────────────────────────────────────────────

const ParsedClientUpdateSchema = z.object({
  clientName: z.string(),
  updates: z.object({
    full_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    dietary_restrictions: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    occupation: z.string().optional(),
    status: z.enum(['active', 'dormant', 'repeat_ready', 'vip']).optional(),
    address: z.string().optional(),
    preferred_contact_method: z.enum(['phone', 'email', 'text', 'instagram']).optional(),
    dislikes: z.array(z.string()).optional(),
    favorite_cuisines: z.array(z.string()).optional(),
    favorite_dishes: z.array(z.string()).optional(),
    wine_beverage_preferences: z.string().optional(),
    spice_tolerance: z.enum(['none', 'mild', 'medium', 'hot', 'very_hot']).optional(),
  }),
})

async function parseClientUpdateFromText(description: string) {
  const systemPrompt = `You extract a client name and the fields to update from a natural language description.
Return JSON with "clientName" (the client to update) and "updates" (object with fields to change).
Available update fields: full_name, email, phone, dietary_restrictions (array), allergies (array), occupation, status (active/dormant/repeat_ready/vip), address, preferred_contact_method, dislikes (array), favorite_cuisines (array), favorite_dishes (array), wine_beverage_preferences, spice_tolerance (none/mild/medium/hot/very_hot).
Return ONLY valid JSON. Only include fields that are being changed.`

  return parseWithOllama(systemPrompt, description, ParsedClientUpdateSchema, {
    modelTier: 'standard',
  })
}

// ─── Action Definitions ────────────────────────────────────────────────────

export const clientAgentActions: AgentActionDefinition[] = [
  {
    taskType: 'agent.create_client',
    name: 'Create Client',
    tier: 2,
    safety: 'reversible',
    description:
      'Create a new client from a natural language description. Extracts name, email, phone, dietary info, and more.',
    inputSchema:
      '{ "description": "string — natural language description of the new client, e.g. Sarah Johnson, email sarah@example.com, gluten free, lives in Portland" }',
    tierNote: 'ALWAYS tier 2 — chef must review client details before saving.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseClientFromText(description)

      const fields: AgentActionPreview['fields'] = [
        { label: 'Full Name', value: parsed.full_name, editable: true },
      ]
      if (parsed.email) fields.push({ label: 'Email', value: parsed.email, editable: true })
      if (parsed.phone) fields.push({ label: 'Phone', value: parsed.phone, editable: true })
      if (parsed.dietary_restrictions?.length) {
        fields.push({
          label: 'Dietary Restrictions',
          value: parsed.dietary_restrictions.join(', '),
          editable: true,
        })
      }
      if (parsed.allergies?.length) {
        fields.push({ label: 'Allergies', value: parsed.allergies.join(', '), editable: true })
      }
      if (parsed.occupation)
        fields.push({ label: 'Occupation', value: parsed.occupation, editable: true })
      if (parsed.address) fields.push({ label: 'Address', value: parsed.address, editable: true })
      if (parsed.preferred_contact_method) {
        fields.push({
          label: 'Preferred Contact',
          value: parsed.preferred_contact_method,
          editable: true,
        })
      }
      if (parsed.notes) fields.push({ label: 'Notes', value: parsed.notes, editable: true })

      const preview: AgentActionPreview = {
        actionType: 'agent.create_client',
        summary: `Create client: ${parsed.full_name}${parsed.email ? ` (${parsed.email})` : ''}`,
        fields,
        safety: 'reversible',
      }

      return {
        preview,
        commitPayload: { ...parsed, _rawDescription: description },
      }
    },

    async commitAction(payload) {
      const result = await createClient({
        full_name: String(payload.full_name ?? ''),
        email: String(payload.email ?? ''),
        phone: payload.phone ? String(payload.phone) : undefined,
        dietary_restrictions: payload.dietary_restrictions as string[] | undefined,
        allergies: payload.allergies as string[] | undefined,
        occupation: payload.occupation ? String(payload.occupation) : undefined,
        address: payload.address ? String(payload.address) : undefined,
        preferred_contact_method: payload.preferred_contact_method as
          | 'phone'
          | 'email'
          | 'text'
          | 'instagram'
          | undefined,
      })

      if ('error' in result) {
        return { success: false, message: `Failed to create client: ${result.error}` }
      }
      const clientId = (result as { client: { id: string } }).client?.id
      return {
        success: true,
        message: `Client "${payload.full_name}" created successfully!`,
        redirectUrl: clientId ? `/clients/${clientId}` : '/clients',
      }
    },
  },

  {
    taskType: 'agent.update_client',
    name: 'Update Client',
    tier: 2,
    safety: 'reversible',
    description:
      "Update an existing client's profile. Finds the client by name and applies changes.",
    inputSchema:
      '{ "description": "string — what to change, e.g. Update Sarah Johnson\'s dietary restrictions to vegan, nut allergy" }',
    tierNote: 'ALWAYS tier 2 — chef must review changes before saving.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseClientUpdateFromText(description)

      // Find the client
      const clients = await searchClientsByName(parsed.clientName)
      if (clients.length === 0) {
        return {
          preview: {
            actionType: 'agent.update_client',
            summary: `Could not find client "${parsed.clientName}"`,
            fields: [
              {
                label: 'Error',
                value: `No client found matching "${parsed.clientName}". Please check the name and try again.`,
              },
            ],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const client = clients[0]
      const fields: AgentActionPreview['fields'] = [
        { label: 'Client', value: client.full_name ?? parsed.clientName },
      ]

      const updates = parsed.updates
      for (const [key, val] of Object.entries(updates)) {
        if (val !== undefined) {
          const displayVal = Array.isArray(val) ? val.join(', ') : String(val)
          fields.push({ label: formatFieldLabel(key), value: displayVal, editable: true })
        }
      }

      return {
        preview: {
          actionType: 'agent.update_client',
          summary: `Update client: ${client.full_name ?? parsed.clientName}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: { clientId: client.id, updates: parsed.updates },
      }
    },

    async commitAction(payload) {
      if (payload._error) {
        return { success: false, message: 'Cannot update — client not found.' }
      }
      const clientId = String(payload.clientId)
      const updates = payload.updates as Record<string, unknown>

      await updateClient(clientId, updates)
      return {
        success: true,
        message: 'Client updated successfully!',
        redirectUrl: `/clients/${clientId}`,
      }
    },
  },

  {
    taskType: 'agent.invite_client',
    name: 'Invite Client',
    tier: 2,
    safety: 'reversible',
    description: 'Send a client invitation via email. Provide the client name and email address.',
    inputSchema:
      '{ "full_name": "string — client full name", "email": "string — client email address" }',
    tierNote: 'ALWAYS tier 2 — chef must confirm before sending invitation.',

    async executor(inputs) {
      const fullName = String(inputs.full_name ?? inputs.name ?? '')
      const email = String(inputs.email ?? '')

      const fields: AgentActionPreview['fields'] = [
        { label: 'Full Name', value: fullName, editable: true },
        { label: 'Email', value: email, editable: true },
      ]

      return {
        preview: {
          actionType: 'agent.invite_client',
          summary: `Invite client: ${fullName} (${email})`,
          fields,
          warnings: ['An invitation email will be sent to this address.'],
          safety: 'significant',
        },
        commitPayload: { full_name: fullName, email },
      }
    },

    async commitAction(payload) {
      const result = await inviteClient({
        full_name: String(payload.full_name),
        email: String(payload.email),
      })

      if ('error' in result) {
        return { success: false, message: `Failed to send invitation: ${result.error}` }
      }
      return {
        success: true,
        message: `Invitation sent to ${payload.email}!`,
      }
    },
  },
]

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatFieldLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
