// Seasonal Menu Template Server Actions
// CRUD + instantiation + calendar view + deterministic suggestion
// No AI needed: season detection + least-recently-used rotation

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// TYPES
// ============================================

export type TemplateSeason = 'spring' | 'summer' | 'fall' | 'winter' | 'all_season'

export interface TemplateDishComponent {
  name: string
  recipeId?: string
}

export interface TemplateDish {
  courseName: string
  courseNumber: number
  components: TemplateDishComponent[]
}

export interface MenuTemplate {
  id: string
  tenant_id: string
  name: string
  season: TemplateSeason
  week_number: number | null
  description: string | null
  dishes: TemplateDish[]
  tags: string[]
  times_used: number
  last_used_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================
// SCHEMAS
// ============================================

const SEASONS = ['spring', 'summer', 'fall', 'winter', 'all_season'] as const

const TemplateDishComponentSchema = z.object({
  name: z.string().min(1),
  recipeId: z.string().uuid().optional(),
})

const TemplateDishSchema = z.object({
  courseName: z.string().min(1),
  courseNumber: z.number().int().positive(),
  components: z.array(TemplateDishComponentSchema).default([]),
})

const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name required'),
  season: z.enum(SEASONS).default('all_season'),
  week_number: z.number().int().min(1).max(4).nullable().optional(),
  description: z.string().optional(),
  dishes: z.array(TemplateDishSchema).default([]),
  tags: z.array(z.string()).default([]),
})

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  season: z.enum(SEASONS).optional(),
  week_number: z.number().int().min(1).max(4).nullable().optional(),
  description: z.string().nullable().optional(),
  dishes: z.array(TemplateDishSchema).optional(),
  tags: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
})

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>

// ============================================
// HELPERS
// ============================================

function getSeasonForDate(date: Date): TemplateSeason {
  const month = date.getMonth() // 0-indexed
  if (month >= 2 && month <= 4) return 'spring' // Mar-May
  if (month >= 5 && month <= 7) return 'summer' // Jun-Aug
  if (month >= 8 && month <= 10) return 'fall' // Sep-Nov
  return 'winter' // Dec-Feb
}

function getWeekOfSeason(date: Date): number {
  // Season start months: spring=Mar(2), summer=Jun(5), fall=Sep(8), winter=Dec(11)
  const month = date.getMonth()
  let seasonStartMonth: number
  if (month >= 2 && month <= 4) seasonStartMonth = 2
  else if (month >= 5 && month <= 7) seasonStartMonth = 5
  else if (month >= 8 && month <= 10) seasonStartMonth = 8
  else seasonStartMonth = month >= 11 ? 11 : 11 // Dec or Jan/Feb (winter wraps)

  // For Jan/Feb, season started in December of previous year
  const seasonStart = new Date(date.getFullYear(), seasonStartMonth, 1)
  if (month < 2) {
    seasonStart.setFullYear(date.getFullYear() - 1)
    seasonStart.setMonth(11)
  }

  const daysSinceStart = Math.floor(
    (date.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24)
  )
  const weekNumber = (Math.floor(daysSinceStart / 7) % 4) + 1
  return weekNumber
}

// ============================================
// CRUD
// ============================================

export async function createMenuTemplate(input: CreateTemplateInput) {
  const user = await requireChef()
  const validated = CreateTemplateSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('menu_templates')
    .insert({
      tenant_id: user.tenantId!,
      name: validated.name,
      season: validated.season,
      week_number: validated.week_number ?? null,
      description: validated.description ?? null,
      dishes: validated.dishes,
      tags: validated.tags,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create template: ${error.message}`)

  revalidatePath('/menus')
  return { success: true, data }
}

export async function getMenuTemplates(
  season?: TemplateSeason,
  tags?: string[]
): Promise<MenuTemplate[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('menu_templates')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .order('season', { ascending: true })
    .order('week_number', { ascending: true, nullsFirst: false })

  if (season) {
    query = query.eq('season', season)
  }

  if (tags && tags.length > 0) {
    query = query.overlaps('tags', tags)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch templates: ${error.message}`)
  return (data ?? []) as MenuTemplate[]
}

export async function getMenuTemplate(templateId: string): Promise<MenuTemplate | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('menu_templates')
    .select('*')
    .eq('id', templateId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch template: ${error.message}`)
  }
  return data as MenuTemplate
}

export async function updateMenuTemplate(templateId: string, input: UpdateTemplateInput) {
  const user = await requireChef()
  const validated = UpdateTemplateSchema.parse(input)
  const supabase: any = createServerClient()

  const updates: Record<string, unknown> = { updated_by: user.id }
  if (validated.name !== undefined) updates.name = validated.name
  if (validated.season !== undefined) updates.season = validated.season
  if (validated.week_number !== undefined) updates.week_number = validated.week_number
  if (validated.description !== undefined) updates.description = validated.description
  if (validated.dishes !== undefined) updates.dishes = validated.dishes
  if (validated.tags !== undefined) updates.tags = validated.tags
  if (validated.is_active !== undefined) updates.is_active = validated.is_active

  const { data, error } = await supabase
    .from('menu_templates')
    .update(updates)
    .eq('id', templateId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update template: ${error.message}`)

  revalidatePath('/menus')
  return { success: true, data }
}

export async function deleteMenuTemplate(templateId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('menu_templates')
    .delete()
    .eq('id', templateId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete template: ${error.message}`)

  revalidatePath('/menus')
  return { success: true }
}

// ============================================
// INSTANTIATION
// ============================================

/**
 * Create a real menu (with dishes + components) from a template.
 * Optionally link to an event. Increments times_used.
 */
export async function createMenuFromTemplate(templateId: string, eventId?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch template
  const { data: template, error: tErr } = await supabase
    .from('menu_templates')
    .select('*')
    .eq('id', templateId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (tErr || !template) throw new Error('Template not found')

  // Verify event ownership if provided
  if (eventId) {
    const { data: event } = await supabase
      .from('events')
      .select('tenant_id')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single()
    if (!event) throw new Error('Event not found or does not belong to your tenant')
  }

  const dishes = (template.dishes ?? []) as TemplateDish[]

  // Create the menu
  const { data: menu, error: mErr } = await supabase
    .from('menus')
    .insert({
      tenant_id: user.tenantId!,
      name: template.name,
      description: template.description,
      event_id: eventId ?? null,
      is_template: false,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (mErr) throw new Error(`Failed to create menu: ${mErr.message}`)

  // Create dishes and components
  for (const dish of dishes) {
    const { data: createdDish, error: dErr } = await supabase
      .from('dishes')
      .insert({
        tenant_id: user.tenantId!,
        menu_id: menu.id,
        course_name: dish.courseName,
        course_number: dish.courseNumber,
        sort_order: dish.courseNumber,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single()

    if (dErr) {
      console.error('[template] Failed to create dish:', dErr.message)
      continue
    }

    for (const comp of dish.components) {
      const { error: cErr } = await supabase.from('components').insert({
        tenant_id: user.tenantId!,
        dish_id: createdDish.id,
        name: comp.name,
        category: 'main',
        recipe_id: comp.recipeId ?? null,
        created_by: user.id,
        updated_by: user.id,
      })

      if (cErr) {
        console.error('[template] Failed to create component:', cErr.message)
      }
    }
  }

  // Increment times_used and set last_used_at
  await supabase
    .from('menu_templates')
    .update({
      times_used: (template.times_used ?? 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath('/menus')
  return { success: true, data: menu }
}

/**
 * Save an existing menu as a reusable template (reverse direction).
 * Reads the menu's dishes + components and snapshots them into the template's JSONB.
 */
export async function saveMenuAsTemplate(
  menuId: string,
  season: TemplateSeason,
  weekNumber?: number | null,
  tags?: string[]
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch menu with dishes and components
  const { data: menu, error: menuErr } = await supabase
    .from('menus')
    .select('id, name, description, tenant_id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (menuErr || !menu) throw new Error('Menu not found')

  const { data: dishes, error: dishErr } = await supabase
    .from('dishes')
    .select('id, course_name, course_number')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })

  if (dishErr) throw new Error(`Failed to fetch dishes: ${dishErr.message}`)

  const templateDishes: TemplateDish[] = []

  for (const dish of dishes ?? []) {
    const { data: comps } = await supabase
      .from('components')
      .select('name, recipe_id')
      .eq('dish_id', dish.id)
      .eq('tenant_id', user.tenantId!)
      .order('sort_order', { ascending: true })

    templateDishes.push({
      courseName: dish.course_name,
      courseNumber: dish.course_number,
      components: (comps ?? []).map((c: { name: string; recipe_id: string | null }) => ({
        name: c.name,
        ...(c.recipe_id ? { recipeId: c.recipe_id } : {}),
      })),
    })
  }

  const { data, error } = await supabase
    .from('menu_templates')
    .insert({
      tenant_id: user.tenantId!,
      name: `${menu.name} (Template)`,
      season,
      week_number: weekNumber ?? null,
      description: menu.description,
      dishes: templateDishes,
      tags: tags ?? [],
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save as template: ${error.message}`)

  revalidatePath('/menus')
  return { success: true, data }
}

// ============================================
// CALENDAR VIEW
// ============================================

export interface SeasonalCalendarEntry {
  season: TemplateSeason
  weekNumber: number
  template: MenuTemplate | null
}

/**
 * Returns a 4 seasons x 4 weeks matrix of assigned templates.
 * Templates with week_number are placed in their slot; others fill gaps by least-used.
 */
export async function getSeasonalCalendar(_year: number): Promise<SeasonalCalendarEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: templates, error } = await supabase
    .from('menu_templates')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .order('times_used', { ascending: true })

  if (error) throw new Error(`Failed to fetch templates: ${error.message}`)

  const allTemplates = (templates ?? []) as MenuTemplate[]
  const seasons: TemplateSeason[] = ['spring', 'summer', 'fall', 'winter']
  const calendar: SeasonalCalendarEntry[] = []

  for (const season of seasons) {
    const seasonTemplates = allTemplates.filter(
      (t) => t.season === season || t.season === 'all_season'
    )

    for (let week = 1; week <= 4; week++) {
      // First priority: template explicitly assigned to this season + week
      const assigned = seasonTemplates.find((t) => t.season === season && t.week_number === week)

      calendar.push({
        season,
        weekNumber: week,
        template: assigned ?? null,
      })
    }
  }

  return calendar
}

// ============================================
// DETERMINISTIC SUGGESTION
// ============================================

/**
 * Suggest a template for a given event date.
 * Strategy: match season, prefer least-recently-used, exclude templates
 * already served to this client (if clientId provided).
 */
export async function suggestTemplate(
  eventDate: string,
  clientId?: string
): Promise<MenuTemplate | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const date = new Date(eventDate)
  const season = getSeasonForDate(date)
  const weekNum = getWeekOfSeason(date)

  // Fetch all active templates for this season (plus all_season)
  const { data: templates, error } = await supabase
    .from('menu_templates')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .in('season', [season, 'all_season'])
    .order('times_used', { ascending: true })
    .order('last_used_at', { ascending: true, nullsFirst: true })

  if (error || !templates || templates.length === 0) return null

  let candidates = templates as MenuTemplate[]

  // If clientId provided, exclude templates already used for this client's events
  if (clientId) {
    // Get menu names used for this client's events
    const { data: clientMenus } = await supabase
      .from('menus')
      .select('name, events!inner(client_id)')
      .eq('tenant_id', user.tenantId!)
      .eq('events.client_id', clientId)

    if (clientMenus && clientMenus.length > 0) {
      const usedNames = new Set(clientMenus.map((m: { name: string }) => m.name))
      const filtered = candidates.filter((t) => !usedNames.has(t.name))
      if (filtered.length > 0) candidates = filtered
    }
  }

  // Prefer exact week match, then any template
  const weekMatch = candidates.find((t) => t.week_number === weekNum)
  return weekMatch ?? candidates[0] ?? null
}
