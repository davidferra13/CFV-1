// Remy Agent - Intake Actions
// Parse transcripts, bulk client lists, and brain dumps through Remy's chat.
// All actions are Tier 2 - chef must approve before any data is written.

import type { AgentActionDefinition, AgentActionContext } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { parseTranscript, type TranscriptResult } from '@/lib/ai/parse-transcript'
import { parseClientsFromBulk } from '@/lib/ai/parse-clients-bulk'
import { parseBrainDump } from '@/lib/ai/parse-brain-dump'
import { searchClientsByName, createClient } from '@/lib/clients/actions'
import { createInquiry } from '@/lib/inquiries/actions'

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatFieldLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildClientFields(
  client: Record<string, unknown>,
  index: number,
  total: number
): AgentActionPreview['fields'] {
  const prefix = total > 1 ? `Client ${index + 1}: ` : ''
  const fields: AgentActionPreview['fields'] = [
    { label: `${prefix}Full Name`, value: String(client.full_name ?? 'Unknown') },
  ]
  if (client.email) fields.push({ label: `${prefix}Email`, value: String(client.email) })
  if (client.phone) fields.push({ label: `${prefix}Phone`, value: String(client.phone) })
  if (Array.isArray(client.dietary_restrictions) && client.dietary_restrictions.length > 0) {
    fields.push({
      label: `${prefix}Dietary Restrictions`,
      value: client.dietary_restrictions.join(', '),
    })
  }
  if (Array.isArray(client.allergies) && client.allergies.length > 0) {
    fields.push({ label: `${prefix}Allergies`, value: client.allergies.join(', ') })
  }
  return fields
}

async function checkDuplicateClients(
  clientNames: string[]
): Promise<Map<string, { id: string; name: string }>> {
  const duplicates = new Map<string, { id: string; name: string }>()
  for (const name of clientNames) {
    if (!name) continue
    try {
      const matches = await searchClientsByName(name)
      if (matches.length > 0) {
        duplicates.set(name.toLowerCase(), {
          id: matches[0].id,
          name: matches[0].full_name ?? name,
        })
      }
    } catch {
      // Search failure is non-blocking - proceed without duplicate info
    }
  }
  return duplicates
}

async function commitClients(
  clients: Record<string, unknown>[]
): Promise<{ created: number; failed: number; errors: string[]; clientIds: string[] }> {
  let created = 0
  let failed = 0
  const errors: string[] = []
  const clientIds: string[] = []

  for (const client of clients) {
    try {
      const result = await createClient({
        full_name: String(client.full_name ?? ''),
        email: String(client.email ?? ''),
        phone: client.phone ? String(client.phone) : undefined,
        dietary_restrictions: (client.dietary_restrictions as string[]) ?? undefined,
        allergies: (client.allergies as string[]) ?? undefined,
        address: client.address ? String(client.address) : undefined,
        preferred_contact_method: client.preferred_contact_method as
          | 'phone'
          | 'email'
          | 'text'
          | 'instagram'
          | undefined,
      })

      if ('error' in result) {
        failed++
        errors.push(`${client.full_name}: ${result.error}`)
      } else {
        created++
        const id = (result as { client: { id: string } }).client?.id
        if (id) clientIds.push(id)
      }
    } catch (err) {
      failed++
      errors.push(`${client.full_name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return { created, failed, errors, clientIds }
}

// ─── Action Definitions ────────────────────────────────────────────────────

export const intakeAgentActions: AgentActionDefinition[] = [
  // ━━━ Transcript Intake ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    taskType: 'agent.intake_transcript',
    name: 'Parse Transcript',
    tier: 2,
    safety: 'reversible',
    description:
      'Parse a conversation transcript (call notes, texts, emails) and extract clients, events, inquiries, and action items. Creates all records after approval.',
    inputSchema: '{ "text": "string - the transcript or conversation text to parse" }',
    tierNote: 'ALWAYS tier 2 - chef must review all extracted data before saving.',

    async executor(inputs) {
      const text = String(inputs.text ?? inputs.description ?? '')
      if (text.length < 20) {
        return {
          preview: {
            actionType: 'agent.intake_transcript',
            summary: 'Transcript too short to parse',
            fields: [
              {
                label: 'Error',
                value: 'Please provide a longer transcript (at least a few sentences).',
              },
            ],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const result = await parseTranscript(text)
      const { clients, events, inquiries, notes } = result.parsed

      // Check for duplicate clients
      const clientNames = clients.map((c) => c.full_name).filter(Boolean)
      const duplicates = await checkDuplicateClients(clientNames)

      // Build preview fields
      const fields: AgentActionPreview['fields'] = []
      const warnings: string[] = []

      // Summary line
      const parts: string[] = []
      if (clients.length > 0) parts.push(`${clients.length} client${clients.length > 1 ? 's' : ''}`)
      if (events.length > 0) parts.push(`${events.length} event${events.length > 1 ? 's' : ''}`)
      if (inquiries.length > 0)
        parts.push(`${inquiries.length} inquir${inquiries.length > 1 ? 'ies' : 'y'}`)
      if (notes.length > 0) parts.push(`${notes.length} note${notes.length > 1 ? 's' : ''}`)

      fields.push({ label: 'Extracted', value: parts.join(', ') || 'Nothing found' })

      // Client fields
      for (let i = 0; i < clients.length; i++) {
        const c = clients[i]
        const dup = duplicates.get(c.full_name.toLowerCase())
        fields.push(
          ...buildClientFields(c as unknown as Record<string, unknown>, i, clients.length)
        )
        if (dup) {
          warnings.push(
            `"${c.full_name}" may already exist as "${dup.name}" - will create new record unless dismissed.`
          )
        }
      }

      // Event fields
      for (let i = 0; i < events.length; i++) {
        const e = events[i]
        const prefix = events.length > 1 ? `Event ${i + 1}: ` : 'Event: '
        if (e.occasion) fields.push({ label: `${prefix}Occasion`, value: e.occasion })
        if (e.event_date) fields.push({ label: `${prefix}Date`, value: e.event_date })
        if (e.guest_count) fields.push({ label: `${prefix}Guests`, value: String(e.guest_count) })
        if (e.budget_cents)
          fields.push({
            label: `${prefix}Budget`,
            value: `$${(e.budget_cents / 100).toLocaleString()}`,
          })
        if (e.location) fields.push({ label: `${prefix}Location`, value: e.location })
        if (e.dietary_restrictions.length > 0) {
          fields.push({ label: `${prefix}Dietary`, value: e.dietary_restrictions.join(', ') })
        }
      }

      // Inquiry fields
      for (let i = 0; i < inquiries.length; i++) {
        const inq = inquiries[i]
        const prefix = inquiries.length > 1 ? `Inquiry ${i + 1}: ` : 'Inquiry: '
        if (inq.client_name) fields.push({ label: `${prefix}Client`, value: inq.client_name })
        if (inq.occasion) fields.push({ label: `${prefix}Occasion`, value: inq.occasion })
        if (inq.channel) fields.push({ label: `${prefix}Channel`, value: inq.channel })
      }

      // Note fields
      for (const note of notes) {
        fields.push({ label: `Note (${note.type})`, value: note.content })
      }

      // Allergy warnings
      const allAllergies = clients.flatMap((c) => c.allergies)
      if (allAllergies.length > 0) {
        warnings.push(`Allergies detected: ${allAllergies.join(', ')}`)
      }

      if (result.warnings.length > 0) {
        warnings.push(...result.warnings)
      }

      const preview: AgentActionPreview = {
        actionType: 'agent.intake_transcript',
        summary: `Transcript parsed: ${parts.join(', ')}`,
        fields,
        warnings: warnings.length > 0 ? warnings : undefined,
        safety: 'reversible',
      }

      return {
        preview,
        commitPayload: {
          clients: clients as unknown as Record<string, unknown>[],
          events: events as unknown as Record<string, unknown>[],
          inquiries: inquiries as unknown as Record<string, unknown>[],
          notes: notes as unknown as Record<string, unknown>[],
          confidence: result.confidence,
        },
      }
    },

    async commitAction(payload) {
      const clients = (payload.clients ?? []) as Record<string, unknown>[]
      const inquiries = (payload.inquiries ?? []) as Record<string, unknown>[]
      const messages: string[] = []

      // 1. Create clients
      if (clients.length > 0) {
        const result = await commitClients(clients)
        if (result.created > 0) {
          messages.push(`${result.created} client${result.created > 1 ? 's' : ''} created`)
        }
        if (result.failed > 0) {
          messages.push(
            `${result.failed} client${result.failed > 1 ? 's' : ''} failed: ${result.errors.join('; ')}`
          )
        }
      }

      // 2. Create inquiries (client linking happens automatically via email match in createInquiry)
      for (const inq of inquiries) {
        try {
          const inquiryResult = await createInquiry({
            channel:
              (inq.channel as
                | 'phone'
                | 'email'
                | 'text'
                | 'instagram'
                | 'website'
                | 'referral'
                | 'walk_in'
                | 'other') ?? 'other',
            client_name: String(inq.client_name ?? 'Unknown'),
            confirmed_date: inq.event_date ? String(inq.event_date) : undefined,
            confirmed_guest_count: inq.guest_count ? Number(inq.guest_count) : undefined,
            confirmed_occasion: inq.occasion ? String(inq.occasion) : undefined,
            confirmed_budget_cents: inq.budget_range_max_cents
              ? Number(inq.budget_range_max_cents)
              : undefined,
            notes: inq.notes ? String(inq.notes) : undefined,
          })

          if ('error' in inquiryResult) {
            messages.push(`Inquiry for ${inq.client_name} failed: ${inquiryResult.error}`)
          } else {
            messages.push(`Inquiry created for ${inq.client_name}`)
          }
        } catch (err) {
          messages.push(
            `Inquiry for ${inq.client_name} failed: ${err instanceof Error ? err.message : 'Unknown error'}`
          )
        }
      }

      // Events from transcripts are typically at the inquiry stage, not ready for full event creation
      // (createEvent requires client_id, date, time, address, city, zip - transcripts rarely have all of these)
      const events = (payload.events ?? []) as Record<string, unknown>[]
      if (events.length > 0) {
        messages.push(
          `${events.length} event${events.length > 1 ? 's' : ''} noted - create them from the inquiry once details are confirmed`
        )
      }

      return {
        success: true,
        message: messages.length > 0 ? messages.join('. ') + '.' : 'No records to create.',
        redirectUrl:
          clients.length > 0 ? '/clients' : inquiries.length > 0 ? '/inquiries' : undefined,
      }
    },
  },

  // ━━━ Bulk Client Import ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    taskType: 'agent.intake_bulk_clients',
    name: 'Import Clients (Bulk)',
    tier: 2,
    safety: 'reversible',
    description:
      'Import multiple clients from a pasted list, CSV, or freeform text. Each client is parsed and created after approval.',
    inputSchema:
      '{ "text": "string - the client list to import (one client per line, CSV, or freeform)" }',
    tierNote: 'ALWAYS tier 2 - chef must review all clients before saving.',

    async executor(inputs) {
      const text = String(inputs.text ?? inputs.description ?? '')
      if (text.length < 10) {
        return {
          preview: {
            actionType: 'agent.intake_bulk_clients',
            summary: 'Input too short',
            fields: [
              { label: 'Error', value: 'Please provide a client list with at least one name.' },
            ],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const result = await parseClientsFromBulk(text)
      const clients = result.parsed

      // Check for duplicates
      const clientNames = clients.map((c) => c.full_name).filter(Boolean)
      const duplicates = await checkDuplicateClients(clientNames)

      const fields: AgentActionPreview['fields'] = []
      const warnings: string[] = []

      fields.push({ label: 'Clients Found', value: String(clients.length) })

      for (let i = 0; i < clients.length; i++) {
        const c = clients[i]
        fields.push(
          ...buildClientFields(c as unknown as Record<string, unknown>, i, clients.length)
        )
        const dup = duplicates.get(c.full_name.toLowerCase())
        if (dup) {
          warnings.push(`"${c.full_name}" may already exist as "${dup.name}".`)
        }
      }

      // Allergy warnings
      const allAllergies = clients.flatMap((c) => c.allergies)
      if (allAllergies.length > 0) {
        warnings.push(`Allergies detected: ${allAllergies.join(', ')}`)
      }

      if (result.warnings.length > 0) {
        warnings.push(...result.warnings)
      }

      return {
        preview: {
          actionType: 'agent.intake_bulk_clients',
          summary: `Bulk import: ${clients.length} client${clients.length !== 1 ? 's' : ''} ready`,
          fields,
          warnings: warnings.length > 0 ? warnings : undefined,
          safety: 'reversible',
        },
        commitPayload: {
          clients: clients as unknown as Record<string, unknown>[],
          confidence: result.confidence,
        },
      }
    },

    async commitAction(payload) {
      if (payload._error) {
        return { success: false, message: 'No clients to import.' }
      }

      const clients = (payload.clients ?? []) as Record<string, unknown>[]
      const result = await commitClients(clients)

      const parts: string[] = []
      if (result.created > 0) parts.push(`${result.created} created`)
      if (result.failed > 0) parts.push(`${result.failed} failed`)

      return {
        success: result.created > 0,
        message: `Bulk import complete: ${parts.join(', ')}.${result.errors.length > 0 ? ' Errors: ' + result.errors.join('; ') : ''}`,
        redirectUrl: '/clients',
      }
    },
  },

  // ━━━ Brain Dump Intake ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    taskType: 'agent.intake_brain_dump',
    name: 'Parse Brain Dump',
    tier: 2,
    safety: 'reversible',
    description:
      'Parse a freeform brain dump containing any mix of clients, recipes, notes, and event ideas. Sorts everything into the right place after approval.',
    inputSchema:
      '{ "text": "string - the brain dump text to parse (can contain clients, recipes, notes, anything)" }',
    tierNote: 'ALWAYS tier 2 - chef must review all extracted data before saving.',

    async executor(inputs) {
      const text = String(inputs.text ?? inputs.description ?? '')
      if (text.length < 10) {
        return {
          preview: {
            actionType: 'agent.intake_brain_dump',
            summary: 'Input too short',
            fields: [{ label: 'Error', value: 'Please provide more text for the brain dump.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const result = await parseBrainDump(text)
      const { clients, recipes, notes, unstructured } = result.parsed

      const fields: AgentActionPreview['fields'] = []
      const warnings: string[] = []

      // Summary
      const parts: string[] = []
      if (clients.length > 0) parts.push(`${clients.length} client${clients.length > 1 ? 's' : ''}`)
      if (recipes.length > 0) parts.push(`${recipes.length} recipe${recipes.length > 1 ? 's' : ''}`)
      if (notes.length > 0) parts.push(`${notes.length} note${notes.length > 1 ? 's' : ''}`)
      if (unstructured.length > 0) parts.push(`${unstructured.length} unclassified`)

      fields.push({ label: 'Extracted', value: parts.join(', ') || 'Nothing found' })

      // Client fields
      for (let i = 0; i < clients.length; i++) {
        fields.push(
          ...buildClientFields(clients[i] as unknown as Record<string, unknown>, i, clients.length)
        )
      }

      // Recipe fields
      for (let i = 0; i < recipes.length; i++) {
        const r = recipes[i]
        const prefix = recipes.length > 1 ? `Recipe ${i + 1}: ` : 'Recipe: '
        fields.push({ label: `${prefix}Name`, value: r.name })
        if (r.category) fields.push({ label: `${prefix}Category`, value: r.category })
        if (r.ingredients?.length) {
          fields.push({ label: `${prefix}Ingredients`, value: `${r.ingredients.length} items` })
        }
      }

      // Note fields
      for (const note of notes) {
        fields.push({ label: `Note (${note.type})`, value: note.content })
      }

      // Unstructured
      for (const item of unstructured) {
        fields.push({ label: 'Unclassified', value: item.slice(0, 200) })
      }

      // Allergy warnings
      const allAllergies = clients.flatMap((c) => c.allergies)
      if (allAllergies.length > 0) {
        warnings.push(`Allergies detected: ${allAllergies.join(', ')}`)
      }

      if (result.warnings.length > 0) {
        warnings.push(...result.warnings)
      }

      return {
        preview: {
          actionType: 'agent.intake_brain_dump',
          summary: `Brain dump parsed: ${parts.join(', ')}`,
          fields,
          warnings: warnings.length > 0 ? warnings : undefined,
          safety: 'reversible',
        },
        commitPayload: {
          clients: clients as unknown as Record<string, unknown>[],
          recipes: recipes as unknown as Record<string, unknown>[],
          notes: notes as unknown as Record<string, unknown>[],
          unstructured,
          confidence: result.confidence,
        },
      }
    },

    async commitAction(payload) {
      if (payload._error) {
        return { success: false, message: 'Nothing to import.' }
      }

      const clients = (payload.clients ?? []) as Record<string, unknown>[]
      const messages: string[] = []

      // Create clients
      if (clients.length > 0) {
        const result = await commitClients(clients)
        if (result.created > 0)
          messages.push(`${result.created} client${result.created > 1 ? 's' : ''} created`)
        if (result.failed > 0)
          messages.push(`${result.failed} client${result.failed > 1 ? 's' : ''} failed`)
      }

      // Recipes - note for chef to create via the recipe import page
      const recipes = (payload.recipes ?? []) as Record<string, unknown>[]
      if (recipes.length > 0) {
        messages.push(
          `${recipes.length} recipe${recipes.length > 1 ? 's' : ''} extracted - review and save them from the recipe import page`
        )
      }

      // Notes: commit into workflow_notes so they persist beyond chat preview
      const notes = (payload.notes ?? []) as Record<string, unknown>[]
      if (notes.length > 0) {
        let savedCount = 0
        try {
          const { createWorkflowNote } = await import('@/lib/notes/workflow-actions')
          for (const note of notes) {
            const body = String(note.content ?? note.text ?? note.body ?? '').trim()
            if (!body) continue
            const result = await createWorkflowNote({
              title: note.type ? String(note.type) : undefined,
              body,
              ownership_scope: 'global',
            })
            if (result.success) savedCount++
          }
        } catch (err) {
          console.error('[brain-dump commit] workflow_notes save failed (non-blocking):', err)
        }
        if (savedCount > 0) {
          messages.push(`${savedCount} note${savedCount > 1 ? 's' : ''} saved to Workflow Notes`)
        } else {
          messages.push(`${notes.length} note${notes.length > 1 ? 's' : ''} captured in chat`)
        }
      }

      return {
        success: true,
        message:
          messages.length > 0
            ? messages.join('. ') + '.'
            : 'Brain dump processed - nothing to save.',
        redirectUrl: clients.length > 0 ? '/clients' : undefined,
      }
    },
  },
]
