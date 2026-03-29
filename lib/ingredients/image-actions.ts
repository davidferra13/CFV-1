'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'

/**
 * Resolve a single ingredient's image by matching against the OpenClaw catalog.
 * If a match is found, caches the image URL in the ingredients table.
 */
export async function resolveIngredientImage(ingredientId: string): Promise<{
  success: boolean
  imageUrl: string | null
  error?: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get the ingredient
  const { data: ingredient, error: fetchErr } = await db
    .from('ingredients')
    .select('id, name, image_url, category')
    .eq('id', ingredientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !ingredient) {
    return { success: false, imageUrl: null, error: 'Ingredient not found' }
  }

  // Already has an image (chef-uploaded takes priority)
  if (ingredient.image_url) {
    return { success: true, imageUrl: ingredient.image_url }
  }

  // Search the OpenClaw catalog for a match
  const imageUrl = await lookupCatalogImage(ingredient.name)

  if (!imageUrl) {
    return { success: true, imageUrl: null }
  }

  // Cache the resolved image URL
  const { error: updateErr } = await db
    .from('ingredients')
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('id', ingredientId)
    .eq('tenant_id', user.tenantId!)

  if (updateErr) {
    console.error('[resolveIngredientImage] Failed to cache image URL:', updateErr)
    // Still return the URL even if caching failed
    return { success: true, imageUrl }
  }

  return { success: true, imageUrl }
}

/**
 * Batch resolve images for all ingredients that don't have one yet.
 * Searches the OpenClaw catalog for matches and caches results.
 */
export async function enrichIngredientImages(): Promise<{
  success: boolean
  matched: number
  unmatched: number
  alreadyHaveImage: number
  error?: string
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all ingredients without images
  const { data: ingredients, error: fetchErr } = await db
    .from('ingredients')
    .select('id, name, category')
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)
    .is('image_url', null)
    .order('name', { ascending: true })

  if (fetchErr) {
    return {
      success: false,
      matched: 0,
      unmatched: 0,
      alreadyHaveImage: 0,
      error: 'Failed to fetch ingredients',
    }
  }

  if (!ingredients || ingredients.length === 0) {
    // Count how many already have images
    const { data: withImages } = await db
      .from('ingredients')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('archived', false)
      .not('image_url', 'is', null)

    return {
      success: true,
      matched: 0,
      unmatched: 0,
      alreadyHaveImage: withImages?.length ?? 0,
    }
  }

  let matched = 0
  let unmatched = 0

  // Process in batches to avoid overwhelming the API
  const BATCH_SIZE = 10
  for (let i = 0; i < ingredients.length; i += BATCH_SIZE) {
    const batch = ingredients.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map(async (ing: any) => {
        const imageUrl = await lookupCatalogImage(ing.name)
        if (imageUrl) {
          await db
            .from('ingredients')
            .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
            .eq('id', ing.id)
            .eq('tenant_id', user.tenantId!)
          matched++
        } else {
          unmatched++
        }
      })
    )

    // Log any batch failures
    results.forEach((r, idx) => {
      if (r.status === 'rejected') {
        console.warn(`[enrichIngredientImages] Failed for ${batch[idx]?.name}:`, r.reason)
        unmatched++
      }
    })
  }

  revalidatePath('/culinary/ingredients')
  revalidatePath('/recipes/ingredients')

  return { success: true, matched, unmatched, alreadyHaveImage: 0 }
}

/**
 * Look up a catalog image by ingredient name.
 * Uses the OpenClaw Pi API to search for the ingredient and extract imageUrl.
 */
async function lookupCatalogImage(name: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const params = new URLSearchParams({ search: name, limit: '1' })
    const res = await fetch(`${OPENCLAW_API}/api/ingredients?${params}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) return null

    const data = await res.json()
    const items = data.ingredients || data.items || []

    if (items.length === 0) return null

    // Use the first match's image if the name is a close enough match
    const item = items[0]
    const itemName = (item.name || '').toLowerCase().trim()
    const searchName = name.toLowerCase().trim()

    // Only accept if the catalog name contains our ingredient name or vice versa
    if (!itemName.includes(searchName) && !searchName.includes(itemName)) {
      return null
    }

    return item.image_url || null
  } catch {
    return null
  }
}
