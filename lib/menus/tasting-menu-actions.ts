// Tasting Menu Builder - Server Actions
// Multi-course tasting menu CRUD with course management and duplication
// Hooked into the main menu engine via tasting-menu-bridge.ts for intelligence features.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import {
  syncTastingMenuToEngine,
  syncSingleCourse,
  removeMaterializedDish,
  deleteMaterializedMenu,
} from './tasting-menu-bridge'

// ─── Types ──────────────────────────────────────────────────────────────────────

export type CourseType =
  | 'amuse_bouche'
  | 'appetizer'
  | 'soup'
  | 'salad'
  | 'fish'
  | 'intermezzo'
  | 'main'
  | 'cheese'
  | 'pre_dessert'
  | 'dessert'
  | 'mignardise'

export type PortionSize = 'bite' | 'small' | 'standard'

export type TastingMenuInput = {
  name: string
  description?: string | null
  course_count?: number
  price_per_person_cents?: number | null
  wine_pairing_upcharge_cents?: number | null
  occasion?: string | null
  season?: string | null
}

export type CourseInput = {
  course_number: number
  course_type: CourseType
  dish_name: string
  description?: string | null
  recipe_id?: string | null
  wine_pairing?: string | null
  pairing_notes?: string | null
  portion_size?: PortionSize | null
  prep_notes?: string | null
}

export type TastingMenu = {
  id: string
  chef_id: string
  name: string
  description: string | null
  course_count: number
  price_per_person_cents: number | null
  wine_pairing_upcharge_cents: number | null
  occasion: string | null
  season: string | null
  created_at: string
  updated_at: string
}

export type TastingMenuCourse = {
  id: string
  tasting_menu_id: string
  course_number: number
  course_type: CourseType
  dish_name: string
  description: string | null
  recipe_id: string | null
  wine_pairing: string | null
  pairing_notes: string | null
  portion_size: PortionSize | null
  prep_notes: string | null
  created_at: string
}

export type TastingMenuWithCourses = TastingMenu & {
  courses: TastingMenuCourse[]
}

// ─── List All Tasting Menus ─────────────────────────────────────────────────────

export async function getTastingMenus(): Promise<TastingMenu[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('tasting_menus')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[getTastingMenus] Error:', error)
    throw new Error('Failed to load tasting menus')
  }

  return (data ?? []) as TastingMenu[]
}

// ─── Get Single Tasting Menu with Courses ───────────────────────────────────────

export async function getTastingMenu(id: string): Promise<TastingMenuWithCourses> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: menu, error: menuError } = await db
    .from('tasting_menus')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (menuError || !menu) {
    console.error('[getTastingMenu] Error:', menuError)
    throw new Error('Tasting menu not found')
  }

  const { data: courses, error: coursesError } = await db
    .from('tasting_menu_courses')
    .select('*')
    .eq('tasting_menu_id', id)
    .order('course_number', { ascending: true })

  if (coursesError) {
    console.error('[getTastingMenu] Courses error:', coursesError)
    throw new Error('Failed to load courses')
  }

  return {
    ...(menu as TastingMenu),
    courses: (courses ?? []) as TastingMenuCourse[],
  }
}

// ─── Create Tasting Menu ────────────────────────────────────────────────────────

export async function createTastingMenu(
  input: TastingMenuInput
): Promise<{ success: true; id: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('tasting_menus')
    .insert({
      chef_id: user.tenantId!,
      name: input.name,
      description: input.description ?? null,
      course_count: input.course_count ?? 5,
      price_per_person_cents: input.price_per_person_cents ?? null,
      wine_pairing_upcharge_cents: input.wine_pairing_upcharge_cents ?? 0,
      occasion: input.occasion ?? null,
      season: input.season ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[createTastingMenu] Error:', error)
    throw new Error('Failed to create tasting menu')
  }

  revalidatePath('/menus/tasting')
  return { success: true, id: data.id }
}

// ─── Update Tasting Menu ────────────────────────────────────────────────────────

export async function updateTastingMenu(
  id: string,
  input: Partial<TastingMenuInput>
): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('tasting_menus')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[updateTastingMenu] Error:', error)
    throw new Error('Failed to update tasting menu')
  }

  // Sync name/metadata to materialized menu (non-blocking)
  if (input.name) {
    try {
      const { data: tm } = await db
        .from('tasting_menus')
        .select('materialized_menu_id')
        .eq('id', id)
        .eq('chef_id', user.tenantId!)
        .single()

      if (tm?.materialized_menu_id) {
        await db
          .from('menus')
          .update({ name: input.name, updated_by: user.id })
          .eq('id', tm.materialized_menu_id)
          .eq('tenant_id', user.tenantId!)
      }
    } catch (err) {
      console.error('[updateTastingMenu] Shadow menu sync failed (non-blocking):', err)
    }
  }

  revalidatePath('/menus/tasting')
  return { success: true }
}

// ─── Delete Tasting Menu ────────────────────────────────────────────────────────

export async function deleteTastingMenu(id: string): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Clean up materialized menu first (before the tasting menu is deleted)
  try {
    const { data: tm } = await db
      .from('tasting_menus')
      .select('materialized_menu_id, event_id')
      .eq('id', id)
      .eq('chef_id', user.tenantId!)
      .single()

    if (tm?.materialized_menu_id) {
      // Clear event's menu_id if it points to our materialized menu
      if (tm.event_id) {
        await db
          .from('events')
          .update({ menu_id: null })
          .eq('id', tm.event_id)
          .eq('tenant_id', user.tenantId!)
          .eq('menu_id', tm.materialized_menu_id)
      }
      await deleteMaterializedMenu(db, tm.materialized_menu_id, user.tenantId!)
    }
  } catch (err) {
    console.error('[deleteTastingMenu] Materialized menu cleanup failed (non-blocking):', err)
  }

  const { error } = await db
    .from('tasting_menus')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteTastingMenu] Error:', error)
    throw new Error('Failed to delete tasting menu')
  }

  revalidatePath('/menus/tasting')
  return { success: true }
}

// ─── Link to Event ──────────────────────────────────────────────────────────────

/**
 * Link a tasting menu to an event. Materializes the tasting courses into the main
 * menu engine so all intelligence features (cost, allergens, repeat detection, etc.) work.
 */
export async function linkTastingMenuToEvent(
  tastingMenuId: string,
  eventId: string
): Promise<{ success: true; materializedMenuId: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify tasting menu ownership
  const { data: tm, error: tmErr } = await db
    .from('tasting_menus')
    .select('id, chef_id')
    .eq('id', tastingMenuId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (tmErr || !tm) throw new Error('Tasting menu not found')

  // Verify event ownership
  const { data: event, error: evErr } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (evErr || !event) throw new Error('Event not found')

  // Set event_id on tasting menu
  await db
    .from('tasting_menus')
    .update({ event_id: eventId })
    .eq('id', tastingMenuId)
    .eq('chef_id', user.tenantId!)

  // Full sync: materialize courses into main engine
  const { materializedMenuId } = await syncTastingMenuToEngine(
    db,
    tastingMenuId,
    user.tenantId!,
    user.id
  )

  // Point the event's menu_id to the materialized menu
  await db
    .from('events')
    .update({ menu_id: materializedMenuId })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath('/menus')
  revalidatePath('/events')
  return { success: true, materializedMenuId }
}

/**
 * Unlink a tasting menu from its event. Deletes the materialized menu and all
 * its dishes/components. The tasting menu itself is preserved.
 */
export async function unlinkTastingMenuFromEvent(
  tastingMenuId: string
): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: tm, error: tmErr } = await db
    .from('tasting_menus')
    .select('id, event_id, materialized_menu_id')
    .eq('id', tastingMenuId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (tmErr || !tm) throw new Error('Tasting menu not found')

  // Clear event's menu_id if it points to our materialized menu
  if (tm.event_id && tm.materialized_menu_id) {
    await db
      .from('events')
      .update({ menu_id: null })
      .eq('id', tm.event_id)
      .eq('tenant_id', user.tenantId!)
      .eq('menu_id', tm.materialized_menu_id)
  }

  // Delete materialized menu (CASCADE cleans up dishes + components)
  if (tm.materialized_menu_id) {
    await deleteMaterializedMenu(db, tm.materialized_menu_id, user.tenantId!)
  }

  // Clear links on tasting menu
  await db
    .from('tasting_menus')
    .update({ event_id: null, materialized_menu_id: null })
    .eq('id', tastingMenuId)
    .eq('chef_id', user.tenantId!)

  revalidatePath('/menus')
  revalidatePath('/events')
  return { success: true }
}

// ─── Add Course ─────────────────────────────────────────────────────────────────

export async function addCourse(
  menuId: string,
  input: CourseInput
): Promise<{ success: true; id: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify menu ownership and get materialized menu link
  const { data: menu, error: menuError } = await db
    .from('tasting_menus')
    .select('id, materialized_menu_id')
    .eq('id', menuId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (menuError || !menu) {
    throw new Error('Tasting menu not found')
  }

  const { data, error } = await db
    .from('tasting_menu_courses')
    .insert({
      tasting_menu_id: menuId,
      course_number: input.course_number,
      course_type: input.course_type,
      dish_name: input.dish_name,
      description: input.description ?? null,
      recipe_id: input.recipe_id ?? null,
      wine_pairing: input.wine_pairing ?? null,
      pairing_notes: input.pairing_notes ?? null,
      portion_size: input.portion_size ?? null,
      prep_notes: input.prep_notes ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[addCourse] Error:', error)
    throw new Error('Failed to add course')
  }

  // Sync new course to materialized menu (non-blocking)
  if (menu.materialized_menu_id) {
    try {
      await syncSingleCourse(db, data.id, menu.materialized_menu_id, user.tenantId!, user.id)
    } catch (err) {
      console.error('[addCourse] Bridge sync failed (non-blocking):', err)
    }
  }

  revalidatePath('/menus/tasting')
  return { success: true, id: data.id }
}

// ─── Update Course ──────────────────────────────────────────────────────────────

export async function updateCourse(
  courseId: string,
  input: Partial<CourseInput>
): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership via join (also fetch materialized_menu_id for bridge sync)
  const { data: course, error: findError } = await db
    .from('tasting_menu_courses')
    .select('id, tasting_menus!inner(chef_id, materialized_menu_id)')
    .eq('id', courseId)
    .single()

  if (findError || !course) {
    throw new Error('Course not found')
  }

  const menuData = course.tasting_menus as unknown as {
    chef_id: string
    materialized_menu_id: string | null
  }
  if (menuData.chef_id !== user.tenantId!) {
    throw new Error('Not authorized')
  }

  const { error } = await db.from('tasting_menu_courses').update(input).eq('id', courseId)

  if (error) {
    console.error('[updateCourse] Error:', error)
    throw new Error('Failed to update course')
  }

  // Sync changes to materialized dish (non-blocking)
  if (menuData.materialized_menu_id) {
    try {
      await syncSingleCourse(db, courseId, menuData.materialized_menu_id, user.tenantId!, user.id)
    } catch (err) {
      console.error('[updateCourse] Bridge sync failed (non-blocking):', err)
    }
  }

  revalidatePath('/menus/tasting')
  return { success: true }
}

// ─── Remove Course ──────────────────────────────────────────────────────────────

export async function removeCourse(courseId: string): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership via join (also fetch materialized_menu_id for bridge sync)
  const { data: course, error: findError } = await db
    .from('tasting_menu_courses')
    .select('id, tasting_menus!inner(chef_id, materialized_menu_id)')
    .eq('id', courseId)
    .single()

  if (findError || !course) {
    throw new Error('Course not found')
  }

  const menuData = course.tasting_menus as unknown as {
    chef_id: string
    materialized_menu_id: string | null
  }
  if (menuData.chef_id !== user.tenantId!) {
    throw new Error('Not authorized')
  }

  // Remove materialized dish BEFORE deleting the course (need the FK reference)
  if (menuData.materialized_menu_id) {
    try {
      await removeMaterializedDish(db, courseId, menuData.materialized_menu_id, user.tenantId!)
    } catch (err) {
      console.error('[removeCourse] Bridge cleanup failed (non-blocking):', err)
    }
  }

  const { error } = await db.from('tasting_menu_courses').delete().eq('id', courseId)

  if (error) {
    console.error('[removeCourse] Error:', error)
    throw new Error('Failed to remove course')
  }

  revalidatePath('/menus/tasting')
  return { success: true }
}

// ─── Reorder Courses ────────────────────────────────────────────────────────────

export async function reorderCourses(
  menuId: string,
  courseIds: string[]
): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify menu ownership and get materialized menu link
  const { data: menu, error: menuError } = await db
    .from('tasting_menus')
    .select('id, materialized_menu_id')
    .eq('id', menuId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (menuError || !menu) {
    throw new Error('Tasting menu not found')
  }

  // Update each course's course_number based on position in array
  const updates = courseIds.map((courseId, index) =>
    db
      .from('tasting_menu_courses')
      .update({ course_number: index + 1 })
      .eq('id', courseId)
      .eq('tasting_menu_id', menuId)
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)

  if (failed?.error) {
    console.error('[reorderCourses] Error:', failed.error)
    throw new Error('Failed to reorder courses')
  }

  // Sync reordered course_numbers to materialized dishes (non-blocking)
  if (menu.materialized_menu_id) {
    try {
      for (const [index, courseId] of courseIds.entries()) {
        await db
          .from('dishes')
          .update({ course_number: index + 1, sort_order: index + 1 })
          .eq('source_tasting_course_id', courseId)
          .eq('menu_id', menu.materialized_menu_id)
          .eq('tenant_id', user.tenantId!)
      }
    } catch (err) {
      console.error('[reorderCourses] Bridge sync failed (non-blocking):', err)
    }
  }

  revalidatePath('/menus/tasting')
  return { success: true }
}

// ─── Duplicate Tasting Menu ─────────────────────────────────────────────────────

export async function duplicateTastingMenu(
  id: string,
  newName: string
): Promise<{ success: true; id: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get the original menu
  const { data: original, error: origError } = await db
    .from('tasting_menus')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (origError || !original) {
    throw new Error('Tasting menu not found')
  }

  // Create the copy
  const { data: copy, error: copyError } = await db
    .from('tasting_menus')
    .insert({
      chef_id: user.tenantId!,
      name: newName,
      description: original.description,
      course_count: original.course_count,
      price_per_person_cents: original.price_per_person_cents,
      wine_pairing_upcharge_cents: original.wine_pairing_upcharge_cents,
      occasion: original.occasion,
      season: original.season,
    })
    .select('id')
    .single()

  if (copyError || !copy) {
    console.error('[duplicateTastingMenu] Error:', copyError)
    throw new Error('Failed to duplicate tasting menu')
  }

  // Copy all courses
  const { data: courses, error: coursesError } = await db
    .from('tasting_menu_courses')
    .select('*')
    .eq('tasting_menu_id', id)
    .order('course_number', { ascending: true })

  if (coursesError) {
    console.error('[duplicateTastingMenu] Courses error:', coursesError)
    // Menu was created but courses failed; still return success with the new ID
    revalidatePath('/menus/tasting')
    return { success: true, id: copy.id }
  }

  if (courses && courses.length > 0) {
    const courseCopies = courses.map((c: any) => ({
      tasting_menu_id: copy.id,
      course_number: c.course_number,
      course_type: c.course_type,
      dish_name: c.dish_name,
      description: c.description,
      recipe_id: c.recipe_id,
      wine_pairing: c.wine_pairing,
      pairing_notes: c.pairing_notes,
      portion_size: c.portion_size,
      prep_notes: c.prep_notes,
    }))

    const { error: insertError } = await db.from('tasting_menu_courses').insert(courseCopies)

    if (insertError) {
      console.error('[duplicateTastingMenu] Course copy error:', insertError)
    }
  }

  revalidatePath('/menus/tasting')
  return { success: true, id: copy.id }
}
