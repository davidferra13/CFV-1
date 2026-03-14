// Remy Agent — Menu Actions
// Create menus, link to events on the chef's behalf.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { createMenu, updateMenu, applyMenuToEvent, getMenus } from '@/lib/menus/actions'
import { searchClientsByName } from '@/lib/clients/actions'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { z } from 'zod'

const ParsedMenuSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  service_style: z
    .enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'])
    .optional(),
  cuisine_type: z.string().optional(),
  target_guest_count: z.number().optional(),
  notes: z.string().optional(),
  event_identifier: z.string().optional(),
})

async function parseMenuFromNL(description: string) {
  const systemPrompt = `You extract structured menu data from natural language.
Extract: name, description, service_style (plated/family_style/buffet/cocktail/tasting_menu/other), cuisine_type, target_guest_count, notes, event_identifier (event name/occasion to link to, if mentioned).
Return ONLY valid JSON. Omit unmentioned fields.`

  return parseWithOllama(systemPrompt, description, ParsedMenuSchema, { modelTier: 'standard' })
}

export const menuAgentActions: AgentActionDefinition[] = [
  {
    taskType: 'agent.create_menu',
    name: 'Create Menu',
    tier: 2,
    safety: 'reversible',
    description: 'Create a new menu, optionally linked to an event.',
    inputSchema:
      '{ "description": "string — menu details, e.g. Spring Tasting Menu for the Johnson dinner, 5 courses, plated, Mediterranean cuisine" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs, ctx) {
      const description = String(inputs.description ?? '')
      const parsed = await parseMenuFromNL(description)

      let eventId: string | undefined
      if (parsed.event_identifier) {
        const supabase: any = createServerClient()
        const { data: events } = await supabase
          .from('events')
          .select('id, occasion')
          .eq('tenant_id', ctx.tenantId)
          .ilike('occasion', `%${parsed.event_identifier}%`)
          .limit(1)
        if (events?.[0]) eventId = events[0].id
      }

      const fields: AgentActionPreview['fields'] = [
        { label: 'Name', value: parsed.name, editable: true },
      ]
      if (parsed.description)
        fields.push({ label: 'Description', value: parsed.description, editable: true })
      if (parsed.service_style)
        fields.push({ label: 'Service Style', value: parsed.service_style.replace(/_/g, ' ') })
      if (parsed.cuisine_type) fields.push({ label: 'Cuisine', value: parsed.cuisine_type })
      if (parsed.target_guest_count)
        fields.push({ label: 'Target Guests', value: String(parsed.target_guest_count) })
      if (eventId) fields.push({ label: 'Linked Event', value: parsed.event_identifier ?? '' })

      return {
        preview: {
          actionType: 'agent.create_menu',
          summary: `Create menu: ${parsed.name}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: { ...parsed, event_id: eventId },
      }
    },

    async commitAction(payload) {
      const result = await createMenu({
        name: String(payload.name),
        description: payload.description as string | undefined,
        service_style: payload.service_style as
          | 'plated'
          | 'family_style'
          | 'buffet'
          | 'cocktail'
          | 'tasting_menu'
          | 'other'
          | undefined,
        cuisine_type: payload.cuisine_type as string | undefined,
        target_guest_count: payload.target_guest_count as number | undefined,
        notes: payload.notes as string | undefined,
        event_id: payload.event_id as string | undefined,
      })
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      const menuId = (result as { menu: { id: string } }).menu?.id
      return {
        success: true,
        message: `Menu "${payload.name}" created!`,
        redirectUrl: menuId ? `/menus/${menuId}` : '/menus',
      }
    },
  },

  {
    taskType: 'agent.link_menu_event',
    name: 'Link Menu to Event',
    tier: 2,
    safety: 'reversible',
    description: 'Link an existing menu to an event.',
    inputSchema:
      '{ "menuName": "string — menu to link", "eventIdentifier": "string — event occasion or client name" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs, ctx) {
      const menuName = String(inputs.menuName ?? '').toLowerCase()
      const eventIdent = String(inputs.eventIdentifier ?? '').toLowerCase()

      const menus = await getMenus({})
      const menuMatch = (menus ?? []).find((m: Record<string, unknown>) =>
        String(m.name ?? '')
          .toLowerCase()
          .includes(menuName)
      )

      const supabase: any = createServerClient()
      const { data: events } = await supabase
        .from('events')
        .select('id, occasion, client:clients(full_name)')
        .eq('tenant_id', ctx.tenantId)
        .not('status', 'in', '("cancelled","completed")')
        .limit(20)

      const eventMatch = (events ?? []).find((e: Record<string, unknown>) => {
        const occ = String(e.occasion ?? '').toLowerCase()
        const cn = String(
          (e.client as Record<string, unknown> | null)?.full_name ?? ''
        ).toLowerCase()
        return occ.includes(eventIdent) || cn.includes(eventIdent)
      })

      if (!menuMatch || !eventMatch) {
        const missing = !menuMatch
          ? `menu "${inputs.menuName}"`
          : `event "${inputs.eventIdentifier}"`
        return {
          preview: {
            actionType: 'agent.link_menu_event',
            summary: `Could not find ${missing}`,
            fields: [{ label: 'Error', value: `${missing} not found.` }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.link_menu_event',
          summary: `Link "${(menuMatch as Record<string, unknown>).name}" to "${eventMatch.occasion}"`,
          fields: [
            { label: 'Menu', value: String((menuMatch as Record<string, unknown>).name) },
            { label: 'Event', value: String(eventMatch.occasion) },
          ],
          safety: 'reversible',
        },
        commitPayload: {
          menuId: (menuMatch as Record<string, unknown>).id,
          eventId: eventMatch.id,
        },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Menu or event not found.' }
      const result = await applyMenuToEvent(String(payload.menuId), String(payload.eventId))
      return {
        success: true,
        message: result.wasDuplicated
          ? 'Template duplicated and linked to event!'
          : 'Menu linked to event!',
        redirectUrl: `/events/${payload.eventId}`,
      }
    },
  },
]
