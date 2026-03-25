'use server'

import { createServerClient } from '@/lib/db/server'
import { getCircleForContext, getChefHubProfileId } from './circle-lookup'
import { generateMenuProposalMessage, type MenuOption } from '@/lib/templates/menu-proposal-message'

type UntypedDbClient = {
  from: (table: string) => any
}

type ChefRow = {
  display_name: string | null
  business_name: string | null
}

type MenuRow = {
  id: string
  name: string
  description: string | null
}

type MenuCourseRow = {
  id: string
  name: string
  display_order: number | null
}

type MenuDishRow = {
  name: string
}

type QueryResult<T> = {
  data: T | null
}

// ---------------------------------------------------------------------------
// Menu Proposal Actions
// Share menu proposals to a Dinner Circle. Loads menus from the DB, builds
// the deterministic message, and posts to the circle as the chef.
// ---------------------------------------------------------------------------

export async function shareMenuProposalToCircle(input: {
  menuIds: string[]
  clientName: string
  occasion: string | null
  guestCount: number | null
  dietaryRestrictions: string[]
  eventId?: string | null
  inquiryId?: string | null
}): Promise<{ success: boolean; error?: string }> {
  if (input.menuIds.length === 0) {
    return { success: false, error: 'No menus to propose' }
  }

  const circle = await getCircleForContext({
    eventId: input.eventId,
    inquiryId: input.inquiryId,
  })
  if (!circle) {
    return { success: false, error: 'No Dinner Circle found for this inquiry or event' }
  }

  const chefProfileId = await getChefHubProfileId(circle.tenantId)
  if (!chefProfileId) {
    return { success: false, error: 'Chef hub profile not found' }
  }

  // Keep the result shapes explicit here so build type-checking does not
  // expand the full generated query-builder types for every chain.
  const db = createServerClient({ admin: true }) as unknown as UntypedDbClient

  // Load chef first name
  const { data: chef } = (await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', circle.tenantId)
    .single()) as QueryResult<ChefRow>

  const chefName = chef?.display_name || chef?.business_name || 'Chef'
  const chefFirstName = chefName.split(' ')[0]

  // Load menus with courses and dishes
  const menus: MenuOption[] = []

  for (const menuId of input.menuIds) {
    const { data: menu } = (await db
      .from('menus')
      .select('id, name, description')
      .eq('id', menuId)
      .eq('tenant_id', circle.tenantId)
      .single()) as QueryResult<MenuRow>

    if (!menu) continue

    const { data: courses } = (await db
      .from('menu_courses')
      .select('id, name, display_order')
      .eq('menu_id', menuId)
      .order('display_order', { ascending: true })) as QueryResult<MenuCourseRow[]>

    const menuCourses: MenuOption['courses'] = []

    for (const course of courses ?? []) {
      const { data: dishes } = (await db
        .from('menu_dishes')
        .select('name')
        .eq('course_id', course.id)
        .order('display_order', { ascending: true })) as QueryResult<MenuDishRow[]>

      menuCourses.push({
        name: course.name,
        dishes: (dishes ?? []).map((d) => d.name),
      })
    }

    menus.push({
      name: menu.name,
      description: menu.description,
      courseCount: menuCourses.length,
      courses: menuCourses,
    })
  }

  if (menus.length === 0) {
    return { success: false, error: 'No valid menus found' }
  }

  // Build dietary note
  const dietaryNote =
    input.dietaryRestrictions.length > 0 ? input.dietaryRestrictions.join(', ').toLowerCase() : null

  // Generate the message
  const { body } = generateMenuProposalMessage({
    menus,
    chefFirstName,
    clientName: input.clientName,
    occasion: input.occasion,
    guestCount: input.guestCount,
    dietaryNote,
  })

  // Post to circle
  await db.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'text',
    body,
    metadata: {
      system_event_type: 'menu_proposal',
      menu_ids: input.menuIds,
    },
  })

  return { success: true }
}
