type BookingMenuContext = {
  db: any
  tenantId: string
  // Null when the booking is converted by the system (public or instant
  // booking) rather than by a signed-in chef; it only fills audit columns.
  actorId: string | null
  sourceMenuId: string
  eventId: string
  targetGuestCount: number
}

export type BookingMenuMaterialization = {
  menuId: string
  courseCount: number
  sourceMenuId: string
}

export async function materializeSelectedMenuForEvent({
  db,
  tenantId,
  actorId,
  sourceMenuId,
  eventId,
  targetGuestCount,
}: BookingMenuContext): Promise<BookingMenuMaterialization> {
  const { data: sourceMenu, error: menuError } = await db
    .from('menus')
    .select('*')
    .eq('id', sourceMenuId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (menuError || !sourceMenu) {
    throw new Error(
      `Selected menu could not be loaded for booking: ${menuError?.message || 'not found'}`
    )
  }

  const { data: sourceDishes, error: dishesError } = await db
    .from('dishes')
    .select('*')
    .eq('menu_id', sourceMenuId)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (dishesError) {
    throw new Error(`Selected menu dishes could not be loaded: ${dishesError.message}`)
  }

  const dishIds = (sourceDishes || []).map((dish: any) => dish.id)
  let sourceComponents: any[] = []
  if (dishIds.length > 0) {
    const { data, error } = await db
      .from('components')
      .select('*')
      .in('dish_id', dishIds)
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })

    if (error) {
      throw new Error(`Selected menu components could not be loaded: ${error.message}`)
    }
    sourceComponents = data || []
  }

  const generation = Number(sourceMenu.fork_generation ?? 0) + 1
  const { data: eventMenu, error: eventMenuError } = await db
    .from('menus')
    .insert({
      tenant_id: tenantId,
      event_id: eventId,
      name: sourceMenu.name,
      description: sourceMenu.description,
      service_style: sourceMenu.service_style,
      cuisine_type: sourceMenu.cuisine_type,
      target_guest_count: targetGuestCount,
      notes: sourceMenu.notes,
      is_template: false,
      created_by: actorId,
      updated_by: actorId,
      origin_type: 'forked',
      origin_metadata: {
        type: 'forked',
        forked_from_id: sourceMenuId,
        fork_generation: generation,
        fork_reason: 'booking_from_inquiry',
      },
      forked_from_id: sourceMenuId,
      fork_generation: generation,
      fork_reason: 'booking_from_inquiry',
    })
    .select('id')
    .single()

  if (eventMenuError || !eventMenu) {
    throw new Error(
      `Selected menu could not be materialized for booking: ${eventMenuError?.message || 'unknown error'}`
    )
  }

  const componentByDish = new Map<string, any[]>()
  for (const component of sourceComponents) {
    const list = componentByDish.get(component.dish_id) || []
    list.push(component)
    componentByDish.set(component.dish_id, list)
  }

  let courseCount = 0
  for (const dish of sourceDishes || []) {
    const { data: eventDish, error: dishError } = await db
      .from('dishes')
      .insert({
        tenant_id: tenantId,
        menu_id: eventMenu.id,
        course_name: dish.course_name,
        course_number: dish.course_number,
        description: dish.description,
        dietary_tags: dish.dietary_tags,
        allergen_flags: dish.allergen_flags,
        chef_notes: dish.chef_notes,
        client_notes: dish.client_notes,
        sort_order: dish.sort_order,
        plating_instructions: dish.plating_instructions ?? null,
        beverage_pairing: dish.beverage_pairing ?? null,
        beverage_pairing_notes: dish.beverage_pairing_notes ?? null,
        created_by: actorId,
        updated_by: actorId,
      })
      .select('id')
      .single()

    if (dishError || !eventDish) {
      throw new Error(
        `Selected menu dish could not be materialized: ${dishError?.message || 'unknown error'}`
      )
    }

    courseCount += 1
    const components = componentByDish.get(dish.id) || []
    for (const component of components) {
      const { error: componentError } = await db.from('components').insert({
        tenant_id: tenantId,
        dish_id: eventDish.id,
        name: component.name,
        category: component.category,
        description: component.description,
        recipe_id: component.recipe_id,
        scale_factor: component.scale_factor,
        is_make_ahead: component.is_make_ahead,
        make_ahead_window_hours: component.make_ahead_window_hours,
        execution_notes: component.execution_notes,
        storage_notes: component.storage_notes,
        sort_order: component.sort_order,
        portion_quantity: component.portion_quantity ?? null,
        portion_unit: component.portion_unit ?? null,
        prep_day_offset: component.prep_day_offset ?? 0,
        prep_time_of_day: component.prep_time_of_day ?? null,
        prep_station: component.prep_station ?? null,
        created_by: actorId,
        updated_by: actorId,
      })

      if (componentError) {
        throw new Error(`Selected menu component could not be materialized: ${componentError.message}`)
      }
    }
  }

  const { error: transitionError } = await db.from('menu_state_transitions').insert({
    tenant_id: tenantId,
    menu_id: eventMenu.id,
    from_status: null,
    to_status: 'draft',
    transitioned_by: actorId,
    reason: 'Materialized from inquiry-selected menu',
    metadata: {
      source_menu_id: sourceMenuId,
      event_id: eventId,
      fork_reason: 'booking_from_inquiry',
    },
  })

  if (transitionError) {
    throw new Error(`Selected menu transition could not be recorded: ${transitionError.message}`)
  }

  return {
    menuId: eventMenu.id,
    courseCount,
    sourceMenuId,
  }
}
