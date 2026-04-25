import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/admin'
import { getOpenClawHealthContract } from '@/lib/openclaw/health-contract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contract = await getOpenClawHealthContract()

  return NextResponse.json(contract, {
    status: contract.overall === 'failed' ? 503 : 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
