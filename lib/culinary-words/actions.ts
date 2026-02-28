'use server'

import { requireChef, requireChefAdmin } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { WordCategory, WordTier } from './constants'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type UserCulinaryWord = {
  id: string
  chefId: string
  word: string
  tier: WordTier
  category: WordCategory
  createdAt: string
}

export type AdminWordView = UserCulinaryWord & {
  chefEmail?: string
}

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

const AddWordSchema = z.object({
  word: z
    .string()
    .min(1, 'Word is required')
    .max(60, 'Word must be 60 characters or less')
    .transform((w) => w.trim()),
  tier: z.coerce.number().min(1).max(4).default(3) as z.ZodType<WordTier>,
  category: z.enum([
    'texture',
    'flavor',
    'temperature',
    'mouthfeel',
    'aroma',
    'technique',
    'visual',
    'composition',
    'emotion',
    'sauce',
    'action',
  ]) as z.ZodType<WordCategory>,
})

export type AddWordInput = z.infer<typeof AddWordSchema>

// ─────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────

/** Get all user-added words for the current chef */
export async function getUserCulinaryWords(): Promise<UserCulinaryWord[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('chef_culinary_words')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getUserCulinaryWords] Error:', error)
    return []
  }

  return (data || []).map(mapRow)
}

/** Add a new word to the current chef's board */
export async function addCulinaryWord(
  input: AddWordInput
): Promise<{ success: boolean; word: UserCulinaryWord }> {
  const validated = AddWordSchema.parse(input)
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: row, error } = await supabase
    .from('chef_culinary_words')
    .insert({
      chef_id: user.tenantId!,
      word: validated.word,
      tier: validated.tier,
      category: validated.category,
    })
    .select()
    .single()

  if (error) {
    console.error('[addCulinaryWord] Error:', error)
    throw new Error('Failed to add word')
  }

  revalidatePath('/culinary-board')
  return { success: true, word: mapRow(row) }
}

/** Remove a user-added word (own words only) */
export async function removeCulinaryWord(id: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('chef_culinary_words')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[removeCulinaryWord] Error:', error)
    throw new Error('Failed to remove word')
  }

  revalidatePath('/culinary-board')
  return { success: true }
}

/** Admin: get ALL user-submitted words across all chefs */
export async function getAllUserWords(): Promise<AdminWordView[]> {
  await requireChefAdmin()
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('chef_culinary_words')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[getAllUserWords] Error:', error)
    return []
  }

  return (data || []).map(mapRow)
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): UserCulinaryWord {
  return {
    id: row.id as string,
    chefId: row.chef_id as string,
    word: row.word as string,
    tier: row.tier as WordTier,
    category: row.category as WordCategory,
    createdAt: row.created_at as string,
  }
}
