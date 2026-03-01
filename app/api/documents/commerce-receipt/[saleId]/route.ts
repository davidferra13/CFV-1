import { NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'

// DEFERRED: Commerce receipt PDF generation.
// The commerce_sales, commerce_sale_items, and commerce_payments tables
// do not exist in the current schema. This route returns 501 until the
// POS/Commerce schema is deployed.

export async function GET(_request: Request, { params: _params }: { params: { saleId: string } }) {
  try {
    await requireChef()

    return NextResponse.json(
      { error: 'Commerce receipts are not yet available — POS schema not deployed' },
      { status: 501 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate receipt'

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('[commerce-receipt-route] Error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
