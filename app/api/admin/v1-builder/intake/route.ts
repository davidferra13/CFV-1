import { NextResponse } from 'next/server'
import { getCurrentAdminUser } from '@/lib/auth/admin'
import { submitRawInput } from '@/lib/admin/v1-builder-intake'

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

  const text =
    typeof body === 'object' && body && 'text' in body && typeof body.text === 'string'
      ? body.text
      : ''
  const sourceLabel =
    typeof body === 'object' &&
    body &&
    'sourceLabel' in body &&
    typeof body.sourceLabel === 'string'
      ? body.sourceLabel
      : undefined

  try {
    const signal = await submitRawInput({ text, sourceLabel })
    return NextResponse.json(signal, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    )
  }
}
