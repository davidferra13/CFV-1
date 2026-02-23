// Remy Agent — Notes & Tags Actions
// Add client notes, client tags, inquiry notes.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { addClientNote } from '@/lib/notes/actions'
import { addClientTag, removeClientTag } from '@/lib/clients/tag-actions'
import { addInquiryNote } from '@/lib/inquiries/note-actions'
import { searchClientsByName } from '@/lib/clients/actions'
import { getInquiries } from '@/lib/inquiries/actions'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { z } from 'zod'

// ─── Action Definitions ──────────────────────────────────────────────────────

export const notesTagsAgentActions: AgentActionDefinition[] = [
  // ─── Add Client Note ─────────────────────────────────────────────────────
  {
    taskType: 'agent.add_client_note',
    name: 'Add Client Note',
    tier: 2,
    safety: 'reversible',
    description:
      'Add a note to a client profile. Great for recording preferences, allergies, follow-up items.',
    inputSchema:
      '{ "description": "string — e.g. Add a note to Sarah Johnson: prefers rosé wine and dislikes cilantro" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: clientName (who the note is about), noteText (the note content), category (general/dietary/preference/followup/feedback). Return ONLY JSON.',
        description,
        z.object({
          clientName: z.string(),
          noteText: z.string(),
          category: z.string().optional(),
        }),
        { modelTier: 'standard' }
      )

      const clients = await searchClientsByName(parsed.clientName)
      if (!clients.length) {
        return {
          preview: {
            actionType: 'agent.add_client_note',
            summary: `Client "${parsed.clientName}" not found`,
            fields: [{ label: 'Error', value: 'No matching client found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const client = clients[0]
      return {
        preview: {
          actionType: 'agent.add_client_note',
          summary: `Add note to ${client.full_name}`,
          fields: [
            { label: 'Client', value: client.full_name ?? parsed.clientName },
            { label: 'Note', value: parsed.noteText, editable: true },
            ...(parsed.category ? [{ label: 'Category', value: parsed.category }] : []),
          ],
          safety: 'reversible',
        },
        commitPayload: {
          clientId: client.id,
          noteText: parsed.noteText,
          category: parsed.category,
        },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Client not found.' }
      const result = await addClientNote({
        client_id: String(payload.clientId),
        note_text: String(payload.noteText),
        category: payload.category as string | undefined,
      })
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return {
        success: true,
        message: 'Note added!',
        redirectUrl: `/clients/${payload.clientId}`,
      }
    },
  },

  // ─── Add Client Tag ──────────────────────────────────────────────────────
  {
    taskType: 'agent.add_client_tag',
    name: 'Tag Client',
    tier: 2,
    safety: 'reversible',
    description: 'Add a tag to a client (e.g., VIP, repeat, holiday-regular, corporate).',
    inputSchema: '{ "description": "string — e.g. Tag the Johnsons as VIP" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: clientName, tag (the tag to add, e.g. "VIP", "corporate", "holiday-regular"). Return ONLY JSON.',
        description,
        z.object({ clientName: z.string(), tag: z.string() }),
        { modelTier: 'standard' }
      )

      const clients = await searchClientsByName(parsed.clientName)
      if (!clients.length) {
        return {
          preview: {
            actionType: 'agent.add_client_tag',
            summary: `Client "${parsed.clientName}" not found`,
            fields: [{ label: 'Error', value: 'No matching client found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const client = clients[0]
      return {
        preview: {
          actionType: 'agent.add_client_tag',
          summary: `Tag ${client.full_name} as "${parsed.tag}"`,
          fields: [
            { label: 'Client', value: client.full_name ?? parsed.clientName },
            { label: 'Tag', value: parsed.tag, editable: true },
          ],
          safety: 'reversible',
        },
        commitPayload: { clientId: client.id, tag: parsed.tag },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Client not found.' }
      await addClientTag(String(payload.clientId), String(payload.tag))
      return {
        success: true,
        message: `Tag "${payload.tag}" added!`,
        redirectUrl: `/clients/${payload.clientId}`,
      }
    },
  },

  // ─── Remove Client Tag ───────────────────────────────────────────────────
  {
    taskType: 'agent.remove_client_tag',
    name: 'Remove Client Tag',
    tier: 2,
    safety: 'reversible',
    description: 'Remove a tag from a client.',
    inputSchema: '{ "description": "string — e.g. Remove the VIP tag from the Johnsons" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: clientName, tag (the tag to remove). Return ONLY JSON.',
        description,
        z.object({ clientName: z.string(), tag: z.string() }),
        { modelTier: 'standard' }
      )

      const clients = await searchClientsByName(parsed.clientName)
      if (!clients.length) {
        return {
          preview: {
            actionType: 'agent.remove_client_tag',
            summary: `Client "${parsed.clientName}" not found`,
            fields: [{ label: 'Error', value: 'No matching client found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const client = clients[0]
      return {
        preview: {
          actionType: 'agent.remove_client_tag',
          summary: `Remove "${parsed.tag}" from ${client.full_name}`,
          fields: [
            { label: 'Client', value: client.full_name ?? parsed.clientName },
            { label: 'Tag to Remove', value: parsed.tag },
          ],
          safety: 'reversible',
        },
        commitPayload: { clientId: client.id, tag: parsed.tag },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Client not found.' }
      await removeClientTag(String(payload.clientId), String(payload.tag))
      return { success: true, message: `Tag "${payload.tag}" removed!` }
    },
  },

  // ─── Add Inquiry Note ────────────────────────────────────────────────────
  {
    taskType: 'agent.add_inquiry_note',
    name: 'Add Inquiry Note',
    tier: 2,
    safety: 'reversible',
    description: 'Add a note to an inquiry/lead.',
    inputSchema:
      '{ "description": "string — e.g. Add a note to the Smith birthday inquiry: they want a jazz band recommendation" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: inquiryIdentifier (occasion or client name to find), noteText (note content). Return ONLY JSON.',
        description,
        z.object({ inquiryIdentifier: z.string(), noteText: z.string() }),
        { modelTier: 'standard' }
      )

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
            actionType: 'agent.add_inquiry_note',
            summary: `Inquiry "${parsed.inquiryIdentifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching inquiry found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.add_inquiry_note',
          summary: `Add note to inquiry: ${(match as Record<string, unknown>).occasion ?? 'Inquiry'}`,
          fields: [
            {
              label: 'Inquiry',
              value: String((match as Record<string, unknown>).occasion ?? 'Inquiry'),
            },
            { label: 'Note', value: parsed.noteText, editable: true },
          ],
          safety: 'reversible',
        },
        commitPayload: {
          inquiryId: (match as Record<string, unknown>).id,
          noteText: parsed.noteText,
        },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Inquiry not found.' }
      const result = await addInquiryNote({
        inquiry_id: String(payload.inquiryId),
        note_text: String(payload.noteText),
      })
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return { success: true, message: 'Note added to inquiry!' }
    },
  },
]
