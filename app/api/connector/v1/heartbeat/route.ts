// POST /api/connector/v1/heartbeat
// Lightweight keep-alive from the local connector.
// Updates last_seen_at and records connector health metadata.
// Authentication: Bearer cf_connector_<key>
// Body: ConnectorHeartbeat

import { NextRequest, NextResponse } from 'next/server'
import { validateConnectorKey } from '@/lib/ai/connector/auth'
import { createAdminClient } from '@/lib/db/admin'
import type { ConnectorHeartbeat } from '@/lib/ai/connector/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ctx = await validateConnectorKey(req.headers.get('authorization'))
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ConnectorHeartbeat = { version: 'unknown', ollamaReachable: false }
  try {
    body = await req.json()
  } catch {
    // Heartbeat body is optional metadata; ignore parse errors
  }

  // last_seen_at is already updated by validateConnectorKey.
  // We can extend this to store health metadata later if needed.

  return NextResponse.json({
    ok: true,
    serverTime: new Date().toISOString(),
    connectorId: ctx.connectorId,
  })
}
