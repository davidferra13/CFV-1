import { NextResponse } from 'next/server'
import { getCurrentAdminUser } from '@/lib/auth/admin'
import { BUILDER_MODES, writeBuilderMode, type BuilderMode } from '@/lib/admin/v1-builder-intake'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const admin = await getCurrentAdminUser()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const mode =
    typeof body === 'object' && body && 'mode' in body && typeof body.mode === 'string'
      ? body.mode
      : ''
  const reason =
    typeof body === 'object' && body && 'reason' in body && typeof body.reason === 'string'
      ? body.reason
      : ''

  if (!BUILDER_MODES.includes(mode as BuilderMode)) {
    return NextResponse.json({ error: `Unsupported builder mode: ${mode}` }, { status: 400 })
  }

  const state = await writeBuilderMode(mode as BuilderMode, reason)
  return NextResponse.json(state, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
