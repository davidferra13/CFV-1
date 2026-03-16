// System Nerve Center - GET /api/system/health
// Full health sweep of all services. Admin-only.

import { NextResponse } from 'next/server'
import { runHealthSweep } from '@/lib/system/health-sweep'
import { isAdmin } from '@/lib/auth/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runHealthSweep(false)
    return NextResponse.json(result, {
      status: result.overallStatus === 'error' ? 503 : 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sweep failed' },
      { status: 500 }
    )
  }
}
