// FOH Menu Image API
// GET /api/menu-image/[menuId] - returns PNG image of the front-of-house menu.
// Auth: requires chef session. No public token access (use Stream 2 public page for that).

import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { getFOHMenuData } from '@/lib/menus/foh-menu-actions'
import { generateFOHMenuImage } from '@/lib/documents/generate-foh-image'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ menuId: string }> }) {
  try {
    await requireChef()
    const { menuId } = await params

    if (!menuId) {
      return NextResponse.json({ error: 'Menu ID is required' }, { status: 400 })
    }

    const data = await getFOHMenuData(menuId)
    if (!data) {
      return NextResponse.json({ error: 'Menu not found or unauthorized' }, { status: 404 })
    }

    const pngBuffer = await generateFOHMenuImage(data)

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'Content-Disposition': `inline; filename="${sanitizeFilename(data.title)}.png"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Auth failures return 401
    if (message.includes('Unauthorized') || message.includes('not authenticated')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('[menu-image] Error generating FOH menu image:', message)
    return NextResponse.json({ error: 'Failed to generate menu image' }, { status: 500 })
  }
}

function sanitizeFilename(title: string): string {
  return (
    title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 80) || 'menu'
  )
}
