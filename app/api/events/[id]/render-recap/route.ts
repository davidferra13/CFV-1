// GET  /api/events/[id]/render-recap  → status check
// POST /api/events/[id]/render-recap  → trigger render

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getRecapVideoStatus, queueRecapVideoRender } from '@/lib/remotion/render-event-recap'
import { createServerClient } from '@/lib/db/server'

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: eventId } = await params

  const tenantId = await resolveTenantId(user, eventId)
  if (!tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await getRecapVideoStatus(eventId, tenantId)
  return NextResponse.json(result)
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: eventId } = await params

  const tenantId = await resolveTenantId(user, eventId)
  if (!tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check if already rendering or done
  const current = await getRecapVideoStatus(eventId, tenantId)
  if (current.status === 'rendering') {
    return NextResponse.json({ status: 'rendering', message: 'Render already in progress' })
  }
  if (current.status === 'done') {
    return NextResponse.json({ status: 'done', message: 'Recap video already exists' })
  }

  // Fire render (non-blocking)
  queueRecapVideoRender(eventId, tenantId).catch(() => {
    // Errors are logged inside queueRecapVideoRender
  })

  return NextResponse.json({ status: 'pending', message: 'Render queued' })
}

// ─── Helper ──────────────────────────────────────────────────────────────────

async function resolveTenantId(
  user: { role?: string; tenantId?: string | null; entityId?: string | null },
  eventId: string
): Promise<string | null> {
  if (user.role === 'chef' && user.tenantId) {
    return user.tenantId
  }

  if (user.role === 'client') {
    const db = createServerClient() as any
    const { data } = await db
      .from('events')
      .select('tenant_id, client_id')
      .eq('id', eventId)
      .single()

    if (data && data.client_id === user.entityId) {
      return data.tenant_id as string
    }
    return null
  }

  return null
}
