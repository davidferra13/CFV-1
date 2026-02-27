import { NextResponse } from 'next/server'
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

    return NextResponse.json({ products: products ?? [] })
  } catch (err) {
    if (err instanceof KioskApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }

    console.error('[kiosk/order/catalog] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
