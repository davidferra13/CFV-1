import { NextResponse, type NextRequest } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { getDependencyCatalogItem } from '@/lib/dependencies/catalog'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireChef()
  } catch {
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }

  const { id } = await params
  const dependency = getDependencyCatalogItem(id)

  if (!dependency) {
    return NextResponse.json(
      { error: 'Dependency not found' },
      {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }

  return NextResponse.json(
    { dependency },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
