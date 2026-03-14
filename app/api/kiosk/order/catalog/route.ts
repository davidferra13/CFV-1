import { NextResponse } from 'next/server'
import { getSalesTaxRate } from '@/lib/tax/api-ninjas'
import { authenticateOrderKioskRequest, KioskApiError } from '../_helpers'

export async function GET(request: Request) {
  try {
    const { supabase, device } = await authenticateOrderKioskRequest(request)

    const { data: products, error } = await supabase
      .from('product_projections')
      .select(
        'id, name, price_cents, category, image_url, is_active, modifiers, tax_class, cost_cents'
      )
      .eq('tenant_id', device.tenantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to load catalog' }, { status: 500 })
    }

    const { data: chef } = await (supabase
      .from('chefs' as any)
      .select('zip')
      .eq('id', device.tenantId)
      .maybeSingle() as any)

    const taxZipCode = String((chef as any)?.zip ?? '').trim() || null
    const taxRates = taxZipCode ? await getSalesTaxRate(taxZipCode) : null

    return NextResponse.json({
      products: products ?? [],
      tax_zip_configured: !!taxZipCode,
      tax_zip_code: taxZipCode,
      tax_rate: taxRates?.combined_rate ?? null,
      tax_service_available: taxZipCode ? !!taxRates : false,
    })
  } catch (err) {
    if (err instanceof KioskApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }

    console.error('[kiosk/order/catalog] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
