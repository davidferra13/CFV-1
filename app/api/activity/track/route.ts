// POST /api/activity/track
// Records portal activity events from authenticated users.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { trackActivity } from '@/lib/activity/track'
import { activityTrackPayloadSchema } from '@/lib/activity/schemas'
import { incrementMetric, logActivityEvent } from '@/lib/activity/observability'
import { checkAndFireIntentNotifications } from '@/lib/activity/intent-notifications'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = activityTrackPayloadSchema.safeParse(body)
    if (!parsed.success) {
      incrementMetric('activity.track.invalid_payload')
      logActivityEvent('warn', 'activity track rejected invalid payload', {
        issues: parsed.error.issues.map((issue) => issue.message),
      })
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { event_type, entity_type, entity_id, metadata } = parsed.data

    const supabase: any = createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      incrementMetric('activity.track.unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: role } = await supabase
      .from('user_roles')
      .select('entity_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!role) {
      return NextResponse.json({ error: 'No role found' }, { status: 403 })
    }

    if (role.role === 'client') {
      const adminSupabase = createServerClient({ admin: true })
      const { data: client } = await adminSupabase
        .from('clients')
        .select('id, tenant_id')
        .eq('id', role.entity_id)
        .single()

      if (!client || !client.tenant_id) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }

      await trackActivity({
        tenantId: client.tenant_id,
        actorType: 'client',
        actorId: user.id,
        clientId: client.id,
        eventType: event_type,
        entityType: entity_type,
        entityId: entity_id,
        metadata,
      })

      // Fire intent notifications as a non-blocking side effect
      void checkAndFireIntentNotifications({
        tenantId: client.tenant_id,
        clientId: client.id,
        eventType: event_type,
        entityType: entity_type,
        entityId: entity_id,
        metadata,
      })
    } else if (role.role === 'chef') {
      await trackActivity({
        tenantId: role.entity_id,
        actorType: 'chef',
        actorId: user.id,
        eventType: event_type,
        entityType: entity_type,
        entityId: entity_id,
        metadata,
      })
    }

    return NextResponse.json({ tracked: true })
  } catch (err) {
    incrementMetric('activity.track.failure')
    logActivityEvent('error', 'activity track endpoint failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}
