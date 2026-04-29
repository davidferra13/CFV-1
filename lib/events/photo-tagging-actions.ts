// Photo Tagging Server Actions
// Provides heuristic-based photo tag suggestions and tag confirmation.
// Uses event_photos table if available; otherwise returns suggested tags.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

type PhotoTagSuggestion = {
  suggestedTags: string[]
  dishGuess: string | null
}

type ConfirmedPhotoTag = {
  photoId: string
  tags: string[]
}

// --- Schemas ---

const PhotoUrlSchema = z.string().min(1, 'Photo URL is required')
const ConfirmPhotoTagSchema = z.object({
  photoId: z.string().uuid(),
  tags: z.array(z.string().min(1)).min(1, 'At least one tag required'),
})

// --- Heuristic tag map ---

const FILENAME_TAG_MAP: Record<string, string[]> = {
  plat: ['plated', 'presentation'],
  plate: ['plated', 'presentation'],
  steak: ['steak', 'protein', 'entree'],
  salmon: ['salmon', 'fish', 'protein', 'entree'],
  chicken: ['chicken', 'poultry', 'protein', 'entree'],
  pasta: ['pasta', 'entree'],
  dessert: ['dessert', 'sweet'],
  cake: ['cake', 'dessert', 'sweet'],
  salad: ['salad', 'starter', 'vegetable'],
  soup: ['soup', 'starter'],
  appetizer: ['appetizer', 'starter'],
  app: ['appetizer', 'starter'],
  cocktail: ['cocktail', 'beverage'],
  wine: ['wine', 'beverage'],
  drink: ['beverage'],
  table: ['table-setting', 'presentation'],
  setup: ['setup', 'preparation'],
  prep: ['prep', 'preparation'],
  kitchen: ['kitchen', 'behind-the-scenes'],
  buffet: ['buffet', 'service-style'],
  charcuterie: ['charcuterie', 'appetizer', 'board'],
  cheese: ['cheese', 'dairy'],
  bread: ['bread', 'baking'],
  grill: ['grilled', 'cooking-method'],
  bbq: ['bbq', 'grilled', 'cooking-method'],
  sushi: ['sushi', 'japanese', 'raw-fish'],
  taco: ['taco', 'mexican'],
  burger: ['burger', 'casual'],
  seafood: ['seafood', 'protein'],
  vegan: ['vegan', 'plant-based'],
  vegetarian: ['vegetarian', 'plant-based'],
  brunch: ['brunch', 'morning'],
  breakfast: ['breakfast', 'morning'],
  receipt: ['receipt', 'expense'],
}

// --- Actions ---

/**
 * Suggest tags for a photo based on its URL/filename pattern.
 * This is a heuristic approach - no AI involved.
 * Returns suggested tags and a best-guess dish name.
 */
export async function suggestPhotoTags(photoUrl: string): Promise<PhotoTagSuggestion> {
  await requireChef()

  const validatedUrl = PhotoUrlSchema.parse(photoUrl)

  // Extract filename from URL (handles both path and query params)
  const urlPath = validatedUrl.split('?')[0]
  const segments = urlPath.split('/')
  const filename = (segments[segments.length - 1] || '').toLowerCase()

  // Remove file extension
  const baseName = filename.replace(/\.[^.]+$/, '')

  // Split by common separators: hyphens, underscores, spaces, dots
  const tokens = baseName.split(/[-_.\s]+/).filter(Boolean)

  const suggestedTags = new Set<string>()
  let dishGuess: string | null = null

  for (const token of tokens) {
    for (const [keyword, tags] of Object.entries(FILENAME_TAG_MAP)) {
      if (token.includes(keyword)) {
        for (const tag of tags) {
          suggestedTags.add(tag)
        }
        // Use the first food-related keyword as dish guess
        if (!dishGuess && !['setup', 'prep', 'kitchen', 'table', 'receipt'].includes(keyword)) {
          dishGuess = keyword.charAt(0).toUpperCase() + keyword.slice(1)
        }
      }
    }
  }

  // Add generic tags if nothing matched
  if (suggestedTags.size === 0) {
    suggestedTags.add('food')
    suggestedTags.add('event')
  }

  // Detect image type from extension
  const extension = filename.split('.').pop()?.toLowerCase()
  if (extension === 'png' || extension === 'jpg' || extension === 'jpeg' || extension === 'webp') {
    suggestedTags.add('photo')
  }

  return {
    suggestedTags: Array.from(suggestedTags),
    dishGuess,
  }
}

/**
 * Confirm and store tags for a photo.
 * Updates the event_photos table with confirmed tags.
 */
export async function confirmPhotoTag(
  photoId: string,
  tags: string[]
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const validated = ConfirmPhotoTagSchema.parse({ photoId, tags })

  // Try to update the event_photos table
  const { data: photo, error: fetchError } = await db
    .from('event_photos')
    .select('id, event_id')
    .eq('id', validated.photoId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !photo) {
    console.warn('[confirmPhotoTag] Photo not found or table missing:', fetchError?.message)
    return { success: false, error: 'Photo not found. Refresh the event and try again.' }
  }

  const { error: updateError } = await db
    .from('event_photos')
    .update({ tags: validated.tags })
    .eq('id', validated.photoId)
    .eq('chef_id', user.tenantId!)

  if (updateError) {
    console.error('[confirmPhotoTag] Error:', updateError)
    throw new Error('Failed to update photo tags')
  }

  if (photo.event_id) {
    revalidatePath(`/events/${photo.event_id}`)
  }

  return { success: true }
}
