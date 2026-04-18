'use server'

// Receipt Learning System - Deterministic (Formula > AI)
// Remembers manual receipt-to-ingredient corrections so the same product
// auto-matches on subsequent receipts. No LLM calls.
//
// Table: receipt_ingredient_mappings
// Key: (tenant_id, receipt_text, store_name)
// Confidence scales with match_count: 1 use = 0.80, 3+ = 0.92, 5+ = 0.97

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Normalization ────────────────────────────────────────────────────────

/**
 * Normalize receipt text for mapping lookup.
 * Same logic as expense-line-item-actions normalizeForMatch but exported.
 * Lowercase, strip punctuation, collapse whitespace, expand abbreviations.
 */
export async function normalizeReceiptText(str: string): Promise<string> {
  let s = str.toLowerCase().trim()

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

  s = s
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => abbreviations[word] ?? word)
    .join(' ')
    .trim()

  return s
}

// ── Confidence from match count ──────────────────────────────────────────

function matchCountToConfidence(count: number): number {
  if (count >= 5) return 0.97
  if (count >= 3) return 0.92
  return 0.8
}

// ── Lookup ────────────────────────────────────────────────────────────────

export type LearnedMapping = {
  ingredientId: string
  confidence: number
  matchCount: number
  storeName: string | null
}

/**
 * Look up a learned receipt-to-ingredient mapping.
 * Checks store-specific mapping first, then falls back to store-agnostic.
 * Returns null if no mapping exists.
 */
export async function lookupLearnedMapping(
  tenantId: string,
  receiptText: string,
  storeName?: string | null
): Promise<LearnedMapping | null> {
  const db: any = createServerClient()
  const normalized = await normalizeReceiptText(receiptText)

  // Try store-specific first (more precise)
  if (storeName) {
    const { data: storeMatch } = await db
      .from('receipt_ingredient_mappings')
      .select('ingredient_id, match_count, store_name')
      .eq('tenant_id', tenantId)
      .eq('receipt_text', normalized)
      .eq('store_name', storeName)
      .single()

    if (storeMatch) {
      return {
        ingredientId: storeMatch.ingredient_id,
        confidence: matchCountToConfidence(storeMatch.match_count),
        matchCount: storeMatch.match_count,
        storeName: storeMatch.store_name,
      }
    }
  }

  // Fallback: store-agnostic mapping (store_name IS NULL)
  const { data: genericMatch } = await db
    .from('receipt_ingredient_mappings')
    .select('ingredient_id, match_count, store_name')
    .eq('tenant_id', tenantId)
    .eq('receipt_text', normalized)
    .is('store_name', null)
    .single()

  if (genericMatch) {
    return {
      ingredientId: genericMatch.ingredient_id,
      confidence: matchCountToConfidence(genericMatch.match_count),
      matchCount: genericMatch.match_count,
      storeName: null,
    }
  }

  return null
}

// ── Record ────────────────────────────────────────────────────────────────

/**
 * Record or reinforce a receipt-to-ingredient mapping.
 * If mapping exists, increments match_count. If new, creates it.
 * Called when a chef manually corrects an ingredient match.
 */
export async function recordLearnedMapping(
  tenantId: string,
  receiptText: string,
  ingredientId: string,
  storeName?: string | null
): Promise<void> {
  const db: any = createServerClient()
  const normalized = await normalizeReceiptText(receiptText)
  const storeVal = storeName ?? null

  // Try upsert: insert or increment match_count
  const { data: existing } = await db
    .from('receipt_ingredient_mappings')
    .select('id, match_count')
    .eq('tenant_id', tenantId)
    .eq('receipt_text', normalized)
    .eq(storeVal ? 'store_name' : 'store_name', storeVal ? storeVal : null)
    .single()

  if (existing) {
    // Update: increment count and possibly change ingredient
    await db
      .from('receipt_ingredient_mappings')
      .update({
        ingredient_id: ingredientId,
        match_count: existing.match_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    // Insert new mapping
    await db.from('receipt_ingredient_mappings').insert({
      tenant_id: tenantId,
      receipt_text: normalized,
      ingredient_id: ingredientId,
      store_name: storeVal,
      match_count: 1,
    })

    // Also create a store-agnostic fallback if this was store-specific
    if (storeVal) {
      const { data: genericExists } = await db
        .from('receipt_ingredient_mappings')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('receipt_text', normalized)
        .is('store_name', null)
        .single()

      if (!genericExists) {
        await db.from('receipt_ingredient_mappings').insert({
          tenant_id: tenantId,
          receipt_text: normalized,
          ingredient_id: ingredientId,
          store_name: null,
          match_count: 1,
        })
      }
    }
  }
}
