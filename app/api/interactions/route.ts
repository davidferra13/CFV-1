import { NextResponse, type NextRequest } from 'next/server'
import { executeInteractionAction } from '@/lib/interactions/actions'
import { executeInteractionInputSchema } from '@/lib/interactions/schema'
import type { ExecuteInteractionResult } from '@/lib/interactions'

export function getInteractionResponseStatus(result: ExecuteInteractionResult): number {
  if (result.ok) return 200

  switch (result.error.code) {
    case 'permission_denied':
      return 403
    case 'unknown_action':
    case 'invalid_target':
    case 'invalid_context':
      return 422
    case 'write_failed':
      return 500
    default:
      return 500
  }
}

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'validation_error', message: 'Invalid JSON body' },
      },
      { status: 400 }
    )
  }

  const parsed = executeInteractionInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'validation_error', message: 'Invalid interaction input' },
      },
      { status: 400 }
    )
  }

  try {
    const result = await executeInteractionAction(parsed.data)
    return NextResponse.json(result, { status: getInteractionResponseStatus(result) })
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'write_failed', message: 'Failed to execute interaction' },
      },
      { status: 500 }
    )
  }
}
