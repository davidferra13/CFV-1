// Quote Auto-Generation
// When a client selects a sample menu, pull costs from PIE,
// apply chef overrides, and generate a quote draft.

'use server'

import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutoGenerateResult {
  success: boolean
  quoteId?: string
  error?: string
  breakdown?: QuoteBreakdown
}

export interface QuoteBreakdown {
  foodCostCents: number
  laborCents: number
  travelCents: number
  serviceFeePercent: number
  totalCents: number
  perPersonCents: number
  guestCount: number
}

// ---------------------------------------------------------------------------
// Auto-Generate Quote from Selected Menu
// ---------------------------------------------------------------------------

export async function autoGenerateQuote(
  chefId: string,
  inquiryId: string,
  menuId: string
): Promise<AutoGenerateResult> {
  const db: any = createServerClient()

  // 1. Get inquiry details (guest count, etc.)
  const { data: inquiry } = await db
    .from('inquiries')
    .select('id, confirmed_guest_count, confirmed_location, confirmed_date, client_id')
    .eq('id', inquiryId)
    .eq('tenant_id', chefId)
    .single()

  if (!inquiry) {
    return { success: false, error: 'Inquiry not found' }
  }

  const guestCount = inquiry.confirmed_guest_count || 6 // default to 6 if not set

  // 2. Get menu cost from PIE (resolve-menu-cost)
  let foodCostCents = 0
  try {
    const { resolveMenuCost } = await import('@/lib/pricing/resolve-menu-cost')
    const menuCost = await resolveMenuCost(chefId, menuId, guestCount)
    foodCostCents = menuCost.totalFoodCostCents
  } catch {
    // Fallback: use menu template price if PIE unavailable
    const { data: menuTemplate } = await db
      .from('menu_templates')
      .select('price_per_person_cents')
      .eq('id', menuId)
      .single()

    if (menuTemplate?.price_per_person_cents) {
      foodCostCents = menuTemplate.price_per_person_cents * guestCount
    } else {
      // Cannot determine cost
      foodCostCents = 0
    }
  }

  // 3. Get chef pricing overrides
  let laborCents = 0
  let travelCents = 0
  let serviceFeePercent = 0
  let markupPercent = 0

  try {
    const { data: overrides } = await db
      .from('chef_pricing_config')
      .select('labor_flat_cents, travel_flat_cents, service_fee_percent, food_markup_percent')
      .eq('chef_id', chefId)
      .single()

    if (overrides) {
      laborCents = overrides.labor_flat_cents || 0
      travelCents = overrides.travel_flat_cents || 0
      serviceFeePercent = overrides.service_fee_percent || 0
      markupPercent = overrides.food_markup_percent || 0
    }
  } catch {
    // Use defaults: no overrides found
  }

  // 4. Calculate total
  const markedUpFoodCents = Math.round(foodCostCents * (1 + markupPercent / 100))
  const subtotal = markedUpFoodCents + laborCents + travelCents
  const serviceFee = Math.round(subtotal * (serviceFeePercent / 100))
  const totalCents = subtotal + serviceFee
  const perPersonCents = guestCount > 0 ? Math.round(totalCents / guestCount) : totalCents

  // 5. Create quote draft
  const { data: quote, error: quoteError } = await db
    .from('quotes')
    .insert({
      tenant_id: chefId,
      inquiry_id: inquiryId,
      client_id: inquiry.client_id,
      status: 'draft',
      guest_count: guestCount,
      total_cents: totalCents,
      price_per_person_cents: perPersonCents,
      pricing_model: 'per_person',
      source_menu_id: menuId,
      line_items: JSON.stringify([
        { label: 'Food (ingredients and preparation)', amount_cents: markedUpFoodCents },
        ...(laborCents > 0 ? [{ label: 'Chef labor', amount_cents: laborCents }] : []),
        ...(travelCents > 0 ? [{ label: 'Travel', amount_cents: travelCents }] : []),
        ...(serviceFee > 0 ? [{ label: 'Service fee', amount_cents: serviceFee }] : []),
      ]),
      pricing_notes: 'Auto-generated from selected menu. Review before sending.',
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (quoteError || !quote) {
    console.error('[auto-generate] Quote creation failed:', quoteError)
    return { success: false, error: 'Failed to create quote draft' }
  }

  // 6. Update inquiry status
  await db
    .from('inquiries')
    .update({ status: 'awaiting_chef', updated_at: new Date().toISOString() })
    .eq('id', inquiryId)

  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/quotes')

  return {
    success: true,
    quoteId: quote.id,
    breakdown: {
      foodCostCents: markedUpFoodCents,
      laborCents,
      travelCents,
      serviceFeePercent,
      totalCents,
      perPersonCents,
      guestCount,
    },
  }
}
