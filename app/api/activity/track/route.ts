// Client-side Activity Tracking Endpoint
// POST /api/activity/track — records client portal activity events.
// Called from client portal pages on load (page views, event views, etc.).

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { trackActivity } from '@/lib/activity/track'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event_type, entity_type, entity_id, metadata } = body

    if (!event_type) {
      return NextResponse.json({ error: 'event_type required' }, { status: 400 })
    }

    // Identify the user from session
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve tenant and client from user_roles
    const { data: role } = await supabase
      .from('user_roles')
      .select('entity_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!role) {
      return NextResponse.json({ error: 'No role found' }, { status: 403 })
    }

    // For clients, entity_id is the client record ID; tenant is looked up from clients table
    if (role.role === 'client') {
      const adminSupabase = createServerClient({ admin: true })
      const { data: client } = await adminSupabase
        .from('clients')
        .select('id, tenant_id')
        .eq('id', role.entity_id)
        .single()

      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }

      await trackActivity({
        tenantId: client.tenant_id,
        actorType: 'client',
        actorId: user.id,
        clientId: client.id,
        eventType: event_type,
        entityType: entity_type || undefined,
        entityId: entity_id || undefined,
        metadata: metadata || {},
      })
    } else if (role.role === 'chef') {
      await trackActivity({
        tenantId: role.entity_id,
        actorType: 'chef',
        actorId: user.id,
        eventType: event_type,
        entityType: entity_type || undefined,
        entityId: entity_id || undefined,
        metadata: metadata || {},
      })
    }

    return NextResponse.json({ tracked: true })
  } catch (err) {
    console.error('[Activity Track API] Error:', err)
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}
