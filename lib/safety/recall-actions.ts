'use server'

// FDA Food Recall Monitoring
// Fetches live data from the FDA openFDA enforcement API.
// Dismissed recall IDs are stored in chefs.dismissed_recall_ids (TEXT[]).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type RecallAlert = {
  id: string
  product_description: string
  reason_for_recall: string
  recall_initiation_date: string
  status: string
  distribution_pattern: string
}

export async function getActiveRecalls(): Promise<RecallAlert[]> {
  try {
    const url = 'https://api.fda.gov/food/enforcement.json?limit=20&skip=0&search=status:"Ongoing"'

    const res = await fetch(url, {
      headers: { 'User-Agent': 'ChefFlow/1.0' },
      // Cache for 1 hour - FDA data doesn't change minute-by-minute
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.warn('[recall-actions] FDA API returned non-OK status:', res.status)
      return []
    }

    const json = await res.json()
    const results = json?.results ?? []

    return results.map((r: Record<string, string>) => ({
      id: r.recall_number ?? `${r.product_description}-${r.recall_initiation_date}`,
      product_description: r.product_description ?? '',
      reason_for_recall: r.reason_for_recall ?? '',
      recall_initiation_date: r.recall_initiation_date ?? '',
      status: r.status ?? '',
      distribution_pattern: r.distribution_pattern ?? '',
    }))
  } catch (err) {
    console.error('[recall-actions] Failed to fetch FDA recalls:', err)
    return []
  }
}

/**
 * Pure function - no DB access. Filters recalls that fuzzy-match any of the
 * provided ingredient names by checking if any word in the ingredient appears
 * in the recall's product_description (case-insensitive).
 */
export async function matchRecallsToIngredients(
  recalls: RecallAlert[],
  ingredients: string[]
): Promise<RecallAlert[]> {
  if (!recalls.length || !ingredients.length) return []

  const lowerIngredients = ingredients.map((i) => i.toLowerCase().trim()).filter(Boolean)

  return recalls.filter((recall) => {
    const desc = recall.product_description.toLowerCase()
    return lowerIngredients.some((ingredient) => {
      // Split multi-word ingredients and check if any word matches
      const words = ingredient.split(/\s+/).filter((w) => w.length > 2)
      return words.some((word) => desc.includes(word))
    })
  })
}

/**
 * Dismiss a recall for the current chef.
 * Persists the dismissed ID to chefs.dismissed_recall_ids.
 */
export async function dismissRecall(recallId: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch current dismissed IDs to avoid duplicates
  const { data: chef } = await supabase
    .from('chefs')
    .select('dismissed_recall_ids')
    .eq('id', user.tenantId!)
    .single()

  const current: string[] = chef?.dismissed_recall_ids ?? []
  if (current.includes(recallId)) {
    return { success: true } // already dismissed
  }

  const { error } = await supabase
    .from('chefs')
    .update({ dismissed_recall_ids: [...current, recallId] })
    .eq('id', user.tenantId!)

  if (error) {
    console.error('[recall-actions] Failed to persist dismiss:', error.message)
    throw new Error('Failed to dismiss recall')
  }

  return { success: true }
}

/**
 * Get the list of recall IDs the current chef has dismissed.
 */
export async function getDismissedRecallIds(): Promise<string[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: chef } = await supabase
    .from('chefs')
    .select('dismissed_recall_ids')
    .eq('id', user.tenantId!)
    .single()

  return chef?.dismissed_recall_ids ?? []
}
