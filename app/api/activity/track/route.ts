// POST /api/activity/track
// Records portal activity events from authenticated users.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { trackActivity } from '@/lib/activity/track'
import { activityTrackPayloadSchema } from '@/lib/activity/schemas'
import { incrementMetric, logActivityEvent } from '@/lib/activity/observability'
import { checkAndFireIntentNotifications } from '@/lib/activity/intent-notifications'
import { checkRateLimit } from '@/lib/rateLimit'
import { verifyCsrfOrigin } from '@/lib/security/csrf'
import { ACTIVITY_EVENT_TO_PLATFORM_EVENT } from '@/lib/platform-observability/taxonomy'
import { recordPlatformEvent } from '@/lib/platform-observability/events'
import { extractRequestMetadata } from '@/lib/platform-observability/context'

function buildActivitySummary(
  eventType: string,
  surface: 'client portal' | 'chef portal',
  entityType?: string,
  metadata?: Record<string, unknown>
): string {
  const pathname =
    typeof metadata?.pathname === 'string'
      ? metadata.pathname
      : typeof metadata?.path === 'string'
        ? metadata.path
        : null
  const target = pathname ?? entityType ?? 'platform'
  return `${eventType.replace(/_/g, ' ')} recorded on ${surface} (${target})`
}

export async function POST(request: NextRequest) {
  const csrfError = verifyCsrfOrigin(request)
  if (csrfError) return csrfError

  try {
    // Rate limit: 120 events per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    try {
      await checkRateLimit(`activity-track:${ip}`, 120, 60_000)
    } catch {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

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

    const db: any = createServerClient()
    const {
      data: { user },
    } = await db.auth.getUser()
    if (!user) {
      incrementMetric('activity.track.unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: role } = await db
      .from('user_roles')
      .select('entity_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!role) {
      return NextResponse.json({ error: 'No role found' }, { status: 403 })
    }

    if (role.role === 'client') {
      const adminDb = createServerClient({ admin: true })
      const { data: client } = await adminDb
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

      const platformEventKey = ACTIVITY_EVENT_TO_PLATFORM_EVENT[event_type]
      await recordPlatformEvent({
        eventKey: platformEventKey,
        source: 'private_client_portal',
        actorType: 'client',
        actorId: client.id,
        authUserId: user.id,
        tenantId: client.tenant_id,
        subjectType: entity_type,
        subjectId: entity_id,
        summary: buildActivitySummary(event_type, 'client portal', entity_type, metadata),
        metadata: {
          ...extractRequestMetadata(request.headers),
          ...(metadata ?? {}),
        },
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

      const platformEventKey = ACTIVITY_EVENT_TO_PLATFORM_EVENT[event_type]
      await recordPlatformEvent({
        eventKey: platformEventKey,
        source: 'private_chef_portal',
        actorType: 'chef',
        actorId: role.entity_id,
        authUserId: user.id,
        tenantId: role.entity_id,
        subjectType: entity_type,
        subjectId: entity_id,
        summary: buildActivitySummary(event_type, 'chef portal', entity_type, metadata),
        metadata: {
          ...extractRequestMetadata(request.headers),
          ...(metadata ?? {}),
        },
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
