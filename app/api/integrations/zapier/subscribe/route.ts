import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { hasProAccess } from '@/lib/billing/tier'
import { ProFeatureRequiredError } from '@/lib/billing/errors'
import { ZAPIER_EVENT_TYPES, type ZapierEventType } from '@/lib/integrations/zapier/zapier-events'
import { validateWebhookUrl } from '@/lib/security/url-validation'

// Zapier REST Hook subscription endpoints.
// POST = subscribe (Zapier calls this when a Zap is turned on)
// GET = list subscriptions
// DELETE = unsubscribe (Zapier calls this when a Zap is turned off)
//
// Auth modes:
// - Session auth: logged-in chef + Pro integration access
// - API key auth: Authorization Bearer <ZAPIER_SUBSCRIBE_API_KEY> + tenant_id

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function getApiToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim() || null
  }

  return req.headers.get('x-chefflow-zapier-key')?.trim() || null
}

function getTenantId(req: NextRequest, body?: Record<string, unknown>): string | null {
  const fromQuery =
    req.nextUrl.searchParams.get('tenant_id') || req.nextUrl.searchParams.get('tenantId')

  if (fromQuery) return fromQuery

  const fromBody = body?.tenant_id ?? body?.tenantId
  return typeof fromBody === 'string' && fromBody.trim().length > 0 ? fromBody.trim() : null
}

async function authorizeRequest(req: NextRequest, body?: Record<string, unknown>) {
  let user: Awaited<ReturnType<typeof requireChef>> | null = null

  try {
    user = await requireChef()
  } catch {
    user = null
  }

  if (user) {
    try {
      await requirePro('integrations')
      return { tenantId: user.entityId }
    } catch (err) {
      throw err
    }
  }

  const expectedKey = process.env.ZAPIER_SUBSCRIBE_API_KEY?.trim()
  const providedKey = getApiToken(req)

  if (!expectedKey || !providedKey || providedKey !== expectedKey) {
    throw new HttpError(401, 'Unauthorized')
  }

  const tenantId = getTenantId(req, body)
  if (!tenantId) {
    throw new HttpError(400, 'Missing tenant_id for API key request')
  }

  // All features are free - no tier check needed

  return { tenantId }
}

function normalizeEventTypes(input: unknown): string[] {
  const list = Array.isArray(input)
    ? input
    : Array.isArray((input as { event_types?: unknown[] } | null)?.event_types)
      ? ((input as { event_types?: unknown[] }).event_types ?? [])
      : []

  const valid = list.filter((value): value is ZapierEventType => {
    return typeof value === 'string' && ZAPIER_EVENT_TYPES.includes(value as ZapierEventType)
  })

  if (valid.length > 0) return valid
  return ['inquiry.created']
}

async function readJsonBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const parsed = await req.json()
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req)
    const { tenantId } = await authorizeRequest(req, body)

    const targetUrlCandidate = body.hookUrl ?? body.target_url ?? body.targetUrl
    if (typeof targetUrlCandidate !== 'string' || !targetUrlCandidate.trim()) {
      throw new HttpError(400, 'Missing webhook URL')
    }

    const targetUrl = targetUrlCandidate.trim()
    let normalizedTargetUrl = targetUrl
    try {
      normalizedTargetUrl = validateWebhookUrl(targetUrl).toString()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid webhook URL'
      throw new HttpError(400, message)
    }

    const eventTypes = normalizeEventTypes(body.event_types ?? body.eventTypes ?? body)

    const supabase = createServerClient({ admin: true })
    const { data, error } = await supabase
      .from('zapier_webhook_subscriptions')
      .insert({
        tenant_id: tenantId,
        target_url: normalizedTargetUrl,
        event_types: eventTypes,
      })
      .select('id, target_url, event_types, secret, created_at')
      .single()

    if (error) {
      console.error('[zapier/subscribe] Insert failed:', error.message)
      throw new HttpError(400, 'Subscription failed')
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 400
    const message = err instanceof Error ? err.message : 'Subscription failed'
    return NextResponse.json({ error: message }, { status })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await authorizeRequest(req)

    const supabase = createServerClient({ admin: true })
    const { data, error } = await supabase
      .from('zapier_webhook_subscriptions')
      .select('id, target_url, event_types, is_active, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[zapier/subscribe] List failed:', error.message)
      throw new HttpError(500, 'Failed to list subscriptions')
    }

    return NextResponse.json(data || [])
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500
    const message = err instanceof Error ? err.message : 'Failed to list subscriptions'
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await readJsonBody(req)
    const { tenantId } = await authorizeRequest(req, body)

    const id = req.nextUrl.searchParams.get('id') || (typeof body.id === 'string' ? body.id : null)
    const hookUrl =
      req.nextUrl.searchParams.get('hookUrl') ||
      req.nextUrl.searchParams.get('target_url') ||
      (typeof body.hookUrl === 'string' ? body.hookUrl : null) ||
      (typeof body.target_url === 'string' ? body.target_url : null)

    if (!id && !hookUrl) {
      throw new HttpError(400, 'Missing subscription id or hookUrl')
    }

    const supabase = createServerClient({ admin: true })
    let query = supabase
      .from('zapier_webhook_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)

    if (id) {
      query = query.eq('id', id)
    } else if (hookUrl) {
      query = query.eq('target_url', hookUrl)
    }

    const { error } = await query

    if (error) {
      console.error('[zapier/subscribe] Delete failed:', error.message)
      throw new HttpError(400, 'Delete failed')
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 400
    const message = err instanceof Error ? err.message : 'Delete failed'
    return NextResponse.json({ error: message }, { status })
  }
}
