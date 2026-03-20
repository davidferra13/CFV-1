// Remy Agent - Menu Proposal Actions
// Generates menu proposal messages for sharing with clients via Dinner Circle.
// Formula > AI: deterministic template, no LLM call needed.

import type { AgentActionDefinition } from '@/lib/ai/agent-registry'
import type { AgentActionPreview } from '@/lib/ai/command-types'
import { createServerClient } from '@/lib/supabase/server'
import { generateMenuProposalMessage, type MenuOption } from '@/lib/templates/menu-proposal-message'

// ─── Resolve menus for an inquiry or event ──────────────────────────────────

async function resolveMenus(
  tenantId: string,
  inquiryId?: string | null,
  eventId?: string | null
): Promise<{ menus: MenuOption[]; menuIds: string[] }> {
  const supabase: any = createServerClient()

  // Find menus linked to the event, or draft menus for the tenant
  let menuQuery = supabase
    .from('menus')
    .select('id, name, description, status')
    .eq('tenant_id', tenantId)

  if (eventId) {
    menuQuery = menuQuery.eq('event_id', eventId)
  } else {
    // No event yet: grab recent draft menus
    menuQuery = menuQuery.eq('status', 'draft').order('created_at', { ascending: false }).limit(3)
  }

  const { data: menuRows } = await menuQuery

  if (!menuRows || menuRows.length === 0) {
    return { menus: [], menuIds: [] }
  }

  const menus: MenuOption[] = []
  const menuIds: string[] = []

  for (const row of menuRows) {
    const { data: courses } = await supabase
      .from('menu_courses')
      .select('id, name, display_order')
      .eq('menu_id', row.id)
      .order('display_order', { ascending: true })

    const menuCourses: MenuOption['courses'] = []
    for (const course of courses ?? []) {
      const { data: dishes } = await supabase
        .from('menu_dishes')
        .select('name')
        .eq('course_id', course.id)
        .order('display_order', { ascending: true })

      menuCourses.push({
        name: course.name,
        dishes: (dishes ?? []).map((d: { name: string }) => d.name),
      })
    }

    menus.push({
      name: row.name,
      description: row.description,
      courseCount: menuCourses.length,
      courses: menuCourses,
    })
    menuIds.push(row.id)
  }

  return { menus, menuIds }
}

// ─── Resolve inquiry/event context ──────────────────────────────────────────

async function resolveContext(
  tenantId: string,
  inquiryId?: string
): Promise<{
  clientName: string
  occasion: string | null
  guestCount: number | null
  dietaryRestrictions: string[]
  eventId: string | null
  inquiryId: string | null
}> {
  const supabase: any = createServerClient()

  if (inquiryId) {
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('*, clients(full_name)')
      .eq('id', inquiryId)
      .eq('tenant_id', tenantId)
      .single()

    if (inquiry) {
      return {
        clientName: inquiry.clients?.full_name || inquiry.client_name || 'there',
        occasion: inquiry.confirmed_occasion || inquiry.occasion || null,
        guestCount: inquiry.confirmed_guest_count || inquiry.guest_count || null,
        dietaryRestrictions: inquiry.confirmed_dietary_restrictions || [],
        eventId: inquiry.converted_to_event_id || null,
        inquiryId,
      }
    }
  }

  return {
    clientName: 'there',
    occasion: null,
    guestCount: null,
    dietaryRestrictions: [],
    eventId: null,
    inquiryId: inquiryId || null,
  }
}

// ─── Action Definition ──────────────────────────────────────────────────────

const draftMenuProposal: AgentActionDefinition = {
  taskType: 'draft.menu_proposal',
  name: 'Propose Menu Options',
  tier: 2,
  safety: 'reversible',
  description:
    'Generate a menu proposal message to share with the client. Loads draft menus, formats them for the Dinner Circle. No LLM needed.',
  inputSchema: '{ inquiryId?: string, eventId?: string }',

  async executor(inputs, ctx) {
    const inquiryId = inputs.inquiryId as string | undefined
    const eventId = inputs.eventId as string | undefined

    // Load context and menus in parallel
    const [context, chefData] = await Promise.all([
      resolveContext(ctx.tenantId, inquiryId),
      (async () => {
        const supabase: any = createServerClient()
        const { data } = await supabase
          .from('chefs')
          .select('display_name, business_name')
          .eq('id', ctx.tenantId)
          .single()
        return data
      })(),
    ])

    const effectiveEventId = eventId || context.eventId
    const { menus, menuIds } = await resolveMenus(ctx.tenantId, context.inquiryId, effectiveEventId)

    if (menus.length === 0) {
      throw new Error('No menus found to propose. Create menu options first, then try again.')
    }

    const chefName = chefData?.display_name || chefData?.business_name || 'Chef'
    const chefFirstName = chefName.split(' ')[0]

    const dietaryNote =
      context.dietaryRestrictions.length > 0
        ? context.dietaryRestrictions.join(', ').toLowerCase()
        : null

    const { body } = generateMenuProposalMessage({
      menus,
      chefFirstName,
      clientName: context.clientName,
      occasion: context.occasion,
      guestCount: context.guestCount,
      dietaryNote,
    })

    const preview: AgentActionPreview = {
      actionType: 'draft.menu_proposal',
      summary: `Menu proposal for ${context.clientName} (${menus.length} option${menus.length > 1 ? 's' : ''})`,
      fields: [{ label: 'Proposal', value: body }],
      safety: 'reversible',
    }

    return {
      preview,
      commitPayload: {
        body,
        menuIds,
        clientName: context.clientName,
        occasion: context.occasion,
        guestCount: context.guestCount,
        dietaryRestrictions: context.dietaryRestrictions,
        eventId: effectiveEventId,
        inquiryId: context.inquiryId,
      },
    }
  },

  async commitAction(payload, ctx) {
    try {
      const { shareMenuProposalToCircle } = await import('@/lib/hub/menu-proposal-actions')
      const result = await shareMenuProposalToCircle({
        menuIds: payload.menuIds as string[],
        clientName: payload.clientName as string,
        occasion: payload.occasion as string | null,
        guestCount: payload.guestCount as number | null,
        dietaryRestrictions: (payload.dietaryRestrictions as string[]) || [],
        eventId: payload.eventId as string | null,
        inquiryId: payload.inquiryId as string | null,
      })

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Failed to share menu proposal to circle.',
        }
      }

      return {
        success: true,
        message: `Menu proposal shared with ${payload.clientName} in the Dinner Circle.`,
      }
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to post menu proposal.',
      }
    }
  },
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const menuProposalAgentActions: AgentActionDefinition[] = [draftMenuProposal]
