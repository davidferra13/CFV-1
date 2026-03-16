// PATCH /api/prospecting/[id]/enrich
// Update enrichment fields on an existing prospect (event signals, news, social profiles).
// Used by OpenClaw's automated enrichment jobs.

import { NextRequest, NextResponse } from 'next/server'
import { validateProspectingAuth } from '@/lib/prospecting/api-auth'
import { createServerClient } from '@/lib/supabase/server'

interface EnrichPayload {
  event_signals?: string | null
  news_intel?: string | null
  social_profiles?: Record<string, string> | null
  annual_events_estimate?: string | null
  avg_event_budget?: string | null
  luxury_indicators?: string[] | null
  enrichment_sources?: string[] | null
  contact_person?: string | null
  contact_title?: string | null
  contact_direct_email?: string | null
  contact_direct_phone?: string | null
  website?: string | null
  phone?: string | null
}

const ALLOWED_FIELDS = new Set([
  'event_signals',
  'news_intel',
  'social_profiles',
  'annual_events_estimate',
  'avg_event_budget',
  'luxury_indicators',
  'enrichment_sources',
  'contact_person',
  'contact_title',
  'contact_direct_email',
  'contact_direct_phone',
  'website',
  'phone',
])

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateProspectingAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: EnrichPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Filter to only allowed fields (prevent overwriting sensitive columns)
  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key) && value !== undefined) {
      updates[key] = value
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  // Always stamp the enrichment timestamp
  updates.last_enriched_at = new Date().toISOString()

  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('prospects' as any)
    .update(updates)
    .eq('id', params.id)
    .eq('chef_id', auth.tenantId)
    .select('id, name, last_enriched_at')
    .single()

  if (error) {
    console.error('[prospecting/enrich] Update error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, prospect: data })
}
