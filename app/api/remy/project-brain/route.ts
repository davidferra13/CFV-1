import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { isRemyAdmin } from '@/lib/ai/remy-abuse-actions'
import {
  getChefFlowProjectBrain,
  submitChefFlowProjectIntent,
  type ProjectIntentInput,
} from '@/lib/ai/project-brain-client'

async function requireProjectBrainAdmin() {
  await requireChef()
  const admin = await isRemyAdmin()
  if (!admin) {
    throw Object.assign(new Error('Project Brain is owner/admin only.'), {
      status: 403,
    })
  }
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20)
}
function parseIntent(body: unknown): ProjectIntentInput | null {
  if (!body || typeof body !== 'object') return null
  const row = body as Record<string, unknown>
  if (typeof row.objective !== 'string' || !row.objective.trim()) return null

  return {
    objective: row.objective.trim().slice(0, 4000),
    why: typeof row.why === 'string' ? row.why.trim().slice(0, 3000) : undefined,
    constraints: stringList(row.constraints),
    definitionOfDone: stringList(row.definitionOfDone ?? row.definition_of_done),
    conversationId:
      typeof row.conversationId === 'string'
        ? row.conversationId.trim().slice(0, 200)
        : undefined,
    source: 'chefflow-remy',
    run: row.run !== false,
  }
}

function errorResponse(error: unknown) {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
      ? (error as { status: number }).status
      : 503
  const message = error instanceof Error ? error.message : 'Project Brain unavailable.'
  return NextResponse.json({ ok: false, error: message }, { status })
}

export async function GET() {
  try {
    await requireProjectBrainAdmin()
    const brain = await getChefFlowProjectBrain()
    return NextResponse.json({ ok: true, brain })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireProjectBrainAdmin()
    const body = await request.json().catch(() => null)
    const intent = parseIntent(body)
    if (!intent) {
      return NextResponse.json(
        { ok: false, error: 'A non-empty objective is required.' },
        { status: 400 }
      )
    }

    const result = await submitChefFlowProjectIntent(intent)
    return NextResponse.json({ ok: true, ...result }, { status: 202 })
  } catch (error) {
    return errorResponse(error)
  }
}
