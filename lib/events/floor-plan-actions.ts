// Floor Plan Server Actions
// CRUD for event floor plans with drag-and-drop element positioning

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type FloorPlanElement = {
  id: string
  type:
    | 'table_round'
    | 'table_rect'
    | 'station'
    | 'bar'
    | 'buffet'
    | 'entrance'
    | 'exit'
    | 'kitchen'
    | 'stage'
    | 'dance_floor'
    | 'restroom'
    | 'custom'
  label: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  color: string
  seats?: number
  notes?: string
}

export type FloorPlan = {
  id: string
  event_id: string
  chef_id: string
  name: string
  canvas_width: number
  canvas_height: number
  elements: FloorPlanElement[]
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Get floor plan for an event. Returns null if none exists.
 */
export async function getFloorPlan(eventId: string): Promise<FloorPlan | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_floor_plans')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to load floor plan: ${error.message}`)
  return data ?? null
}

/**
 * Create a new floor plan for an event with optional initial config.
 */
export async function createFloorPlan(
  eventId: string,
  input?: { name?: string; canvasWidth?: number; canvasHeight?: number }
): Promise<FloorPlan> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_floor_plans')
    .insert({
      event_id: eventId,
      chef_id: user.entityId,
      name: input?.name ?? 'Main Floor Plan',
      canvas_width: input?.canvasWidth ?? 800,
      canvas_height: input?.canvasHeight ?? 600,
      elements: [],
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create floor plan: ${error.message}`)

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/floor-plan`)
  return data
}

/**
 * Update floor plan elements (positions, sizes, labels, etc.).
 */
export async function updateFloorPlan(
  planId: string,
  elements: FloorPlanElement[],
  options?: { name?: string; notes?: string; canvasWidth?: number; canvasHeight?: number }
): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updatePayload: Record<string, unknown> = { elements }
  if (options?.name !== undefined) updatePayload.name = options.name
  if (options?.notes !== undefined) updatePayload.notes = options.notes
  if (options?.canvasWidth !== undefined) updatePayload.canvas_width = options.canvasWidth
  if (options?.canvasHeight !== undefined) updatePayload.canvas_height = options.canvasHeight

  const { error } = await supabase
    .from('event_floor_plans')
    .update(updatePayload)
    .eq('id', planId)
    .eq('chef_id', user.entityId)

  if (error) throw new Error(`Failed to update floor plan: ${error.message}`)

  return { success: true }
}

/**
 * Delete a floor plan.
 */
export async function deleteFloorPlan(planId: string): Promise<{ success: true }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get event_id for revalidation
  const { data: plan } = await supabase
    .from('event_floor_plans')
    .select('event_id')
    .eq('id', planId)
    .eq('chef_id', user.entityId)
    .single()

  const { error } = await supabase
    .from('event_floor_plans')
    .delete()
    .eq('id', planId)
    .eq('chef_id', user.entityId)

  if (error) throw new Error(`Failed to delete floor plan: ${error.message}`)

  if (plan?.event_id) {
    revalidatePath(`/events/${plan.event_id}`)
    revalidatePath(`/events/${plan.event_id}/floor-plan`)
  }

  return { success: true }
}

/**
 * Duplicate a floor plan to another event (or the same event).
 */
export async function duplicateFloorPlan(
  planId: string,
  targetEventId: string
): Promise<FloorPlan> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get source plan
  const { data: source, error: fetchError } = await supabase
    .from('event_floor_plans')
    .select('*')
    .eq('id', planId)
    .eq('chef_id', user.entityId)
    .single()

  if (fetchError || !source) throw new Error('Source floor plan not found')

  // Insert copy
  const { data, error } = await supabase
    .from('event_floor_plans')
    .insert({
      event_id: targetEventId,
      chef_id: user.entityId,
      name: `${source.name} (Copy)`,
      canvas_width: source.canvas_width,
      canvas_height: source.canvas_height,
      elements: source.elements,
      notes: source.notes,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to duplicate floor plan: ${error.message}`)

  revalidatePath(`/events/${targetEventId}`)
  revalidatePath(`/events/${targetEventId}/floor-plan`)
  return data
}
