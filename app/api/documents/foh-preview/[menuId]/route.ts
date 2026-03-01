// FOH Preview — returns HTML for any menu (no event required)
// Uses the HTML-based generator which works with just a menuId.

import { NextRequest, NextResponse } from 'next/server'
import { generateFrontOfHouseMenu } from '@/lib/front-of-house/generateFrontOfHouseMenu'
import { requireChef } from '@/lib/auth/get-user'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ menuId: string }> }) {
  try {
    await requireChef()
    const { menuId } = await params
    const html = await generateFrontOfHouseMenu(menuId)

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: unknown) {
    console.error('[foh-preview] Error:', error)
    return NextResponse.json({ error: 'Failed to generate FOH preview' }, { status: 500 })
  }
}
