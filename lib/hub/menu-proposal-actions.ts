'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCircleForContext, getChefHubProfileId } from './circle-lookup'
import { generateMenuProposalMessage, type MenuOption } from '@/lib/templates/menu-proposal-message'

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

  const supabase = createServerClient({ admin: true })

  // Load chef first name
  const { data: chef } = await supabase
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', circle.tenantId)
    .single()

  const chefName = chef?.display_name || chef?.business_name || 'Chef'
  const chefFirstName = chefName.split(' ')[0]

  // Load menus with courses and dishes
  const menus: MenuOption[] = []

  for (const menuId of input.menuIds) {
    const { data: menu } = await supabase
      .from('menus')
      .select('id, name, description')
      .eq('id', menuId)
      .eq('tenant_id', circle.tenantId)
      .single()

    if (!menu) continue

    const { data: courses } = await supabase
      .from('menu_courses')
      .select('id, name, display_order')
      .eq('menu_id', menuId)
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
  await supabase.from('hub_messages').insert({
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
