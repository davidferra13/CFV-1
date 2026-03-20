'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type KitchenAssessment = {
  id: string
  chef_id: string
  client_id: string | null
  event_id: string | null
  location_name: string
  has_oven: boolean
  has_stovetop: boolean
  burner_count: number | null
  has_microwave: boolean
  has_food_processor: boolean
  has_blender: boolean
  has_stand_mixer: boolean
  has_grill: boolean
  has_dishwasher: boolean
  counter_space: string | null
  refrigerator_space: string | null
  freezer_space: string | null
  constraints: string[]
  equipment_to_bring: string[]
  photos: any[]
  notes: string | null
  assessed_at: string | null
  created_at: string
}

const KitchenAssessmentSchema = z.object({
  client_id: z.string().uuid().optional().nullable(),
  event_id: z.string().uuid().optional().nullable(),
  location_name: z.string().min(1).max(200),
  has_oven: z.boolean().default(false),
  has_stovetop: z.boolean().default(false),
  burner_count: z.number().int().min(0).max(12).optional().nullable(),
  has_microwave: z.boolean().default(false),
  has_food_processor: z.boolean().default(false),
  has_blender: z.boolean().default(false),
  has_stand_mixer: z.boolean().default(false),
  has_grill: z.boolean().default(false),
  has_dishwasher: z.boolean().default(false),
  counter_space: z.enum(['limited', 'adequate', 'spacious']).optional().nullable(),
  refrigerator_space: z.enum(['limited', 'adequate', 'spacious']).optional().nullable(),
  freezer_space: z.enum(['limited', 'adequate', 'spacious']).optional().nullable(),
  constraints: z.array(z.string()).default([]),
  equipment_to_bring: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional().nullable(),
})

export async function getKitchenAssessments(clientId?: string): Promise<KitchenAssessment[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('kitchen_assessments')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('assessed_at', { ascending: false, nullsFirst: false })

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[kitchen] Load failed:', error.message)
    return []
  }
  return data ?? []
}

export async function getKitchenAssessment(id: string): Promise<KitchenAssessment | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('kitchen_assessments')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (error) return null
  return data
}

export async function createKitchenAssessment(
  input: z.infer<typeof KitchenAssessmentSchema>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const parsed = KitchenAssessmentSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid assessment data.' }

  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('kitchen_assessments')
    .insert({
      chef_id: user.entityId,
      client_id: parsed.data.client_id ?? null,
      event_id: parsed.data.event_id ?? null,
      location_name: parsed.data.location_name,
      has_oven: parsed.data.has_oven,
      has_stovetop: parsed.data.has_stovetop,
      burner_count: parsed.data.burner_count ?? null,
      has_microwave: parsed.data.has_microwave,
      has_food_processor: parsed.data.has_food_processor,
      has_blender: parsed.data.has_blender,
      has_stand_mixer: parsed.data.has_stand_mixer,
      has_grill: parsed.data.has_grill,
      has_dishwasher: parsed.data.has_dishwasher,
      counter_space: parsed.data.counter_space ?? null,
      refrigerator_space: parsed.data.refrigerator_space ?? null,
      freezer_space: parsed.data.freezer_space ?? null,
      constraints: parsed.data.constraints,
      equipment_to_bring: parsed.data.equipment_to_bring,
      notes: parsed.data.notes ?? null,
      assessed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[kitchen] Create failed:', error.message)
    return { success: false, error: 'Failed to save assessment.' }
  }

  if (parsed.data.client_id) {
    revalidatePath(`/clients/${parsed.data.client_id}`)
  }
  return { success: true, id: data.id }
}

export async function updateKitchenAssessment(
  id: string,
  input: z.infer<typeof KitchenAssessmentSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const parsed = KitchenAssessmentSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid assessment data.' }

  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('kitchen_assessments')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[kitchen] Update failed:', error.message)
    return { success: false, error: 'Failed to update assessment.' }
  }

  return { success: true }
}

export async function deleteKitchenAssessment(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('kitchen_assessments')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) return { success: false, error: 'Failed to delete assessment.' }
  return { success: true }
}
