import { createAdminClient } from '@/lib/supabase/admin'
import type { PublicFeaturedBookingMenu } from '@/lib/booking/featured-menu-shared'

export {
  buildFeaturedMenuContextLine,
  formatServiceStyleLabel,
  normalizeBookingServiceModeForMenu,
  resolveRequestedFeaturedMenuId,
} from '@/lib/booking/featured-menu-shared'

function formatFeaturedBookingMenu(menu: any): PublicFeaturedBookingMenu {
  const dishes = ((menu?.dishes as any[]) ?? [])
    .map((dish) => ({
      id: String(dish.id),
      courseName: String(dish.course_name),
      courseNumber: Number(dish.course_number ?? 0),
      name: typeof dish.name === 'string' ? dish.name : null,
      description: typeof dish.description === 'string' ? dish.description : null,
      dietaryTags: Array.isArray(dish.dietary_tags) ? dish.dietary_tags : [],
      allergenFlags: Array.isArray(dish.allergen_flags) ? dish.allergen_flags : [],
    }))
    .sort((a, b) => a.courseNumber - b.courseNumber)

  return {
    id: String(menu.id),
    name: String(menu.name),
    description: typeof menu.description === 'string' ? menu.description : null,
    cuisineType: typeof menu.cuisine_type === 'string' ? menu.cuisine_type : null,
    pricePerPersonCents:
      typeof menu.price_per_person_cents === 'number' ? menu.price_per_person_cents : null,
    serviceStyle: typeof menu.service_style === 'string' ? menu.service_style : null,
    targetGuestCount: typeof menu.target_guest_count === 'number' ? menu.target_guest_count : null,
    timesUsed: typeof menu.times_used === 'number' ? menu.times_used : 0,
    dishCount: dishes.length,
    dishes,
  }
}

export async function getPublicFeaturedBookingMenu(
  chefId: string,
  featuredMenuId: string | null | undefined
): Promise<PublicFeaturedBookingMenu | null> {
  const targetMenuId = featuredMenuId?.trim()
  if (!chefId || !targetMenuId) {
    return null
  }

  const supabase: any = createAdminClient()
  const { data, error } = await supabase
    .from('menus')
    .select(
      `
      id, name, description, cuisine_type, price_per_person_cents, service_style, target_guest_count, times_used,
      dishes (
        id, course_name, course_number, name, description, dietary_tags, allergen_flags
      )
    `
    )
    .eq('id', targetMenuId)
    .eq('tenant_id', chefId)
    .neq('status', 'archived')
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    console.error('[getPublicFeaturedBookingMenu] Error:', error)
    return null
  }

  if (!data) {
    return null
  }

  return formatFeaturedBookingMenu(data)
}

export async function cloneFeaturedMenuToEvent({
  supabase,
  tenantId,
  eventId,
  sourceMenuId,
}: {
  supabase: any
  tenantId: string
  eventId: string
  sourceMenuId: string
}) {
  const { data: sourceMenu, error: sourceMenuError } = await supabase
    .from('menus')
    .select(
      `
      id, name, description, cuisine_type, service_style, target_guest_count, notes, times_used,
      price_per_person_cents, simple_mode, simple_mode_content,
      dishes (
        id, course_name, course_number, name, description, dietary_tags, allergen_flags,
        chef_notes, client_notes, sort_order, photo_url, plating_instructions,
        beverage_pairing, beverage_pairing_notes,
        components (
          id, name, category, description, recipe_id, scale_factor, is_make_ahead,
          make_ahead_window_hours, transport_category, execution_notes, storage_notes,
          sort_order, portion_quantity, portion_unit, prep_day_offset, prep_time_of_day,
          prep_station
        )
      )
    `
    )
    .eq('id', sourceMenuId)
    .eq('tenant_id', tenantId)
    .neq('status', 'archived')
    .is('deleted_at', null)
    .maybeSingle()

  if (sourceMenuError || !sourceMenu) {
    console.error('[cloneFeaturedMenuToEvent] Source menu lookup failed:', sourceMenuError)
    throw new Error('Featured menu is no longer available')
  }

  const { data: clonedMenu, error: clonedMenuError } = await supabase
    .from('menus')
    .insert({
      tenant_id: tenantId,
      event_id: null,
      name: sourceMenu.name,
      description: sourceMenu.description,
      cuisine_type: sourceMenu.cuisine_type,
      service_style: sourceMenu.service_style,
      target_guest_count: sourceMenu.target_guest_count,
      notes: sourceMenu.notes,
      price_per_person_cents: sourceMenu.price_per_person_cents,
      simple_mode: sourceMenu.simple_mode,
      simple_mode_content: sourceMenu.simple_mode_content,
      is_template: false,
      is_showcase: false,
      status: 'draft',
      created_by: null,
      updated_by: null,
    })
    .select('id')
    .single()

  if (clonedMenuError || !clonedMenu) {
    console.error('[cloneFeaturedMenuToEvent] Menu clone failed:', clonedMenuError)
    throw new Error('Failed to prepare the featured menu for this booking')
  }

  try {
    for (const sourceDish of (sourceMenu.dishes as any[]) ?? []) {
      const { data: clonedDish, error: clonedDishError } = await supabase
        .from('dishes')
        .insert({
          tenant_id: tenantId,
          menu_id: clonedMenu.id,
          course_name: sourceDish.course_name,
          course_number: sourceDish.course_number,
          name: sourceDish.name,
          description: sourceDish.description,
          dietary_tags: sourceDish.dietary_tags,
          allergen_flags: sourceDish.allergen_flags,
          chef_notes: sourceDish.chef_notes,
          client_notes: sourceDish.client_notes,
          sort_order: sourceDish.sort_order,
          photo_url: sourceDish.photo_url,
          plating_instructions: sourceDish.plating_instructions,
          beverage_pairing: sourceDish.beverage_pairing,
          beverage_pairing_notes: sourceDish.beverage_pairing_notes,
          created_by: null,
          updated_by: null,
        })
        .select('id')
        .single()

      if (clonedDishError || !clonedDish) {
        console.error('[cloneFeaturedMenuToEvent] Dish clone failed:', clonedDishError)
        throw new Error('Failed to prepare the featured menu dishes for this booking')
      }

      for (const sourceComponent of (sourceDish.components as any[]) ?? []) {
        const { error: componentError } = await supabase.from('components').insert({
          tenant_id: tenantId,
          dish_id: clonedDish.id,
          name: sourceComponent.name,
          category: sourceComponent.category,
          description: sourceComponent.description,
          recipe_id: sourceComponent.recipe_id,
          scale_factor: sourceComponent.scale_factor,
          is_make_ahead: sourceComponent.is_make_ahead,
          make_ahead_window_hours: sourceComponent.make_ahead_window_hours,
          transport_category: sourceComponent.transport_category,
          execution_notes: sourceComponent.execution_notes,
          storage_notes: sourceComponent.storage_notes,
          sort_order: sourceComponent.sort_order,
          portion_quantity: sourceComponent.portion_quantity,
          portion_unit: sourceComponent.portion_unit,
          prep_day_offset: sourceComponent.prep_day_offset,
          prep_time_of_day: sourceComponent.prep_time_of_day,
          prep_station: sourceComponent.prep_station,
          created_by: null,
          updated_by: null,
        })

        if (componentError) {
          console.error('[cloneFeaturedMenuToEvent] Component clone failed:', componentError)
          throw new Error('Failed to prepare the featured menu components for this booking')
        }
      }
    }

    await supabase.from('menu_state_transitions').insert({
      tenant_id: tenantId,
      menu_id: clonedMenu.id,
      from_status: null,
      to_status: 'draft',
      transitioned_by: null,
      reason: `Cloned from featured booking menu ${sourceMenuId}`,
    })

    const { error: attachError } = await supabase.rpc('attach_menu_to_event_atomic', {
      p_event_id: eventId,
      p_menu_id: clonedMenu.id,
      p_tenant_id: tenantId,
      p_actor_id: null,
    })

    if (attachError) {
      console.error('[cloneFeaturedMenuToEvent] Attach RPC failed:', attachError)
      throw new Error('Failed to attach the featured menu to this booking')
    }
  } catch (error) {
    try {
      await supabase.from('menus').delete().eq('id', clonedMenu.id).eq('tenant_id', tenantId)
    } catch (cleanupError) {
      console.error('[cloneFeaturedMenuToEvent] Cleanup failed:', cleanupError)
    }

    throw error
  }

  try {
    await supabase
      .from('menus')
      .update({ times_used: ((sourceMenu as any).times_used ?? 0) + 1 })
      .eq('id', sourceMenuId)
      .eq('tenant_id', tenantId)
  } catch (timesUsedError) {
    console.error(
      '[cloneFeaturedMenuToEvent] Non-blocking source menu usage update failed:',
      timesUsedError
    )
  }

  return clonedMenu.id as string
}
