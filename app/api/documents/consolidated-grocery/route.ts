// API Route: Consolidated Grocery List PDF
// GET /api/documents/consolidated-grocery?from=YYYY-MM-DD&to=YYYY-MM-DD
// Merges grocery lists across all events in the date range into one shopping list.
// Auth: requires chef

import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import {
  fetchConsolidatedGroceryData,
  renderConsolidatedGroceryList,
} from '@/lib/documents/generate-consolidated-grocery-list'
import { PDFLayout } from '@/lib/documents/pdf-layout'

export async function GET(req: NextRequest) {
  try {
    const user = await requireChef()

    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required query params: from, to (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 })
    }

    const data = await fetchConsolidatedGroceryData(from, to)

    if (!data) {
      return NextResponse.json(
        { error: 'No upcoming events with menus found in the specified date range' },
        { status: 404 }
      )
    }

    const pdf = new PDFLayout()
    renderConsolidatedGroceryList(pdf, data)
    pdf.generatedBy((user as any).name || 'Chef', 'Consolidated Grocery List')
    const buffer = pdf.toBuffer()

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="consolidated-grocery-${from}-to-${to}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('[consolidated-grocery] Internal error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
