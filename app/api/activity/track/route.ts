// POST /api/activity/track
// Records portal activity events from authenticated users.

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { trackActivity } from '@/lib/activity/track'
import { activityTrackPayloadSchema } from '@/lib/activity/schemas'
import { incrementMetric, logActivityEvent } from '@/lib/activity/observability'
import { checkAndFireIntentNotifications } from '@/lib/activity/intent-notifications'
import { checkRateLimit } from '@/lib/rateLimit'
import { verifyCsrfOrigin } from '@/lib/security/csrf'

function inferDeviceLabel(userAgent: string | null): string | null {
  if (!userAgent) return null

  const ua = userAgent.toLowerCase()
  if (ua.includes('iphone')) return 'iPhone'
  if (ua.includes('ipad')) return 'iPad'
  if (ua.includes('android') && ua.includes('mobile')) return 'Android phone'
  if (ua.includes('android')) return 'Android tablet'
  if (ua.includes('macintosh') || ua.includes('mac os x')) return 'Mac'
  if (ua.includes('windows')) return 'Windows PC'
  if (ua.includes('linux')) return 'Linux'

  return 'Unknown device'
}

function extractPathFromReferer(referer: string | null): string | null {
  if (!referer) return null

  try {
    return new URL(referer).pathname
  } catch {
    return null
  }
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
    const referer = request.headers.get('referer')
    const userAgent = request.headers.get('user-agent')
    const enrichedMetadata = {
      page_path:
        (metadata as Record<string, unknown> | undefined)?.page_path ??
        extractPathFromReferer(referer),
      referrer: (metadata as Record<string, unknown> | undefined)?.referrer ?? referer,
      device_label:
        (metadata as Record<string, unknown> | undefined)?.device_label ??
        inferDeviceLabel(userAgent),
      user_agent: (metadata as Record<string, unknown> | undefined)?.user_agent ?? userAgent,
      location_city:
        (metadata as Record<string, unknown> | undefined)?.location_city ??
        request.headers.get('x-vercel-ip-city'),
      location_region:
        (metadata as Record<string, unknown> | undefined)?.location_region ??
        request.headers.get('x-vercel-ip-country-region'),
      location_country:
        (metadata as Record<string, unknown> | undefined)?.location_country ??
        request.headers.get('x-vercel-ip-country') ??
        request.headers.get('cf-ipcountry'),
      ...(metadata ?? {}),
    }

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
        metadata: enrichedMetadata,
      })

      // Fire intent notifications as a non-blocking side effect
      void checkAndFireIntentNotifications({
        tenantId: client.tenant_id,
        clientId: client.id,
        eventType: event_type,
        entityType: entity_type,
        entityId: entity_id,
        metadata: enrichedMetadata,
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
