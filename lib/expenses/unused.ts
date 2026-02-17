// Unused Ingredient Server Actions
// Track ingredients bought but not served, with disposition

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Schemas ---

const UnusedReasonEnum = z.enum(['leftover_reusable', 'wasted', 'returned'])

const LogUnusedSchema = z.object({
  event_id: z.string().uuid(),
  ingredient_name: z.string().min(1, 'Ingredient name is required'),
  reason: UnusedReasonEnum,
  estimated_cost_cents: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type LogUnusedInput = z.infer<typeof LogUnusedSchema>

// --- Actions ---

/**
 * Log an unused ingredient from an event
 */
export async function logUnusedIngredient(input: LogUnusedInput) {
  const user = await requireChef()
  const validated = LogUnusedSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('unused_ingredients')
    .insert({
      ...validated,
      tenant_id: user.tenantId!,
    })
    .select()
    .single()

  if (error) {
    console.error('[logUnusedIngredient] Error:', error)
    throw new Error('Failed to log unused ingredient')
  }

  revalidatePath(`/events/${validated.event_id}`)
  return { success: true, item: data }
}

/**
 * Get all unused ingredients for an event
 */
export async function getUnusedIngredients(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('unused_ingredients')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getUnusedIngredients] Error:', error)
    return []
  }

  return data
}

/**
 * Delete an unused ingredient record
 */
export async function deleteUnusedIngredient(id: string, eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('unused_ingredients')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteUnusedIngredient] Error:', error)
    throw new Error('Failed to delete unused ingredient')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Transfer a reusable leftover to another event
 * Adjusts cost attribution between events
 */
export async function transferUnusedToEvent(unusedId: string, targetEventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify the target event belongs to same tenant
  const { data: targetEvent } = await supabase
    .from('events')
    .select('id')
    .eq('id', targetEventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!targetEvent) {
    throw new Error('Target event not found')
  }

  const { data, error } = await supabase
    .from('unused_ingredients')
    .update({ transferred_to_event_id: targetEventId })
    .eq('id', unusedId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[transferUnusedToEvent] Error:', error)
    throw new Error('Failed to transfer ingredient')
  }

  revalidatePath(`/events/${data.event_id}`)
  revalidatePath(`/events/${targetEventId}`)
  return { success: true, item: data }
}
