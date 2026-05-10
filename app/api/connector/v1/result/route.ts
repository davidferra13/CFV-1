// POST /api/connector/v1/result
// The local connector posts the Ollama result for a claimed task.
// Authentication: Bearer cf_connector_<key>
// Body: ConnectorResult

import { NextRequest, NextResponse } from 'next/server'
import { validateConnectorKey } from '@/lib/ai/connector/auth'
import { completeConnectorTask, failConnectorTask } from '@/lib/ai/connector/actions'
import type { ConnectorResult } from '@/lib/ai/connector/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ctx = await validateConnectorKey(req.headers.get('authorization'))
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ConnectorResult
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { taskId, success, result, error: taskError, durationMs } = body

  if (!taskId || typeof taskId !== 'string') {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 })
  }

  if (success) {
    await completeConnectorTask(taskId, ctx.userId, result, durationMs ?? 0)
  } else {
    await failConnectorTask(taskId, ctx.userId, taskError ?? 'Connector returned failure')
  }

  return NextResponse.json({ ok: true })
}
