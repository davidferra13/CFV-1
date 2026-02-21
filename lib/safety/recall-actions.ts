'use server'

// FDA Food Recall Monitoring
// Fetches live data from the FDA openFDA enforcement API.
// No dedicated table — recalls are fetched fresh each time.
// TODO: Store dismissed_recall_ids per chef in a JSONB column on the chefs table
//       (requires migration: ALTER TABLE chefs ADD COLUMN IF NOT EXISTS dismissed_recall_ids TEXT[] DEFAULT '{}')

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
      // Cache for 1 hour — FDA data doesn't change minute-by-minute
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
 * Pure function — no DB access. Filters recalls that fuzzy-match any of the
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
 * Dismiss a recall for the current chef session.
 * TODO: Persist dismissed IDs to chefs.dismissed_recall_ids once migration is applied.
 * For now, this is a no-op that logs the intent.
 */
export async function dismissRecall(recallId: string): Promise<{ success: boolean }> {
  // TODO: Persist to chefs table:
  //   await supabase
  //     .from('chefs')
  //     .update({ dismissed_recall_ids: sql`array_append(dismissed_recall_ids, ${recallId})` })
  //     .eq('id', tenantId)
  console.warn(
    '[recall-actions] dismissRecall called for',
    recallId,
    '— persistence not yet implemented'
  )
  return { success: true }
}
