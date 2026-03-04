// Commerce Engine V1 — Tax Actions
// Line-item tax computation for commerce sales.
// Wraps the existing API Ninjas tax calculation with commerce-specific logic.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { getSalesTaxRate, calculateSalesTax } from '@/lib/tax/api-ninjas'
import type { TaxCalculation } from '@/lib/tax/api-ninjas'
import type { TaxClass } from './constants'

// ─── Types ────────────────────────────────────────────────────────

export type LineItemTax = {
  saleItemId: string
  taxClass: TaxClass
  taxableCents: number
  taxCents: number
  taxRate: number
  breakdown: {
    state: number
    county: number
    city: number
  }
}

export type SaleTaxResult = {
  lineItems: LineItemTax[]
  totalTaxCents: number
  taxRate: number
  zipCode: string
  jurisdiction: string
}

// ─── Tax Class Rate Modifiers ─────────────────────────────────────
// Some tax classes have reduced or zero rates relative to the jurisdiction rate.

const TAX_CLASS_MULTIPLIERS: Record<TaxClass, number> = {
  standard: 1.0,
  reduced: 0.5, // Reduced rate = 50% of standard
  exempt: 0.0, // No tax
  alcohol: 1.0, // Full rate (may have additional surcharges — future)
  cannabis: 1.0, // Full rate (may have additional surcharges — future)
  prepared_food: 1.0, // Most jurisdictions tax prepared food at standard rate
  zero: 0.0, // Zero-rated
}

// ─── Compute Line-Item Tax ────────────────────────────────────────

/**
 * Calculate tax for each line item in a sale based on the sale's zip code.
 * Each item's tax class determines whether it's taxed at the full rate,
 * reduced rate, or exempt.
 */
export async function computeSaleLineTax(saleId: string): Promise<SaleTaxResult | null> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  // Fetch sale with zip code
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .select('id, tax_zip_code, subtotal_cents')
    .eq('id', saleId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (saleErr || !sale) throw new Error('Sale not found')

  const zipCode = (sale as any).tax_zip_code
  if (!zipCode) return null // No zip = no tax computation

  // Get jurisdiction rates
  const rates = await getSalesTaxRate(zipCode)
  if (!rates) return null

  // Fetch line items
  const { data: items, error: itemsErr } = await supabase
    .from('sale_items')
    .select('id, tax_class, line_total_cents')
    .eq('sale_id', saleId)
    .order('created_at', { ascending: true })

  if (itemsErr) throw new Error(`Failed to fetch sale items: ${itemsErr.message}`)

  const lineItems: LineItemTax[] = (items ?? []).map((item: any) => {
    const taxClass: TaxClass = item.tax_class || 'standard'
    const multiplier = TAX_CLASS_MULTIPLIERS[taxClass] ?? 1.0
    const effectiveRate = rates.combined_rate * multiplier
    const taxCents = Math.round(item.line_total_cents * effectiveRate)

    return {
      saleItemId: item.id,
      taxClass,
      taxableCents: item.line_total_cents,
      taxCents,
      taxRate: effectiveRate,
      breakdown: {
        state: rates.state_rate * multiplier,
        county: rates.county_rate * multiplier,
        city: rates.city_rate * multiplier,
      },
    }
  })

  const totalTaxCents = lineItems.reduce((sum, li) => sum + li.taxCents, 0)

  return {
    lineItems,
    totalTaxCents,
    taxRate: rates.combined_rate,
    zipCode,
    jurisdiction: rates.state || zipCode,
  }
}

// ─── Apply Tax to Sale ────────────────────────────────────────────

/**
 * Compute and persist line-item tax for a sale.
 * Updates each sale_item.tax_cents and the sale.tax_cents total.
 */
export async function applySaleTax(saleId: string): Promise<SaleTaxResult | null> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const result = await computeSaleLineTax(saleId)
  if (!result) return null

  // Update each line item's tax
  for (const li of result.lineItems) {
    await supabase
      .from('sale_items')
      .update({ tax_cents: li.taxCents } as any)
      .eq('id', li.saleItemId)
  }

  // Update sale total tax
  await supabase
    .from('sales')
    .update({
      tax_cents: result.totalTaxCents,
      total_cents: (await getSaleSubtotal(saleId, user.tenantId!)) + result.totalTaxCents,
    } as any)
    .eq('id', saleId)
    .eq('tenant_id', user.tenantId!)

  return result
}

// ─── Quick Tax Preview ────────────────────────────────────────────

/**
 * Preview tax for an amount at a given zip code without creating any records.
 * Used by POS register for real-time tax display.
 */
export async function previewTax(
  subtotalCents: number,
  zipCode: string
): Promise<TaxCalculation | null> {
  await requireChef()
  await requirePro('commerce')
  return calculateSalesTax(subtotalCents, zipCode)
}

// ─── Helper ───────────────────────────────────────────────────────

async function getSaleSubtotal(saleId: string, tenantId: string): Promise<number> {
  const supabase: any = createServerClient()
  const { data } = await supabase
    .from('sales')
    .select('subtotal_cents, discount_cents')
    .eq('id', saleId)
    .eq('tenant_id', tenantId)
    .single()

  if (!data) return 0
  const s = data as any
  return (s.subtotal_cents ?? 0) - (s.discount_cents ?? 0)
}
