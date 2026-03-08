// Plating Guide Server Actions
// Chef-only: manage per-dish visual presentation instructions for staff
// Enforces tenant scoping via chef_id from session

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// TYPES
// ============================================

export type PlatingComponent = {
  name: string
  placement: string
  technique?: string
  notes?: string
}

export type PlatingGuide = {
  id: string
  chef_id: string
  recipe_id: string | null
  dish_name: string
  vessel: string | null
  components: PlatingComponent[]
  garnish: string | null
  sauce_technique: string | null
  temperature_notes: string | null
  reference_photo_url: string | null
  special_instructions: string | null
  created_at: string
  updated_at: string
}

// ============================================
// VALIDATION
// ============================================

const PlatingComponentSchema = z.object({
  name: z.string().min(1, 'Component name required'),
  placement: z.string().min(1, 'Placement description required'),
  technique: z.string().optional(),
  notes: z.string().optional(),
})

const CreatePlatingGuideSchema = z.object({
  recipe_id: z.string().uuid().optional().nullable(),
  dish_name: z.string().min(1, 'Dish name is required'),
  vessel: z.string().optional().nullable(),
  components: z.array(PlatingComponentSchema).default([]),
  garnish: z.string().optional().nullable(),
  sauce_technique: z.string().optional().nullable(),
  temperature_notes: z.string().optional().nullable(),
  reference_photo_url: z.string().url().optional().nullable(),
  special_instructions: z.string().optional().nullable(),
})

const UpdatePlatingGuideSchema = z.object({
  dish_name: z.string().min(1, 'Dish name is required').optional(),
  vessel: z.string().nullable().optional(),
  components: z.array(PlatingComponentSchema).optional(),
  garnish: z.string().nullable().optional(),
  sauce_technique: z.string().nullable().optional(),
  temperature_notes: z.string().nullable().optional(),
  reference_photo_url: z.string().url().nullable().optional(),
  special_instructions: z.string().nullable().optional(),
})

export type CreatePlatingGuideInput = z.infer<typeof CreatePlatingGuideSchema>
export type UpdatePlatingGuideInput = z.infer<typeof UpdatePlatingGuideSchema>

// ============================================
// 1. CREATE PLATING GUIDE
// ============================================

export async function createPlatingGuide(input: CreatePlatingGuideInput) {
  const user = await requireChef()
  const supabase = createServerClient()
  const validated = CreatePlatingGuideSchema.parse(input)

  const { data, error } = await supabase
    .from('plating_guides')
    .insert({
      chef_id: user.tenantId!,
      recipe_id: validated.recipe_id || null,
      dish_name: validated.dish_name,
      vessel: validated.vessel || null,
      components: validated.components as unknown as Record<string, unknown>,
      garnish: validated.garnish || null,
      sauce_technique: validated.sauce_technique || null,
      temperature_notes: validated.temperature_notes || null,
      reference_photo_url: validated.reference_photo_url || null,
      special_instructions: validated.special_instructions || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create plating guide: ${error.message}`)

  revalidatePath('/culinary/plating-guides')
  if (validated.recipe_id) {
    revalidatePath(`/recipes/${validated.recipe_id}`)
  }

  return data as unknown as PlatingGuide
}

// ============================================
// 2. UPDATE PLATING GUIDE
// ============================================

export async function updatePlatingGuide(id: string, input: UpdatePlatingGuideInput) {
  const user = await requireChef()
  const supabase = createServerClient()
  const validated = UpdatePlatingGuideSchema.parse(input)

  const updatePayload: Record<string, unknown> = {}
  if (validated.dish_name !== undefined) updatePayload.dish_name = validated.dish_name
  if (validated.vessel !== undefined) updatePayload.vessel = validated.vessel
  if (validated.components !== undefined) updatePayload.components = validated.components
  if (validated.garnish !== undefined) updatePayload.garnish = validated.garnish
  if (validated.sauce_technique !== undefined) updatePayload.sauce_technique = validated.sauce_technique
  if (validated.temperature_notes !== undefined) updatePayload.temperature_notes = validated.temperature_notes
  if (validated.reference_photo_url !== undefined) updatePayload.reference_photo_url = validated.reference_photo_url
  if (validated.special_instructions !== undefined) updatePayload.special_instructions = validated.special_instructions

  const { data, error } = await supabase
    .from('plating_guides')
    .update(updatePayload)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update plating guide: ${error.message}`)

  revalidatePath('/culinary/plating-guides')

  return data as unknown as PlatingGuide
}

// ============================================
// 3. DELETE PLATING GUIDE
// ============================================

export async function deletePlatingGuide(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('plating_guides')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete plating guide: ${error.message}`)

  revalidatePath('/culinary/plating-guides')
}

// ============================================
// 4. GET PLATING GUIDE FOR A RECIPE
// ============================================

export async function getPlatingGuide(recipeId: string): Promise<PlatingGuide | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('plating_guides')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('recipe_id', recipeId)
    .maybeSingle()

  if (error) throw new Error(`Failed to get plating guide: ${error.message}`)

  if (!data) return null
  return {
    ...data,
    components: (data.components as unknown as PlatingComponent[]) || [],
  } as PlatingGuide
}

// ============================================
// 5. GET ALL PLATING GUIDES
// ============================================

export async function getPlatingGuides(): Promise<PlatingGuide[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('plating_guides')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Failed to get plating guides: ${error.message}`)

  return (data || []).map((d) => ({
    ...d,
    components: (d.components as unknown as PlatingComponent[]) || [],
  })) as PlatingGuide[]
}

// ============================================
// 6. GET EVENT PLATING GUIDES
// ============================================
// Returns all plating guides for recipes used in an event's menu

export async function getEventPlatingGuides(eventId: string): Promise<PlatingGuide[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get the event's menu
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (!menus || menus.length === 0) return []

  const menuIds = menus.map((m) => m.id)

  // Get recipe IDs from dishes -> components -> recipes in those menus
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id')
    .in('menu_id', menuIds)

  if (!dishes || dishes.length === 0) return []

  const dishIds = dishes.map((d) => d.id)

  const { data: components } = await supabase
    .from('components')
    .select('recipe_id')
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  if (!components || components.length === 0) return []

  const recipeIds = [...new Set(components.map((c) => c.recipe_id).filter(Boolean))] as string[]

  // Get plating guides for those recipes
  const { data: guides, error } = await supabase
    .from('plating_guides')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .in('recipe_id', recipeIds)
    .order('dish_name', { ascending: true })

  if (error) throw new Error(`Failed to get event plating guides: ${error.message}`)

  return (guides || []).map((d) => ({
    ...d,
    components: (d.components as unknown as PlatingComponent[]) || [],
  })) as PlatingGuide[]
}
