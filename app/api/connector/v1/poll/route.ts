// GET /api/connector/v1/poll
// The local connector calls this to pick up the next AI job for its tenant.
// Authentication: Bearer cf_connector_<key>
// Returns 200 with a job, 204 if no work, 401 if unauthorized.

import { NextRequest, NextResponse } from 'next/server'
import { validateConnectorKey } from '@/lib/ai/connector/auth'
import { claimNextTaskForConnector } from '@/lib/ai/connector/actions'
import type { ConnectorJob } from '@/lib/ai/connector/types'
import { CONNECTOR_POLL_TIMEOUT_MS } from '@/lib/ai/connector/types'
import { getTaskDefinition } from '@/lib/ai/queue/registry'

export const runtime = 'nodejs'
// No caching - this is a live poll endpoint
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ctx = await validateConnectorKey(req.headers.get('authorization'))
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const task = await claimNextTaskForConnector(ctx.userId)

  if (!task) {
    return new NextResponse(null, { status: 204 })
  }

  // Build the prompt from the task's payload and definition
  const definition = getTaskDefinition(task.taskType)
  const payload = task.payload as Record<string, unknown>

  // Determine which model to use
  const modelByTier: Record<string, string> = {
    fast: ctx.defaultModel,
    standard: ctx.defaultModel,
    complex: ctx.defaultModel,
  }
  const model = modelByTier[task.modelTier] ?? ctx.defaultModel

  // Construct the job for the connector.
  // The connector sends this prompt verbatim to Ollama; ChefFlow never routes
  // raw Ollama traffic through the public internet.
  const job: ConnectorJob = {
    taskId: task.taskId,
    taskType: task.taskType,
    modelTier: task.modelTier,
    model,
    prompt: buildPromptFromPayload(payload, task.taskType),
    systemPrompt: (definition as any)?.systemPrompt,
    responseSchema: (definition as any)?.outputSchema,
    timeoutMs: CONNECTOR_POLL_TIMEOUT_MS,
  }

  return NextResponse.json(job, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

function buildPromptFromPayload(payload: Record<string, unknown>, taskType: string): string {
  // If the payload already contains an explicit prompt, use it directly
  if (typeof payload.prompt === 'string') return payload.prompt
  // Otherwise serialize the payload as structured input for the task type
  return `Task: ${taskType}\n\nInput:\n${JSON.stringify(payload, null, 2)}`
}
