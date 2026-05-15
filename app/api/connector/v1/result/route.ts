// POST /api/connector/v1/result
// The local connector posts the Ollama result for a claimed task.
// Authentication: Bearer cf_connector_<key>
// Body: ConnectorResult

import { NextRequest, NextResponse } from 'next/server'
import { validateConnectorKey } from '@/lib/ai/connector/auth'
import { completeConnectorTask, failConnectorTask } from '@/lib/ai/connector/actions'
import type { ConnectorResult } from '@/lib/ai/connector/types'
import { z } from 'zod'

const ConnectorResultSchema = z.object({
  taskId: z.string().min(1),
  success: z.boolean(),
  result: z.unknown().optional(),
  error: z.string().max(5000).optional(),
  durationMs: z.number().min(0).optional(),
})

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ctx = await validateConnectorKey(req.headers.get('authorization'))
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ConnectorResultSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { taskId, success, result, error: taskError, durationMs } = parsed.data

  if (success) {
    await completeConnectorTask(taskId, ctx.userId, result, durationMs ?? 0)
  } else {
    await failConnectorTask(taskId, ctx.userId, taskError ?? 'Connector returned failure')
  }

  return NextResponse.json({ ok: true })
}
