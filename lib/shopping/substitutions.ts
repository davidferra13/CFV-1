// Shopping Substitution Server Actions
// Track post-shopping substitutions and build substitution knowledge base

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Schemas ---

const SubstitutionReasonEnum = z.enum([
  'unavailable',
  'price',
  'quality',
  'preference',
  'forgot',
  'other',
])

const LogSubstitutionSchema = z.object({
  event_id: z.string().uuid(),
  planned_ingredient: z.string().min(1, 'Planned ingredient is required'),
  actual_ingredient: z.string().min(1, 'Actual ingredient is required'),
  reason: SubstitutionReasonEnum.default('unavailable'),
  store_name: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type LogSubstitutionInput = z.infer<typeof LogSubstitutionSchema>

// --- Actions ---

/**
 * Record a shopping substitution
 */
export async function logSubstitution(input: LogSubstitutionInput) {
  const user = await requireChef()
  const validated = LogSubstitutionSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('shopping_substitutions')
    .insert({
      ...validated,
      tenant_id: user.tenantId!,
    })
    .select()
    .single()

  if (error) {
    console.error('[logSubstitution] Error:', error)
    throw new Error('Failed to log substitution')
  }

  revalidatePath(`/events/${validated.event_id}`)
  return { success: true, substitution: data }
}

/**
 * Get substitutions for a specific event
 */
export async function getSubstitutions(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('shopping_substitutions')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getSubstitutions] Error:', error)
    return []
  }

  return data
}

/**
 * Delete a substitution record
 */
export async function deleteSubstitution(id: string, eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('shopping_substitutions')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteSubstitution] Error:', error)
    throw new Error('Failed to delete substitution')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

/**
 * Get substitution history for a specific ingredient
 * "When mint was unavailable, you've used: basil (2x), no substitute (1x)"
 */
export async function getSubstitutionHistory(ingredientName: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('shopping_substitutions')
    .select('actual_ingredient, reason, store_name, created_at')
    .eq('tenant_id', user.tenantId!)
    .ilike('planned_ingredient', ingredientName)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  // Count substitutions by actual ingredient
  const counts: Record<string, number> = {}
  for (const sub of data) {
    counts[sub.actual_ingredient] = (counts[sub.actual_ingredient] || 0) + 1
  }

  return Object.entries(counts)
    .map(([ingredient, count]) => ({ ingredient, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Get most common substitutions across all events
 * Builds the substitution knowledge base over time
 */
export async function getCommonSubstitutions() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('shopping_substitutions')
    .select('planned_ingredient, actual_ingredient, reason')
    .eq('tenant_id', user.tenantId!)

  if (error || !data) return []

  const pairCounts: Record<string, { planned: string; actual: string; count: number }> = {}
  for (const sub of data) {
    const key = `${sub.planned_ingredient.toLowerCase()}|${sub.actual_ingredient.toLowerCase()}`
    if (!pairCounts[key]) {
      pairCounts[key] = {
        planned: sub.planned_ingredient,
        actual: sub.actual_ingredient,
        count: 0,
      }
    }
    pairCounts[key].count++
  }

  return Object.values(pairCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
}
