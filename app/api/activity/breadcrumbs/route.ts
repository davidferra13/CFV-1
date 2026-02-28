// POST /api/activity/breadcrumbs — Batched breadcrumb writes for retrace mode
// Accepts an array of breadcrumb events and inserts them in bulk.
// Non-blocking: failures return 200 with { tracked: false } to avoid disrupting the app.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    // Authenticate the user
    const supabase: any = createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ tracked: false, error: 'unauthorized' }, { status: 401 })
    }

    // Get tenant ID from user_roles
    const { data: role } = await supabase
      .from('user_roles')
      .select('entity_id')
      .eq('auth_user_id', user.id)
      .eq('role', 'chef')
      .single()

    if (!role?.entity_id) {
      return NextResponse.json({ tracked: false, error: 'no_chef_role' }, { status: 403 })
    }

    const body = await request.json()
    const items = Array.isArray(body.items) ? body.items : [body]

    // Validate and shape rows
    const rows = items
      .slice(0, 50) // cap at 50 per batch
      .filter((item: Record<string, unknown>) => item.path && typeof item.path === 'string')
      .map((item: Record<string, unknown>) => ({
        tenant_id: role.entity_id,
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
