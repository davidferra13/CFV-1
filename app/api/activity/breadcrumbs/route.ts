// POST /api/activity/breadcrumbs - Batched breadcrumb writes for retrace mode
// Accepts an array of breadcrumb events and inserts them in bulk.
// Non-blocking: failures return 200 with { tracked: false } to avoid disrupting the app.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { getCurrentUser } from '@/lib/auth/get-user'
import { checkRateLimit } from '@/lib/rateLimit'
import { z } from 'zod'

const BreadcrumbItemSchema = z.object({
  path: z.string().max(500),
  breadcrumb_type: z.string().max(50).optional(),
  label: z.string().max(200).nullable().optional(),
  referrer_path: z.string().max(500).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  session_id: z.string().max(100).nullable().optional(),
  timestamp: z.string().optional(),
})

const BreadcrumbPayloadSchema = z.union([
  z.object({ items: z.array(BreadcrumbItemSchema).max(50) }),
  BreadcrumbItemSchema,
])

const adminClient = createAdminClient()

export async function POST(request: Request) {
  try {
    // Rate limit: 60 batches per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    try {
      await checkRateLimit(`breadcrumbs:${ip}`, 60, 60_000)
    } catch {
      return NextResponse.json({ tracked: false, error: 'rate_limited' }, { status: 429 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ tracked: false, error: 'unauthorized' }, { status: 401 })
    }

    const tenantId = user.tenantId ?? user.entityId
    if (user.role !== 'chef' || !tenantId) {
      return NextResponse.json({ tracked: false, error: 'forbidden' }, { status: 403 })
    }

    const raw = await request.json()
    const parsed = BreadcrumbPayloadSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ tracked: false, error: 'invalid_payload' }, { status: 400 })
    }
    const body = parsed.data
    const items = 'items' in body ? body.items : [body]

    // Validate and shape rows
    const rows = items
      .slice(0, 50) // cap at 50 per batch
      .filter((item: Record<string, unknown>) => item.path && typeof item.path === 'string')
      .map((item: Record<string, unknown>) => ({
        tenant_id: tenantId,
        actor_id: user.id,
        breadcrumb_type: item.breadcrumb_type || 'page_view',
        path: item.path,
        label: item.label || null,
        referrer_path: item.referrer_path || null,
        metadata: item.metadata || {},
        session_id: item.session_id || null,
        created_at: item.timestamp || new Date().toISOString(),
      }))

    if (rows.length === 0) {
      return NextResponse.json({ tracked: false, error: 'no_valid_items' })
    }

    const { error } = await adminClient.from('chef_breadcrumbs').insert(rows)

    if (error) {
      console.error('[breadcrumbs] Insert failed:', error.message)
      return NextResponse.json({ tracked: false })
    }

    return NextResponse.json({ tracked: true, count: rows.length })
  } catch (err) {
    console.error('[breadcrumbs] Unexpected error:', err)
    return NextResponse.json({ tracked: false })
  }
}
