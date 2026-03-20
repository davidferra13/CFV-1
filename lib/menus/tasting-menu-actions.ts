// Tasting Menu Builder - Server Actions
// Multi-course tasting menu CRUD with course management and duplication

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
  const supabase: any = createServerClient()

  const { data, error } = await supabase
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
  const supabase: any = createServerClient()

  const { data: menu, error: menuError } = await supabase
    .from('tasting_menus')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (menuError || !menu) {
    console.error('[getTastingMenu] Error:', menuError)
    throw new Error('Tasting menu not found')
  }

  const { data: courses, error: coursesError } = await supabase
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
  const supabase: any = createServerClient()

  const { data, error } = await supabase
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
  const supabase: any = createServerClient()

  const { error } = await supabase
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

  revalidatePath('/menus/tasting')
  return { success: true }
}

// ─── Delete Tasting Menu ────────────────────────────────────────────────────────

export async function deleteTastingMenu(id: string): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
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

// ─── Add Course ─────────────────────────────────────────────────────────────────

export async function addCourse(
  menuId: string,
  input: CourseInput
): Promise<{ success: true; id: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify menu ownership
  const { data: menu, error: menuError } = await supabase
    .from('tasting_menus')
    .select('id')
    .eq('id', menuId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (menuError || !menu) {
    throw new Error('Tasting menu not found')
  }

  const { data, error } = await supabase
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

  revalidatePath('/menus/tasting')
  return { success: true, id: data.id }
}

// ─── Update Course ──────────────────────────────────────────────────────────────

export async function updateCourse(
  courseId: string,
  input: Partial<CourseInput>
): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify ownership via join
  const { data: course, error: findError } = await supabase
    .from('tasting_menu_courses')
    .select('id, tasting_menus!inner(chef_id)')
    .eq('id', courseId)
    .single()

  if (findError || !course) {
    throw new Error('Course not found')
  }

  const menuData = course.tasting_menus as unknown as { chef_id: string }
  if (menuData.chef_id !== user.tenantId!) {
    throw new Error('Not authorized')
  }

  const { error } = await supabase.from('tasting_menu_courses').update(input).eq('id', courseId)

  if (error) {
    console.error('[updateCourse] Error:', error)
    throw new Error('Failed to update course')
  }

  revalidatePath('/menus/tasting')
  return { success: true }
}

// ─── Remove Course ──────────────────────────────────────────────────────────────

export async function removeCourse(courseId: string): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify ownership via join
  const { data: course, error: findError } = await supabase
    .from('tasting_menu_courses')
    .select('id, tasting_menus!inner(chef_id)')
    .eq('id', courseId)
    .single()

  if (findError || !course) {
    throw new Error('Course not found')
  }

  const menuData = course.tasting_menus as unknown as { chef_id: string }
  if (menuData.chef_id !== user.tenantId!) {
    throw new Error('Not authorized')
  }

  const { error } = await supabase.from('tasting_menu_courses').delete().eq('id', courseId)

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
  const supabase: any = createServerClient()

  // Verify menu ownership
  const { data: menu, error: menuError } = await supabase
    .from('tasting_menus')
    .select('id')
    .eq('id', menuId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (menuError || !menu) {
    throw new Error('Tasting menu not found')
  }

  // Update each course's course_number based on position in array
  const updates = courseIds.map((courseId, index) =>
    supabase
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

  revalidatePath('/menus/tasting')
  return { success: true }
}

// ─── Duplicate Tasting Menu ─────────────────────────────────────────────────────

export async function duplicateTastingMenu(
  id: string,
  newName: string
): Promise<{ success: true; id: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get the original menu
  const { data: original, error: origError } = await supabase
    .from('tasting_menus')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (origError || !original) {
    throw new Error('Tasting menu not found')
  }

  // Create the copy
  const { data: copy, error: copyError } = await supabase
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
  const { data: courses, error: coursesError } = await supabase
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

    const { error: insertError } = await supabase.from('tasting_menu_courses').insert(courseCopies)

    if (insertError) {
      console.error('[duplicateTastingMenu] Course copy error:', insertError)
    }
  }

  revalidatePath('/menus/tasting')
  return { success: true, id: copy.id }
}
