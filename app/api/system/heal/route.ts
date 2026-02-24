// System Nerve Center — POST /api/system/heal
// Execute fix actions or sweep-all. Admin-only.

import { NextResponse } from 'next/server'
import { executeHealAction, executeSweepAll } from '@/lib/system/heal-actions'
import { isAdmin } from '@/lib/auth/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface HealRequest {
  action: 'fix' | 'sweep'
  actionId?: string
  autoFix?: boolean
}

export async function POST(request: Request) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: HealRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.action === 'fix') {
    if (!body.actionId) {
      return NextResponse.json({ error: 'actionId required' }, { status: 400 })
    }
    const result = await executeHealAction(body.actionId)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  if (body.action === 'sweep') {
    const result = await executeSweepAll(body.autoFix ?? false)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 })
}
