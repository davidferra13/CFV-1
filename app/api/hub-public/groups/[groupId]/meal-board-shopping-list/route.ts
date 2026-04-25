import { NextRequest, NextResponse } from 'next/server'
import { generateWeeklyShoppingList } from '@/lib/hub/meal-board-shopping-list'

interface RouteContext {
  params: {
    groupId: string
  }
}

async function readJson(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const body = await readJson(request)
  if (!body) {
    return NextResponse.json(
      { success: false, error: 'Invalid shopping list payload' },
      { status: 400 }
    )
  }

  try {
    const list = await generateWeeklyShoppingList({
      groupId: params.groupId,
      groupToken: String(body.groupToken ?? ''),
      startDate: String(body.startDate ?? ''),
      endDate: String(body.endDate ?? ''),
    })

    return NextResponse.json({ success: true, list })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate shopping list',
      },
      { status: 400 }
    )
  }
}
