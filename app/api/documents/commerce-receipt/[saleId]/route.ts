import { NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { generateReceipt } from '@/lib/commerce/receipt-actions'

export async function GET(_request: Request, { params }: { params: { saleId: string } }) {
  try {
    await requireChef()
    await requirePro('commerce')

    if (!params.saleId) {
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 })
    }

    const { pdf, filename } = await generateReceipt(params.saleId)
    const buffer = Buffer.from(pdf, 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename=\"${filename}\"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate receipt'

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (message.includes('Sale not found')) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }
    if (message.includes('commerce')) {
      return NextResponse.json({ error: message }, { status: 403 })
    }

    console.error('[commerce-receipt-route] Error:', error)
    return NextResponse.json({ error: 'Failed to generate receipt' }, { status: 500 })
  }
}
