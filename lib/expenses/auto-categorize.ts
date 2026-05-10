'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { pgClient } from '@/lib/db'
import type { ExpenseCategory } from '@/lib/constants/expense-categories'
import { EXPENSE_CATEGORY_VALUES } from '@/lib/constants/expense-categories'

// --- Types ---

export type CategorySuggestion = {
  category: ExpenseCategory
  confidence: number
  source: 'vendor_default' | 'pattern'
  matchCount: number
}

// --- Helpers ---

const validCategorySet = new Set<string>(EXPENSE_CATEGORY_VALUES)

function isValidCategory(value: string): value is ExpenseCategory {
  return validCategorySet.has(value)
}

function confidenceFromCount(count: number): number {
  if (count >= 10) return 0.95
  if (count >= 5) return 0.85
  return 0.7
}

// --- Functions ---

/**
 * Suggest an expense category for a vendor based on historical patterns.
 * Fast path: check vendor_category_defaults table first.
 * Slow path: scan expenses grouped by category to find a dominant pattern.
 */
export async function suggestCategoryForVendor(
  vendorId: string
): Promise<CategorySuggestion | null> {
  const user = await requireChef()
  const db = createServerClient()
  const tenantId = user.tenantId!

  // Fast path: explicit vendor default
  const { data: defaultRow, error: defaultErr } = await db
    .from('vendor_category_defaults')
    .select('default_category, match_count')
    .eq('tenant_id', tenantId)
    .eq('vendor_id', vendorId)
    .maybeSingle()

  if (!defaultErr && defaultRow && isValidCategory(defaultRow.default_category)) {
    return {
      category: defaultRow.default_category,
      confidence: confidenceFromCount(defaultRow.match_count ?? 1),
      source: 'vendor_default',
      matchCount: defaultRow.match_count ?? 1,
    }
  }

  // Slow path: scan expense history for this vendor
  const rows = await pgClient.unsafe(
    `SELECT category, COUNT(*)::int AS cnt
     FROM expenses
     WHERE tenant_id = $1 AND vendor_id = $2 AND category IS NOT NULL
     GROUP BY category
     ORDER BY cnt DESC`,
    [tenantId, vendorId]
  )

  if (!rows || rows.length === 0) return null

  const total = rows.reduce((sum: number, r: any) => sum + r.cnt, 0)
  const top = rows[0]

  if (top.cnt < 3) return null
  if (top.cnt / total <= 0.6) return null
  if (!isValidCategory(top.category)) return null

  return {
    category: top.category,
    confidence: confidenceFromCount(top.cnt),
    source: 'pattern',
    matchCount: top.cnt,
  }
}

/**
 * Upsert a vendor category default after a chef confirms or creates an expense.
 * If the vendor already has a default, increments match_count and refreshes the timestamp.
 */
export async function updateVendorCategoryDefault(
  vendorId: string,
  category: ExpenseCategory
): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  if (!isValidCategory(category)) {
    throw new Error(`Invalid expense category: ${category}`)
  }

  const db = createServerClient()

  // Check if a row already exists for this tenant + vendor
  const { data: existing } = await db
    .from('vendor_category_defaults')
    .select('id, default_category, match_count')
    .eq('tenant_id', tenantId)
    .eq('vendor_id', vendorId)
    .maybeSingle()

  if (existing) {
    // Same category: increment count and refresh timestamp
    // Different category: overwrite with the new one, reset count to 1
    const sameCategory = existing.default_category === category
    await db
      .from('vendor_category_defaults')
      .update({
        default_category: category,
        match_count: sameCategory ? (existing.match_count ?? 0) + 1 : 1,
        last_confirmed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await db.from('vendor_category_defaults').insert({
      tenant_id: tenantId,
      vendor_id: vendorId,
      default_category: category,
      match_count: 1,
      last_confirmed_at: new Date().toISOString(),
    })
  }
}

/**
 * Batch refresh vendor_category_defaults by scanning all expenses for this tenant.
 * For vendors with 3+ expenses in the same category at >60% dominance, upsert a default.
 */
export async function refreshVendorCategoryDefaults(): Promise<{ updated: number }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // Get all vendor + category combos with counts
  const rows = await pgClient.unsafe(
    `SELECT vendor_id, category, COUNT(*)::int AS cnt
     FROM expenses
     WHERE tenant_id = $1 AND vendor_id IS NOT NULL AND category IS NOT NULL
     GROUP BY vendor_id, category
     ORDER BY vendor_id, cnt DESC`,
    [tenantId]
  )

  if (!rows || rows.length === 0) return { updated: 0 }

  // Group by vendor_id, find dominant category per vendor
  const vendorMap = new Map<string, { category: string; cnt: number; total: number }>()

  for (const row of rows) {
    const existing = vendorMap.get(row.vendor_id)
    if (!existing) {
      vendorMap.set(row.vendor_id, { category: row.category, cnt: row.cnt, total: row.cnt })
    } else {
      // Already have a top category; just accumulate total
      existing.total += row.cnt
    }
  }

  const db = createServerClient()
  let updated = 0

  for (const [vendorId, info] of Array.from(vendorMap.entries())) {
    if (info.cnt < 3) continue
    if (info.cnt / info.total <= 0.6) continue
    if (!isValidCategory(info.category)) continue

    await db.from('vendor_category_defaults').upsert(
      {
        tenant_id: tenantId,
        vendor_id: vendorId,
        default_category: info.category,
        match_count: info.cnt,
        last_confirmed_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,vendor_id' }
    )
    updated++
  }

  return { updated }
}

/**
 * Deterministic category suggestion from receipt context (no DB calls).
 * Maps ingredient categories and vendor name keywords to expense categories.
 */
function getCategoryFromReceiptContext(
  ingredientCategory: string | null,
  vendorName: string | null
): ExpenseCategory {
  // Ingredient category mapping (highest priority)
  if (ingredientCategory) {
    const lower = ingredientCategory.toLowerCase()
    if (['protein', 'produce', 'dairy', 'pantry'].includes(lower)) return 'groceries'
    if (lower === 'alcohol') return 'alcohol'
    if (lower === 'supplies') return 'supplies'
  }

  // Vendor name keyword matching
  if (vendorName) {
    const lower = vendorName.toLowerCase()
    if (/\b(gas|fuel|shell|exxon|mobil|sunoco|bp|chevron|citgo)\b/.test(lower)) {
      return 'gas_mileage'
    }
    if (/\b(uniform|chef coat|apron)\b/.test(lower)) return 'uniforms'
  }

  // Default fallback
  return 'groceries'
}
