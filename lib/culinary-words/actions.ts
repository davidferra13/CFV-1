'use server'

import { requireChef, requireChefAdmin } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { normalizeCulinaryTerm, slugifyCulinaryTerm } from '@/lib/culinary-dictionary/normalization'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { WordCategory, WordTier } from './constants'
import type { DictionaryTermType } from '@/lib/culinary-dictionary/types'

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
  const db: any = createServerClient()

  const { data, error } = await db
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
  const db: any = createServerClient()

  const { data: row, error } = await db
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

  try {
    await queueCulinaryWordDictionaryReview(db, {
      chefId: user.tenantId ?? user.entityId,
      word: validated.word,
      category: validated.category,
      tier: validated.tier,
    })
  } catch (err) {
    console.warn('[non-blocking] Culinary dictionary review queue failed', err)
  }

  revalidatePath('/culinary-board')
  revalidatePath('/culinary/dictionary')
  return { success: true, word: mapRow(row) }
}

/** Remove a user-added word (own words only) */
export async function removeCulinaryWord(id: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
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
  const db = createServerClient({ admin: true })

  const { data, error } = await db
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

function dictionaryTermTypeForWordCategory(category: WordCategory): DictionaryTermType {
  if (category === 'technique' || category === 'action') return 'technique'
  if (category === 'sauce') return 'sauce'
  if (category === 'texture' || category === 'mouthfeel') return 'texture'
  if (category === 'flavor' || category === 'aroma') return 'flavor'
  if (category === 'composition' || category === 'visual') return 'composition'
  return 'other'
}

async function queueCulinaryWordDictionaryReview(
  db: any,
  input: {
    chefId: string
    word: string
    category: WordCategory
    tier: WordTier
  }
): Promise<void> {
  const normalizedValue = normalizeCulinaryTerm(input.word)
  if (!normalizedValue) return

  const { data: existing, error: lookupError } = await db
    .from('culinary_dictionary_review_queue' as any)
    .select('id')
    .eq('chef_id', input.chefId)
    .eq('source_surface', 'culinary_board')
    .eq('normalized_value', normalizedValue)
    .eq('status', 'pending')
    .limit(1)

  if (lookupError) throw lookupError
  if (existing?.length) return

  const { error } = await db.from('culinary_dictionary_review_queue' as any).insert({
    chef_id: input.chefId,
    source_surface: 'culinary_board',
    source_value: input.word,
    normalized_value: normalizedValue,
    confidence: input.tier <= 2 ? 0.8 : 0.65,
    status: 'pending',
    resolution: {
      canonicalName: input.word,
      canonicalSlug: slugifyCulinaryTerm(input.word),
      termType: dictionaryTermTypeForWordCategory(input.category),
      category: input.category,
      source: 'culinary_board',
      tier: input.tier,
    },
  })

  if (error) throw error
}
