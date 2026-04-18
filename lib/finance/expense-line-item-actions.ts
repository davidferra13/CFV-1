'use server'

// Expense Line Item Actions
// Links individual expense items to ingredients from the master list.
// Closes the cost loop: receipt → expense → line items → ingredients → actual cost.
//
// Formula > AI: ingredient matching uses deterministic string similarity,
// not LLM calls. AI matching is only used as a secondary pass when
// deterministic matching fails.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ─── Types ─────────────────────────────────────────────────────────────

export type ExpenseLineItem = {
  id: string
  expenseId: string
  ingredientId: string | null
  receiptLineItemId: string | null
  description: string
  quantity: number | null
  unit: string | null
  amountCents: number
  matchedBy: 'manual' | 'ai' | 'receipt_ocr'
  matchConfidence: number | null
  priceApplied: boolean
  ingredientName: string | null // joined from ingredients table
}

export type IngredientMatch = {
  ingredientId: string
  ingredientName: string
  category: string
  confidence: number
  lastPriceCents: number | null
  matchReason: string
}

export type EventActualCost = {
  totalActualCents: number
  totalEstimatedCents: number
  varianceCents: number
  variancePercent: number | null
  lineItems: Array<{
    description: string
    amountCents: number
    ingredientId: string | null
    ingredientName: string | null
    estimatedCostCents: number | null
  }>
  unmatchedCount: number
  matchedCount: number
}

// ─── Schemas ───────────────────────────────────────────────────────────

const CreateLineItemSchema = z.object({
  expenseId: z.string().uuid(),
  ingredientId: z.string().uuid().nullable().optional(),
  receiptLineItemId: z.string().uuid().nullable().optional(),
  description: z.string().min(1),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().nullable().optional(),
  amountCents: z.number().int().nonnegative(),
  matchedBy: z.enum(['manual', 'ai', 'receipt_ocr']).default('manual'),
  matchConfidence: z.number().min(0).max(1).nullable().optional(),
})

const UpdateLineItemMatchSchema = z.object({
  lineItemId: z.string().uuid(),
  ingredientId: z.string().uuid().nullable(),
})

// ─── 1. Create Line Items ──────────────────────────────────────────────

/**
 * Create expense line items for an expense (typically from receipt OCR).
 * Returns the created line items.
 */
export async function createExpenseLineItems(
  items: z.infer<typeof CreateLineItemSchema>[]
): Promise<{ success: boolean; created: number; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (items.length === 0) return { success: true, created: 0 }

  // Validate all items
  const validated = items.map((item) => CreateLineItemSchema.parse(item))

  // Verify the expense belongs to this chef
  const expenseIds = [...new Set(validated.map((v) => v.expenseId))]
  for (const expenseId of expenseIds) {
    const { data: expense } = await db
      .from('expenses')
      .select('id')
      .eq('id', expenseId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!expense) {
      return { success: false, created: 0, error: `Expense ${expenseId} not found` }
    }
  }

  const rows = validated.map((item) => ({
    expense_id: item.expenseId,
    tenant_id: user.tenantId!,
    ingredient_id: item.ingredientId ?? null,
    receipt_line_item_id: item.receiptLineItemId ?? null,
    description: item.description,
    quantity: item.quantity ?? null,
    unit: item.unit ?? null,
    amount_cents: item.amountCents,
    matched_by: item.matchedBy,
    match_confidence: item.matchConfidence ?? null,
    price_applied: false,
  }))

  const { error } = await db.from('expense_line_items').insert(rows)

  if (error) {
    console.error('[createExpenseLineItems] Insert error:', error)
    return { success: false, created: 0, error: error.message }
  }

  // Revalidate relevant paths
  for (const expenseId of expenseIds) {
    const { data: expense } = await db
      .from('expenses')
      .select('event_id')
      .eq('id', expenseId)
      .single()

    if (expense?.event_id) {
      revalidatePath(`/events/${expense.event_id}/financial`)
      revalidatePath(`/events/${expense.event_id}/receipts`)
    }
  }
  revalidatePath('/expenses')
  revalidatePath('/financials')
  revalidatePath('/finance')

  return { success: true, created: rows.length }
}

// ─── 2. Get Line Items for Expense ─────────────────────────────────────

/**
 * Fetch all line items for a specific expense, with ingredient names joined.
 */
export async function getExpenseLineItems(expenseId: string): Promise<ExpenseLineItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('expense_line_items')
    .select('*, ingredients(name)')
    .eq('expense_id', expenseId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getExpenseLineItems] Error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    expenseId: row.expense_id,
    ingredientId: row.ingredient_id,
    receiptLineItemId: row.receipt_line_item_id,
    description: row.description,
    quantity: row.quantity ? Number(row.quantity) : null,
    unit: row.unit,
    amountCents: row.amount_cents,
    matchedBy: row.matched_by,
    matchConfidence: row.match_confidence ? Number(row.match_confidence) : null,
    priceApplied: row.price_applied,
    ingredientName: row.ingredients?.name ?? null,
  }))
}

// ─── 3. Get Line Items for Event ───────────────────────────────────────

/**
 * Fetch all expense line items for an event (across all expenses).
 * Used by the variance dashboard.
 */
export async function getEventExpenseLineItems(eventId: string): Promise<ExpenseLineItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all expense IDs for this event
  const { data: expenses } = await db
    .from('expenses')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (!expenses || expenses.length === 0) return []

  const expenseIds = expenses.map((e: any) => e.id)

  const { data, error } = await db
    .from('expense_line_items')
    .select('*, ingredients(name)')
    .in('expense_id', expenseIds)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getEventExpenseLineItems] Error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    expenseId: row.expense_id,
    ingredientId: row.ingredient_id,
    receiptLineItemId: row.receipt_line_item_id,
    description: row.description,
    quantity: row.quantity ? Number(row.quantity) : null,
    unit: row.unit,
    amountCents: row.amount_cents,
    matchedBy: row.matched_by,
    matchConfidence: row.match_confidence ? Number(row.match_confidence) : null,
    priceApplied: row.price_applied,
    ingredientName: row.ingredients?.name ?? null,
  }))
}

// ─── 4. Match Line Item to Ingredient ──────────────────────────────────

/**
 * Update the ingredient match for a line item (chef manually selects or confirms).
 * If ingredientId is null, unmatches the item.
 */
export async function matchLineItemToIngredient(
  input: z.infer<typeof UpdateLineItemMatchSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const { lineItemId, ingredientId } = UpdateLineItemMatchSchema.parse(input)
  const db: any = createServerClient()

  const updates: Record<string, unknown> = {
    ingredient_id: ingredientId,
    matched_by: 'manual',
    match_confidence: ingredientId ? 1.0 : null,
  }

  const { error } = await db
    .from('expense_line_items')
    .update(updates)
    .eq('id', lineItemId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[matchLineItemToIngredient] Error:', error)
    return { success: false, error: error.message }
  }

  // Record learned mapping so this receipt text auto-matches next time (non-blocking)
  if (ingredientId) {
    try {
      const { data: lineItem } = await db
        .from('expense_line_items')
        .select('description, expense_id')
        .eq('id', lineItemId)
        .eq('tenant_id', user.tenantId!)
        .single()

      if (lineItem?.description) {
        // Try to get store name from the parent expense
        let storeName: string | null = null
        try {
          const { data: expense } = await db
            .from('expenses')
            .select('vendor_name')
            .eq('id', lineItem.expense_id)
            .single()
          storeName = expense?.vendor_name ?? null
        } catch {
          /* non-blocking */
        }

        const { recordLearnedMapping } = await import('@/lib/receipts/receipt-learning')
        await recordLearnedMapping(user.tenantId!, lineItem.description, ingredientId, storeName)
      }
    } catch (err) {
      console.error('[matchLineItemToIngredient] Learning record error (non-blocking):', err)
    }
  }

  revalidatePath('/expenses')
  revalidatePath('/financials')
  revalidatePath('/finance')
  return { success: true }
}

// ─── 5. Suggest Ingredient Matches ─────────────────────────────────────

/**
 * Deterministic ingredient matching using string similarity + learned mappings.
 * Formula > AI: no LLM calls, pure string comparison.
 *
 * Checks receipt learning table first (durable manual corrections),
 * then falls back to string similarity.
 *
 * Returns top matches for a receipt line item description.
 */
export async function suggestIngredientMatches(
  description: string,
  limit: number = 5,
  storeName?: string | null
): Promise<IngredientMatch[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check learned mappings first (from prior manual corrections)
  try {
    const { lookupLearnedMapping } = await import('@/lib/receipts/receipt-learning')
    const learned = await lookupLearnedMapping(user.tenantId!, description, storeName)
    if (learned && learned.confidence >= 0.8) {
      // Fetch ingredient details
      const { data: ing } = await db
        .from('ingredients')
        .select('id, name, category, last_price_cents')
        .eq('id', learned.ingredientId)
        .eq('tenant_id', user.tenantId!)
        .eq('archived', false)
        .single()

      if (ing) {
        return [
          {
            ingredientId: ing.id,
            ingredientName: ing.name,
            category: ing.category,
            confidence: learned.confidence,
            lastPriceCents: ing.last_price_cents,
            matchReason: `learned mapping (${learned.matchCount} prior match${learned.matchCount === 1 ? '' : 'es'})`,
          },
        ]
      }
    }
  } catch {
    // Learning lookup is non-blocking; fall through to string similarity
  }

  // Fetch all active ingredients for this chef
  const { data: ingredients } = await db
    .from('ingredients')
    .select('id, name, category, last_price_cents')
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)

  if (!ingredients || ingredients.length === 0) return []

  const descLower = normalizeForMatch(description)

  // Score each ingredient against the description
  const scored = (ingredients as any[])
    .map((ing) => {
      const nameLower = normalizeForMatch(ing.name)
      const confidence = computeMatchScore(descLower, nameLower)
      let matchReason = 'string similarity'

      // Exact match
      if (
        descLower === nameLower ||
        descLower.includes(nameLower) ||
        nameLower.includes(descLower)
      ) {
        matchReason = 'name match'
      }

      return {
        ingredientId: ing.id,
        ingredientName: ing.name,
        category: ing.category,
        confidence,
        lastPriceCents: ing.last_price_cents,
        matchReason,
      }
    })
    .filter((m) => m.confidence > 0.3) // minimum threshold
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)

  return scored
}

// ─── 6. Apply Prices from Line Items ───────────────────────────────────

/**
 * For all matched (ingredient_id IS NOT NULL) line items on an expense,
 * update the ingredient's last_price_cents with the actual price from the receipt.
 * Only applies to items that haven't been applied yet (price_applied = false).
 *
 * Features:
 * - Unit normalization: converts receipt unit to ingredient's default_unit
 * - Price sanity guard: flags >50% deviations for chef review
 *
 * Returns: count of ingredients updated + count flagged for review.
 */
export async function applyLineItemPrices(
  expenseId: string
): Promise<{ success: boolean; updated: number; flagged: number; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify expense belongs to chef
  const { data: expense } = await db
    .from('expenses')
    .select('id, event_id')
    .eq('id', expenseId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!expense) return { success: false, updated: 0, flagged: 0, error: 'Expense not found' }

  // Get unapplied matched line items with unit info
  const { data: lineItems } = await db
    .from('expense_line_items')
    .select('id, ingredient_id, amount_cents, quantity, unit')
    .eq('expense_id', expenseId)
    .eq('tenant_id', user.tenantId!)
    .eq('price_applied', false)
    .not('ingredient_id', 'is', null)

  if (!lineItems || lineItems.length === 0) return { success: true, updated: 0, flagged: 0 }

  // Fetch ingredient details for unit normalization and sanity checks
  const ingredientIds = [...new Set((lineItems as any[]).map((li: any) => li.ingredient_id))]
  const { data: ingredientRows } = await db
    .from('ingredients')
    .select('id, default_unit, average_price_cents, price_unit')
    .eq('tenant_id', user.tenantId!)
    .in('id', ingredientIds)

  const ingredientMap = new Map<string, any>()
  for (const ing of (ingredientRows ?? []) as any[]) {
    ingredientMap.set(ing.id, ing)
  }

  // Lazy-load unit conversion engine
  let convertQuantity: ((qty: number, from: string, to: string) => number | null) | null = null
  try {
    const conversionEngine = await import('@/lib/units/conversion-engine')
    convertQuantity = conversionEngine.convertQuantity ?? null
  } catch {
    // Unit conversion unavailable; fall through to raw qty
  }

  let updated = 0
  let flagged = 0
  const SANITY_THRESHOLD = 0.5 // 50% deviation from average

  for (const item of lineItems as any[]) {
    const ingredient = ingredientMap.get(item.ingredient_id)
    const receiptQty = item.quantity ? Number(item.quantity) : 1
    const receiptUnit = item.unit ?? null
    const ingredientUnit = ingredient?.default_unit ?? 'each'

    // Unit normalization: convert receipt qty to ingredient's canonical unit
    let qtyInIngredientUnit = receiptQty
    if (receiptUnit && receiptUnit !== ingredientUnit && convertQuantity) {
      const converted = convertQuantity(receiptQty, receiptUnit, ingredientUnit)
      if (converted !== null && converted > 0) {
        qtyInIngredientUnit = converted
      }
    }

    const unitPriceCents = Math.round(item.amount_cents / qtyInIngredientUnit)

    // Price sanity guard: compare to historical average
    const avgPrice = ingredient?.average_price_cents ? Number(ingredient.average_price_cents) : null

    if (avgPrice && avgPrice > 0) {
      const deviation = Math.abs(unitPriceCents - avgPrice) / avgPrice
      if (deviation > SANITY_THRESHOLD) {
        // Flag for review instead of auto-applying
        const direction = unitPriceCents > avgPrice ? 'above' : 'below'
        const pctStr = Math.round(deviation * 100)
        await db
          .from('ingredients')
          .update({
            price_flag_pending: true,
            price_flag_new_cents: unitPriceCents,
            price_flag_reason: `${pctStr}% ${direction} average ($${(avgPrice / 100).toFixed(2)} avg, $${(unitPriceCents / 100).toFixed(2)} new)`,
          } as any)
          .eq('id', item.ingredient_id)
          .eq('tenant_id', user.tenantId!)

        // Mark line item as processed (don't re-process) but don't update price
        await db.from('expense_line_items').update({ price_applied: true }).eq('id', item.id)
        flagged++
        continue
      }
    }

    // Update ingredient prices: both last_price (tracking) and cost_per_unit (costing engine)
    const today = ((_d) =>
      `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`)(
      new Date()
    )

    const { error: updateError } = await db
      .from('ingredients')
      .update({
        last_price_cents: unitPriceCents,
        cost_per_unit_cents: unitPriceCents,
        last_price_date: today,
        last_purchased_at: new Date().toISOString(),
      } as any)
      .eq('id', item.ingredient_id)
      .eq('tenant_id', user.tenantId!)

    if (updateError) {
      console.error('[applyLineItemPrices] Failed to update ingredient:', updateError)
      continue
    }

    // Mark line item as applied
    await db.from('expense_line_items').update({ price_applied: true }).eq('id', item.id)

    updated++
  }

  // Revalidate
  revalidatePath('/recipes')
  revalidatePath('/culinary')
  revalidatePath('/inventory')
  if (expense.event_id) {
    revalidatePath(`/events/${expense.event_id}/financial`)
  }

  return { success: true, updated, flagged }
}

// ─── 6b. Resolve Price Flag ──────────────────────────────────────────────

/**
 * Accept or reject a flagged ingredient price.
 * When accepted: applies the flagged price as the new cost_per_unit_cents.
 * When rejected: clears the flag without changing the price.
 */
export async function resolvePriceFlag(
  ingredientId: string,
  accept: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch the flagged ingredient
  const { data: ingredient } = await db
    .from('ingredients')
    .select('id, price_flag_pending, price_flag_new_cents')
    .eq('id', ingredientId)
    .eq('tenant_id', user.tenantId!)
    .eq('price_flag_pending', true)
    .single()

  if (!ingredient) {
    return { success: false, error: 'No pending price flag found' }
  }

  if (accept && ingredient.price_flag_new_cents != null) {
    // Apply the flagged price
    const today = ((_d) =>
      `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`)(
      new Date()
    )

    await db
      .from('ingredients')
      .update({
        last_price_cents: ingredient.price_flag_new_cents,
        cost_per_unit_cents: ingredient.price_flag_new_cents,
        last_price_date: today,
        last_purchased_at: new Date().toISOString(),
        price_flag_pending: false,
        price_flag_new_cents: null,
        price_flag_reason: null,
      } as any)
      .eq('id', ingredientId)
      .eq('tenant_id', user.tenantId!)

    // Cascade price change to recipe costs
    try {
      const { propagatePriceChange } = await import('@/lib/pricing/cost-refresh-actions')
      await propagatePriceChange([ingredientId])
    } catch (err) {
      console.error('[resolvePriceFlag] Price cascade error (non-blocking):', err)
    }
  } else {
    // Reject: just clear the flag
    await db
      .from('ingredients')
      .update({
        price_flag_pending: false,
        price_flag_new_cents: null,
        price_flag_reason: null,
      } as any)
      .eq('id', ingredientId)
      .eq('tenant_id', user.tenantId!)
  }

  revalidatePath('/culinary')
  revalidatePath('/recipes')
  revalidatePath('/inventory')
  return { success: true }
}

// ─── 7. Event Actual vs Estimated Cost ─────────────────────────────────

/**
 * Compute the actual vs estimated food cost for an event.
 * Actual cost comes from expense line items matched to ingredients.
 * Estimated cost comes from the menu → recipe → ingredient costing chain.
 */
export async function getEventCostVariance(eventId: string): Promise<EventActualCost> {
  const user = await requireChef()
  const db: any = createServerClient()

  // 1. Get actual costs from expense line items
  const lineItems = await getEventExpenseLineItems(eventId)

  const totalActualCents = lineItems.reduce((sum, li) => sum + li.amountCents, 0)
  const matchedCount = lineItems.filter((li) => li.ingredientId).length
  const unmatchedCount = lineItems.length - matchedCount

  // 2. Get estimated cost from food-cost-actions (recipe-based)
  // Import dynamically to avoid circular dependency
  const { getEventFoodCost } = await import('@/lib/finance/food-cost-actions')
  let estimatedData
  try {
    estimatedData = await getEventFoodCost(eventId)
  } catch {
    estimatedData = null
  }

  const totalEstimatedCents = estimatedData?.estimatedCostCents ?? 0
  const varianceCents = totalActualCents - totalEstimatedCents
  const variancePercent =
    totalEstimatedCents > 0 ? Math.round((varianceCents / totalEstimatedCents) * 1000) / 10 : null

  // 3. Build per-item view with estimated comparison
  // Map ingredient_id → estimated cost from the breakdown
  const estimatedByIngredient = new Map<string, number>()
  if (estimatedData?.breakdown) {
    for (const dish of estimatedData.breakdown) {
      for (const ing of dish.ingredients) {
        // Ingredients don't have IDs in the breakdown, so we match by name
        const key = ing.name.toLowerCase()
        estimatedByIngredient.set(key, (estimatedByIngredient.get(key) ?? 0) + ing.totalCostCents)
      }
    }
  }

  const itemView = lineItems.map((li) => ({
    description: li.description,
    amountCents: li.amountCents,
    ingredientId: li.ingredientId,
    ingredientName: li.ingredientName,
    estimatedCostCents: li.ingredientName
      ? (estimatedByIngredient.get(li.ingredientName.toLowerCase()) ?? null)
      : null,
  }))

  return {
    totalActualCents,
    totalEstimatedCents,
    varianceCents,
    variancePercent,
    lineItems: itemView,
    unmatchedCount,
    matchedCount,
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * Normalize a string for matching: lowercase, remove punctuation,
 * collapse whitespace, expand common grocery abbreviations.
 */
function normalizeForMatch(str: string): string {
  let s = str.toLowerCase().trim()

  // Expand common receipt abbreviations
  const abbreviations: Record<string, string> = {
    bnls: 'boneless',
    chkn: 'chicken',
    brst: 'breast',
    org: 'organic',
    whl: 'whole',
    grn: 'green',
    frsh: 'fresh',
    blk: 'black',
    wht: 'white',
    brn: 'brown',
    lg: 'large',
    sm: 'small',
    med: 'medium',
    pck: 'pack',
    pkg: 'package',
    btl: 'bottle',
    bx: 'box',
    ct: 'count',
    oz: 'ounce',
    lb: 'pound',
    gal: 'gallon',
    qt: 'quart',
    pt: 'pint',
    dz: 'dozen',
    evoo: 'extra virgin olive oil',
    xvoo: 'extra virgin olive oil',
    ff: 'free from',
    gf: 'gluten free',
    sf: 'sugar free',
    df: 'dairy free',
    nf: 'nut free',
    mlk: 'milk',
    chs: 'cheese',
    tom: 'tomato',
    pot: 'potato',
    swt: 'sweet',
    crm: 'cream',
    rst: 'roasted',
    grld: 'grilled',
    slcd: 'sliced',
    shrd: 'shredded',
    chpd: 'chopped',
    mncd: 'minced',
    frzn: 'frozen',
  }

  // Replace abbreviations word-by-word
  s = s
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => abbreviations[word] ?? word)
    .join(' ')

  return s
}

/**
 * Compute a match score between 0 and 1 for two normalized strings.
 * Uses a combination of:
 * - Substring containment (high signal)
 * - Word overlap (Jaccard similarity)
 * - Common prefix length
 */
function computeMatchScore(a: string, b: string): number {
  if (a === b) return 1.0

  // Substring containment: one contains the other
  if (a.includes(b)) return 0.85
  if (b.includes(a)) return 0.8

  // Word-level Jaccard similarity
  const wordsA = new Set(a.split(' ').filter((w) => w.length > 1))
  const wordsB = new Set(b.split(' ').filter((w) => w.length > 1))

  if (wordsA.size === 0 || wordsB.size === 0) return 0

  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length
  const union = new Set([...wordsA, ...wordsB]).size
  const jaccard = intersection / union

  // Bonus for matching important words (protein names, produce, etc.)
  const importantWords = [
    'chicken',
    'beef',
    'pork',
    'salmon',
    'shrimp',
    'lamb',
    'turkey',
    'duck',
    'tomato',
    'onion',
    'garlic',
    'potato',
    'carrot',
    'pepper',
    'mushroom',
    'butter',
    'cream',
    'cheese',
    'milk',
    'egg',
    'flour',
    'sugar',
    'salt',
    'olive',
    'oil',
    'vinegar',
    'lemon',
    'lime',
    'basil',
    'thyme',
    'rosemary',
    'rice',
    'pasta',
    'bread',
    'wine',
  ]

  let importantBonus = 0
  for (const word of importantWords) {
    if (wordsA.has(word) && wordsB.has(word)) {
      importantBonus = 0.15
      break
    }
  }

  return Math.min(1.0, jaccard + importantBonus)
}
