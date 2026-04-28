import { NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { getDependencyCatalog } from '@/lib/dependencies/catalog'

export const dynamic = 'force-dynamic'

export async function GET() {
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

  return NextResponse.json(
    { dependencies: getDependencyCatalog() },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
