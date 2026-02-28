// Remy Agent — Menu Editing Actions
// Add dishes, update menus, duplicate, template, send for approval.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import {
  getMenus,
  getMenuById,
  updateMenu,
  addDishToMenu,
  updateDish,
  deleteDish,
  addComponentToDish,
  duplicateMenu,
  saveMenuAsTemplate,
  transitionMenu,
} from '@/lib/menus/actions'
import { sendMenuForApproval } from '@/lib/events/menu-approval-actions'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { z } from 'zod'

// ─── NL Parsers ──────────────────────────────────────────────────────────────

const ParsedDishSchema = z.object({
  menuName: z.string(),
  dishName: z.string(),
  course: z.string().optional(),
  description: z.string().optional(),
  position: z.number().optional(),
})

async function parseDishFromNL(description: string) {
  const systemPrompt = `Extract dish data: menuName (which menu to add to), dishName, course (e.g. "appetizer", "main", "dessert", "side"), description, position (order number).
Return ONLY valid JSON. Omit unmentioned fields.`
  return parseWithOllama(systemPrompt, description, ParsedDishSchema, { modelTier: 'standard' })
}

const ParsedMenuUpdateSchema = z.object({
  menuName: z.string(),
  updates: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    service_style: z
      .enum(['plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'other'])
      .optional(),
    cuisine_type: z.string().optional(),
    notes: z.string().optional(),
  }),
})

async function parseMenuUpdateFromNL(description: string) {
  const systemPrompt = `Extract menu name and fields to update: name, description, service_style (plated/family_style/buffet/cocktail/tasting_menu/other), cuisine_type, notes.
Return JSON with "menuName" and "updates". Return ONLY valid JSON.`
  return parseWithOllama(systemPrompt, description, ParsedMenuUpdateSchema, {
    modelTier: 'standard',
  })
}

const ParsedComponentSchema = z.object({
  menuName: z.string(),
  dishName: z.string(),
  componentName: z.string(),
  recipeName: z.string().optional(),
  notes: z.string().optional(),
})

async function parseComponentFromNL(description: string) {
  const systemPrompt = `Extract component data: menuName (which menu), dishName (which dish), componentName (the component to add, e.g. "lemon butter sauce"), recipeName (link to existing recipe if mentioned), notes.
Return ONLY valid JSON. Omit unmentioned fields.`
  return parseWithOllama(systemPrompt, description, ParsedComponentSchema, {
    modelTier: 'standard',
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function findMenuByName(name: string) {
  const menus = await getMenus({})
  const lower = name.toLowerCase()
  return (menus ?? []).find((m: Record<string, unknown>) =>
    String(m.name ?? '')
      .toLowerCase()
      .includes(lower)
  ) as { id: string; name: string } | undefined
}

async function findDishInMenu(
  menuId: string,
  dishName: string
): Promise<{ id: string; name: string } | undefined> {
  const menu = await getMenuById(menuId)
  if (!menu) return undefined
  const lower = dishName.toLowerCase()
  const dishes = (menu as Record<string, unknown>).dishes as
    | Array<{ id: string; name: string }>
    | undefined
  return dishes?.find((d) => d.name.toLowerCase().includes(lower))
}

// ─── Action Definitions ──────────────────────────────────────────────────────

export const menuEditAgentActions: AgentActionDefinition[] = [
  // ─── Update Menu ─────────────────────────────────────────────────────────
  {
    taskType: 'agent.update_menu',
    name: 'Update Menu',
    tier: 2,
    safety: 'reversible',
    description: 'Update an existing menu name, description, service style, or cuisine.',
    inputSchema:
      '{ "description": "string — what to change, e.g. Change the Spring Tasting Menu cuisine to French-Japanese fusion" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseMenuUpdateFromNL(description)
      const menu = await findMenuByName(parsed.menuName)

      if (!menu) {
        return {
          preview: {
            actionType: 'agent.update_menu',
            summary: `Menu "${parsed.menuName}" not found`,
            fields: [{ label: 'Error', value: 'No matching menu found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const fields: AgentActionPreview['fields'] = [{ label: 'Menu', value: menu.name }]
      for (const [key, val] of Object.entries(parsed.updates)) {
        if (val !== undefined) {
          fields.push({
            label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            value: String(val),
            editable: true,
          })
        }
      }

      return {
        preview: {
          actionType: 'agent.update_menu',
          summary: `Update menu: ${menu.name}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: { menuId: menu.id, updates: parsed.updates },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Menu not found.' }
      const result = await updateMenu(
        String(payload.menuId),
        payload.updates as Record<string, unknown>
      )
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return {
        success: true,
        message: 'Menu updated!',
        redirectUrl: `/menus/${payload.menuId}`,
      }
    },
  },

  // ─── Add Dish to Menu ────────────────────────────────────────────────────
  {
    taskType: 'agent.add_dish',
    name: 'Add Dish to Menu',
    tier: 2,
    safety: 'reversible',
    description: 'Add a new dish/course to an existing menu.',
    inputSchema:
      '{ "description": "string — e.g. Add a seared scallop appetizer to the Spring Tasting Menu" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseDishFromNL(description)
      const menu = await findMenuByName(parsed.menuName)

      if (!menu) {
        return {
          preview: {
            actionType: 'agent.add_dish',
            summary: `Menu "${parsed.menuName}" not found`,
            fields: [{ label: 'Error', value: 'No matching menu found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const fields: AgentActionPreview['fields'] = [
        { label: 'Menu', value: menu.name },
        { label: 'Dish', value: parsed.dishName, editable: true },
      ]
      if (parsed.course) fields.push({ label: 'Course', value: parsed.course })
      if (parsed.description) fields.push({ label: 'Description', value: parsed.description })

      return {
        preview: {
          actionType: 'agent.add_dish',
          summary: `Add "${parsed.dishName}" to ${menu.name}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: {
          menuId: menu.id,
          name: parsed.dishName,
          course: parsed.course,
          description: parsed.description,
          position: parsed.position,
        },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Menu not found.' }
      const result = await addDishToMenu({
        menu_id: String(payload.menuId),
        name: String(payload.name),
        course: payload.course as string | undefined,
        description: payload.description as string | undefined,
        position: payload.position as number | undefined,
      })
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return { success: true, message: `Dish "${payload.name}" added to menu!` }
    },
  },

  // ─── Update Dish ─────────────────────────────────────────────────────────
  {
    taskType: 'agent.update_dish',
    name: 'Update Dish',
    tier: 2,
    safety: 'reversible',
    description: 'Update a dish name, course, or description on a menu.',
    inputSchema:
      '{ "description": "string — e.g. Rename the scallop appetizer to Seared Diver Scallops on the Spring menu" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseWithOllama(
        'Extract: menuName, dishName (current name to find), updates (name, course, description). Return ONLY JSON.',
        description,
        z.object({
          menuName: z.string(),
          dishName: z.string(),
          updates: z.record(z.unknown()),
        }),
        { modelTier: 'standard' }
      )

      const menu = await findMenuByName(parsed.menuName)
      if (!menu) {
        return {
          preview: {
            actionType: 'agent.update_dish',
            summary: `Menu "${parsed.menuName}" not found`,
            fields: [{ label: 'Error', value: 'No matching menu found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const dish = await findDishInMenu(menu.id, parsed.dishName)
      if (!dish) {
        return {
          preview: {
            actionType: 'agent.update_dish',
            summary: `Dish "${parsed.dishName}" not found on ${menu.name}`,
            fields: [{ label: 'Error', value: 'No matching dish found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const fields: AgentActionPreview['fields'] = [
        { label: 'Menu', value: menu.name },
        { label: 'Dish', value: dish.name },
      ]
      for (const [key, val] of Object.entries(parsed.updates)) {
        if (val !== undefined) {
          fields.push({
            label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            value: String(val),
            editable: true,
          })
        }
      }

      return {
        preview: {
          actionType: 'agent.update_dish',
          summary: `Update dish: ${dish.name}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: { dishId: dish.id, updates: parsed.updates },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Dish not found.' }
      const result = await updateDish(
        String(payload.dishId),
        payload.updates as Record<string, unknown>
      )
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return { success: true, message: 'Dish updated!' }
    },
  },

  // ─── Add Component to Dish ───────────────────────────────────────────────
  {
    taskType: 'agent.add_component',
    name: 'Add Component to Dish',
    tier: 2,
    safety: 'reversible',
    description:
      'Add a component (sub-recipe or preparation) to a dish, e.g. a sauce, garnish, or base.',
    inputSchema:
      '{ "description": "string — e.g. Add a lemon butter sauce component to the Scallop dish on the Spring menu" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const description = String(inputs.description ?? '')
      const parsed = await parseComponentFromNL(description)
      const menu = await findMenuByName(parsed.menuName)

      if (!menu) {
        return {
          preview: {
            actionType: 'agent.add_component',
            summary: `Menu "${parsed.menuName}" not found`,
            fields: [{ label: 'Error', value: 'No matching menu found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const dish = await findDishInMenu(menu.id, parsed.dishName)
      if (!dish) {
        return {
          preview: {
            actionType: 'agent.add_component',
            summary: `Dish "${parsed.dishName}" not found on ${menu.name}`,
            fields: [{ label: 'Error', value: 'No matching dish found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const fields: AgentActionPreview['fields'] = [
        { label: 'Menu', value: menu.name },
        { label: 'Dish', value: dish.name },
        { label: 'Component', value: parsed.componentName, editable: true },
      ]
      if (parsed.recipeName) fields.push({ label: 'Linked Recipe', value: parsed.recipeName })

      return {
        preview: {
          actionType: 'agent.add_component',
          summary: `Add "${parsed.componentName}" to ${dish.name}`,
          fields,
          safety: 'reversible',
        },
        commitPayload: {
          dishId: dish.id,
          name: parsed.componentName,
          notes: parsed.notes,
        },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Menu or dish not found.' }
      const result = await addComponentToDish({
        dish_id: String(payload.dishId),
        name: String(payload.name),
        notes: payload.notes as string | undefined,
      })
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return { success: true, message: `Component "${payload.name}" added!` }
    },
  },

  // ─── Duplicate Menu ──────────────────────────────────────────────────────
  {
    taskType: 'agent.duplicate_menu',
    name: 'Duplicate Menu',
    tier: 2,
    safety: 'reversible',
    description: 'Make a copy of an existing menu (with all dishes and components).',
    inputSchema: '{ "menuName": "string — name of the menu to duplicate" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const menuName = String(inputs.menuName ?? inputs.description ?? '')
      const menu = await findMenuByName(menuName)

      if (!menu) {
        return {
          preview: {
            actionType: 'agent.duplicate_menu',
            summary: `Menu "${menuName}" not found`,
            fields: [{ label: 'Error', value: 'No matching menu found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.duplicate_menu',
          summary: `Duplicate menu: ${menu.name}`,
          fields: [
            { label: 'Original', value: menu.name },
            { label: 'Result', value: `Copy of ${menu.name}` },
          ],
          safety: 'reversible',
        },
        commitPayload: { menuId: menu.id, menuName: menu.name },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Menu not found.' }
      const result = await duplicateMenu(String(payload.menuId))
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return { success: true, message: `Menu "${payload.menuName}" duplicated!` }
    },
  },

  // ─── Save Menu as Template ───────────────────────────────────────────────
  {
    taskType: 'agent.save_menu_template',
    name: 'Save Menu as Template',
    tier: 2,
    safety: 'reversible',
    description: 'Save an existing menu as a reusable template for future events.',
    inputSchema: '{ "menuName": "string — name of the menu to save as template" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const menuName = String(inputs.menuName ?? inputs.description ?? '')
      const menu = await findMenuByName(menuName)

      if (!menu) {
        return {
          preview: {
            actionType: 'agent.save_menu_template',
            summary: `Menu "${menuName}" not found`,
            fields: [{ label: 'Error', value: 'No matching menu found.' }],
            safety: 'reversible' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.save_menu_template',
          summary: `Save as template: ${menu.name}`,
          fields: [{ label: 'Menu', value: menu.name }],
          warnings: ['This menu will be available as a template for future events.'],
          safety: 'reversible',
        },
        commitPayload: { menuId: menu.id, menuName: menu.name },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Menu not found.' }
      const result = await saveMenuAsTemplate(String(payload.menuId))
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return { success: true, message: `"${payload.menuName}" saved as template!` }
    },
  },

  // ─── Send Menu for Client Approval ───────────────────────────────────────
  {
    taskType: 'agent.send_menu_approval',
    name: 'Send Menu for Client Approval',
    tier: 2,
    safety: 'significant',
    description:
      "Send the event's menu to the client for approval. The client will receive a notification.",
    inputSchema:
      '{ "eventIdentifier": "string — event occasion or client name to find the event" }',
    tierNote: 'ALWAYS tier 2 — sends notification to client.',

    async executor(inputs, ctx) {
      const identifier = String(inputs.eventIdentifier ?? inputs.description ?? '').toLowerCase()
      const supabase: any = createServerClient()
      const { data: events } = await supabase
        .from('events')
        .select('id, occasion, client:clients(full_name)')
        .eq('tenant_id', ctx.tenantId)
        .not('status', 'in', '("cancelled","completed")')
        .limit(20)

      const match = (events ?? []).find((e: Record<string, unknown>) => {
        const occ = String(e.occasion ?? '').toLowerCase()
        const cn = String(
          (e.client as Record<string, unknown> | null)?.full_name ?? ''
        ).toLowerCase()
        return occ.includes(identifier) || cn.includes(identifier)
      })

      if (!match) {
        return {
          preview: {
            actionType: 'agent.send_menu_approval',
            summary: `Event "${inputs.eventIdentifier}" not found`,
            fields: [{ label: 'Error', value: 'No matching event found.' }],
            safety: 'significant' as const,
          },
          commitPayload: { _error: true },
        }
      }

      const clientName = (match.client as Record<string, unknown> | null)?.full_name ?? 'Client'

      return {
        preview: {
          actionType: 'agent.send_menu_approval',
          summary: `Send menu for approval: ${match.occasion}`,
          fields: [
            { label: 'Event', value: String(match.occasion) },
            { label: 'Client', value: String(clientName) },
          ],
          warnings: ['The client will receive a notification to review and approve the menu.'],
          safety: 'significant',
        },
        commitPayload: { eventId: match.id },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Event not found.' }
      const result = await sendMenuForApproval(String(payload.eventId))
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return { success: true, message: 'Menu sent for client approval!' }
    },
  },

  // ─── Transition Menu Status ──────────────────────────────────────────────
  {
    taskType: 'agent.transition_menu',
    name: 'Change Menu Status',
    tier: 2,
    safety: 'significant',
    description: 'Change a menu status (e.g., draft → approved or draft → rejected).',
    inputSchema:
      '{ "menuName": "string — menu to transition", "toStatus": "string — target: approved, rejected, draft" }',
    tierNote: 'ALWAYS tier 2.',

    async executor(inputs) {
      const menuName = String(inputs.menuName ?? '').toLowerCase()
      const toStatus = String(inputs.toStatus ?? '')
      const menu = await findMenuByName(menuName)

      if (!menu) {
        return {
          preview: {
            actionType: 'agent.transition_menu',
            summary: `Menu "${inputs.menuName}" not found`,
            fields: [{ label: 'Error', value: 'No matching menu found.' }],
            safety: 'significant' as const,
          },
          commitPayload: { _error: true },
        }
      }

      return {
        preview: {
          actionType: 'agent.transition_menu',
          summary: `Change menu status: ${menu.name} → ${toStatus}`,
          fields: [
            { label: 'Menu', value: menu.name },
            { label: 'New Status', value: toStatus },
          ],
          safety: 'significant',
        },
        commitPayload: { menuId: menu.id, toStatus },
      }
    },

    async commitAction(payload) {
      if (payload._error) return { success: false, message: 'Menu not found.' }
      const result = await transitionMenu(String(payload.menuId), payload.toStatus as string)
      if ('error' in result) return { success: false, message: `Failed: ${result.error}` }
      return { success: true, message: `Menu status changed to "${payload.toStatus}"!` }
    },
  },
]
