// GET /finance/export
// Redirects to the canonical CPA export route so every export path
// produces the same authoritative package. The old ledger-only CSV
// implied full accounting truth it could not deliver.
//
// Accepts ?year=YYYY (default: current year).

import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'

export async function GET(request: Request) {
  try {
    await requireChef()
  } catch {
    const { NextResponse } = await import('next/server')
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year') ?? String(new Date().getFullYear())

  redirect(`/finance/year-end/export?year=${year}`)
}
