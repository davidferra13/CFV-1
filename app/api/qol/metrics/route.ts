import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { isQolMetricKey } from '@/lib/qol/metrics'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 })
    }

    const body = (await request.json().catch(() => null)) as {
      metricKey?: unknown
      entityType?: unknown
      entityId?: unknown
      metadata?: unknown
    } | null

    if (!body || !isQolMetricKey(body.metricKey)) {
      return NextResponse.json({ error: 'Invalid metric key' }, { status: 400 })
    }

    const supabase = createServerClient()
    await (supabase.from('qol_metric_events' as any) as any).insert({
      tenant_id: user.tenantId,
      actor_id: user.id,
      metric_key: body.metricKey,
      entity_type: typeof body.entityType === 'string' ? body.entityType : null,
      entity_id: typeof body.entityId === 'string' ? body.entityId : null,
      metadata:
        body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
          ? body.metadata
          : {},
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unable to record metric' }, { status: 500 })
  }
}
