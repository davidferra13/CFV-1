import { NextResponse } from 'next/server'
import { getCurrentAdminUser } from '@/lib/auth/admin'
import { getBuilderMonitorSnapshot } from '@/lib/admin/v1-builder-monitor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const admin = await getCurrentAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const snapshot = await getBuilderMonitorSnapshot()
  return NextResponse.json(snapshot, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
