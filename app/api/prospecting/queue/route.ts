// GET /api/prospecting/queue
// Returns uncontacted prospects with emails for n8n personalization pipeline.
// Query params: limit (default 50), category, region, min_score

import { NextRequest, NextResponse } from 'next/server'
import { validateProspectingAuth } from '@/lib/prospecting/api-auth'
import { createServerClient } from '@/lib/db/server'

export async function GET(request: NextRequest) {
  const auth = await validateProspectingAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const rawLimit = Number(url.searchParams.get('limit') ?? '50')
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 200) : 50
  const category = url.searchParams.get('category')
  const region = url.searchParams.get('region')
  const minScore = Number(url.searchParams.get('min_score') ?? '0')

  const db = createServerClient({ admin: true })

  let query = db
    .from('prospects' as any)
    .select(
      'id, name, email, contact_direct_email, category, city, state, region, website, contact_person, contact_title, description, avg_event_budget, event_types_hosted, luxury_indicators, lead_score, draft_email, pipeline_stage, tags'
    )
    .eq('chef_id', auth.tenantId)
    .in('pipeline_stage', ['new', 'researched'])
    .in('status', ['new', 'queued'])
    .not('email', 'is', null)
    .order('lead_score', { ascending: false })
    .limit(limit)

  if (category) query = query.eq('category', category)
  if (region) query = query.ilike('region', `%${region}%`)
  if (minScore > 0) query = query.gte('lead_score', minScore)

  const { data, error } = await query

  if (error) {
    console.error('[prospecting/queue] Query error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ prospects: data ?? [], count: data?.length ?? 0 })
}
