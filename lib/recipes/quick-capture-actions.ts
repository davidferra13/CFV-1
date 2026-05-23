// Quick-Capture Recipe Actions
// Minimal-friction recipe creation: name + optional photo/notes/transcript
// Saves as draft status for later refinement

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { invalidateRemyContextCache } from '@/lib/ai/remy-context'
import { z } from 'zod'

// ── Validation ─────────────────────────────────────────────────────────────

const QuickCaptureSchema = z.object({
  name: z.string().min(1, 'Recipe name is required').max(200),
  notes: z.string().max(10000).optional(),
  captureSource: z.enum(['photo', 'voice', 'text']).default('text'),
  transcript: z.string().max(10000).optional(),
  category: z
    .enum([
      'sauce',
      'protein',
      'starch',
      'vegetable',
      'fruit',
      'dessert',
      'bread',
      'pasta',
      'soup',
      'salad',
      'appetizer',
      'condiment',
      'beverage',
      'other',
    ])
    .default('other'),
})

export type QuickCaptureInput = z.infer<typeof QuickCaptureSchema>

// ── Create Quick Recipe ────────────────────────────────────────────────────

export async function createQuickRecipe(
  input: QuickCaptureInput
): Promise<{ success: true; recipeId: string } | { success: false; error: string }> {
  const user = await requireChef()
  const rl = await checkRateLimit(`quickCapture:${user.id}`)
  if (!rl.success) {
    return { success: false, error: 'Rate limit exceeded. Please try again shortly.' }
  }

  const parsed = QuickCaptureSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }
  const { name, notes, captureSource, transcript, category } = parsed.data

  const db: any = createServerClient()

  // Build notes combining raw notes and transcript with capture source tag
  const combinedNotes = [
    `[quick-capture:${captureSource}]`,
    notes ? notes : null,
    transcript ? `--- Voice Transcript ---\n${transcript}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')

  const { data: recipe, error } = await db
    .from('recipes')
    .insert({
      tenant_id: user.tenantId!,
      name,
      category,
      method: '',
      notes: combinedNotes || null,
      status: 'draft',
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[quickCapture] Insert failed:', error)
    return { success: false, error: 'Failed to save recipe' }
  }

  revalidatePath('/recipes')
  revalidatePath('/recipes/quick-capture')
  invalidateRemyContextCache(user.tenantId!)

  return { success: true, recipeId: recipe.id }
}

// ── Upload Quick Capture Photo ─────────────────────────────────────────────

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
] as const

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function uploadQuickCapturePhoto(
  recipeId: string,
  formData: FormData
): Promise<{ success: true; photoUrl: string } | { success: false; error: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify recipe belongs to this tenant
  const { data: recipe } = await db
    .from('recipes')
    .select('id')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) return { success: false, error: 'Recipe not found' }

  const file = formData.get('photo') as File | null
  if (!file || file.size === 0) return { success: false, error: 'No file provided' }
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return { success: false, error: 'Invalid file type. Accepted: JPEG, PNG, HEIC, WebP' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB`,
    }
  }

  const ext = MIME_TO_EXT[file.type]
  const storagePath = `${user.tenantId}/recipes/${recipeId}.${ext}`

  const { error: uploadError } = await db.storage
    .from('dish-photos')
    .upload(storagePath, file, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('[quickCapture] Photo upload failed:', uploadError)
    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  const {
    data: { publicUrl },
  } = await db.storage.from('dish-photos').getPublicUrl(storagePath)

  const { error: updateError } = await db
    .from('recipes')
    .update({ photo_url: publicUrl })
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    console.error('[quickCapture] Photo DB update failed:', updateError)
    return { success: false, error: 'Failed to save photo' }
  }

  revalidatePath(`/recipes/${recipeId}`)
  revalidatePath('/recipes')
  return { success: true, photoUrl: publicUrl }
}
