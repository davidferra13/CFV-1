import { NextResponse } from 'next/server'
import {
  buildRemyDiscoveryRuntimeResponse,
  type RemyDiscoveryRuntimeRequest,
} from '@/lib/remy/discovery-runtime'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = parseRuntimeRequest(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const response = buildRemyDiscoveryRuntimeResponse(parsed.request)

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

type ParseResult = { ok: true; request: RemyDiscoveryRuntimeRequest } | { ok: false; error: string }

function parseRuntimeRequest(body: unknown): ParseResult {
  if (!isRecord(body)) return { ok: false, error: 'Request body must be an object.' }
  if (typeof body.message !== 'string' || body.message.trim().length === 0) {
    return { ok: false, error: 'message is required.' }
  }
  if (body.message.length > 2000) {
    return { ok: false, error: 'message is too long.' }
  }

  return {
    ok: true,
    request: {
      ...(body as RemyDiscoveryRuntimeRequest),
      message: body.message,
      now: typeof body.now === 'string' ? new Date(body.now) : undefined,
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
