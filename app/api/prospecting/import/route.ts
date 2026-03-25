// POST /api/prospecting/import
// Bulk import scraped leads from n8n into the prospects table.
// Accepts: { prospects: [...], campaign_id?: string }
// Returns: { imported: number, skipped: number, ids: string[] }

import { NextResponse } from 'next/server'
import { validateProspectingAuth } from '@/lib/prospecting/api-auth'
import { createServerClient } from '@/lib/supabase/server'
import { computeProspectScore } from '@/lib/prospecting/lead-scoring'
import { isSimilarName } from '@/lib/prospecting/fuzzy-match'

interface ProspectImport {
  name: string
  prospect_type?: 'organization' | 'individual'
  category?: string
  description?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  region?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  contact_person?: string | null
  contact_title?: string | null
  contact_direct_phone?: string | null
  contact_direct_email?: string | null
  social_profiles?: Record<string, string> | null
  annual_events_estimate?: string | null
  membership_size?: string | null
  avg_event_budget?: string | null
  event_types_hosted?: string[] | null
  seasonal_notes?: string | null
  luxury_indicators?: string[] | null
  latitude?: number | null
  longitude?: number | null
  tags?: string[]
  priority?: string
}

export async function POST(request: Request) {
  const auth = await validateProspectingAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { prospects: ProspectImport[]; campaign_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(body.prospects) || body.prospects.length === 0) {
    return NextResponse.json({ error: 'prospects array required' }, { status: 400 })
  }

  if (body.prospects.length > 500) {
    return NextResponse.json({ error: 'Max 500 prospects per import' }, { status: 400 })
  }

  const supabase = createServerClient({ admin: true })

  // Fetch existing for dedup
  const { data: existing } = await supabase
    .from('prospects' as any)
    .select('id, name, city')
    .eq('chef_id', auth.tenantId)

  const existingList = (existing ?? []) as unknown as {
    id: string
    name: string
    city: string | null
  }[]

  const toInsert: Record<string, unknown>[] = []
  let skipped = 0

  for (const p of body.prospects) {
    if (!p.name?.trim()) {
      skipped++
      continue
    }

    // Fuzzy dedup check
    const isDup = existingList.some(
      (e) => isSimilarName(e.name, p.name) && (!p.city || !e.city || isSimilarName(e.city, p.city))
    )
    if (isDup) {
      skipped++
      continue
    }

    // Compute lead score
    const score = computeProspectScore({
      avgEventBudget: p.avg_event_budget ?? '',
      annualEventsEstimate: p.annual_events_estimate ?? '',
      luxuryIndicators: p.luxury_indicators ?? [],
      phone: p.phone ?? '',
      email: p.email ?? '',
      website: p.website ?? '',
      contactPerson: p.contact_person ?? '',
      contactDirectPhone: p.contact_direct_phone ?? '',
      socialProfiles: p.social_profiles ?? {},
      verified: false,
      eventTypesHosted: p.event_types_hosted ?? [],
      membershipSize: p.membership_size ?? '',
    })

    const record: Record<string, unknown> = {
      chef_id: auth.tenantId,
      name: p.name.trim(),
      prospect_type: p.prospect_type ?? 'organization',
      category: p.category ?? 'other',
      description: p.description ?? null,
      address: p.address ?? null,
      city: p.city ?? null,
      state: p.state ?? null,
      zip: p.zip ?? null,
      region: p.region ?? p.state ?? null,
      phone: p.phone ?? null,
      email: p.email ?? null,
      website: p.website ?? null,
      contact_person: p.contact_person ?? null,
      contact_title: p.contact_title ?? null,
      contact_direct_phone: p.contact_direct_phone ?? null,
      contact_direct_email: p.contact_direct_email ?? null,
      social_profiles: p.social_profiles ?? {},
      annual_events_estimate: p.annual_events_estimate ?? null,
      membership_size: p.membership_size ?? null,
      avg_event_budget: p.avg_event_budget ?? null,
      event_types_hosted: p.event_types_hosted ?? null,
      seasonal_notes: p.seasonal_notes ?? null,
      luxury_indicators: p.luxury_indicators ?? null,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
      tags: p.tags ?? [],
      priority: p.priority ?? 'normal',
      source: 'n8n_scrape',
      status: 'new',
      pipeline_stage: 'new',
      lead_score: score,
      call_count: 0,
      verified: false,
      scrub_type: 'standard',
    }

    if (body.campaign_id) {
      record.outreach_campaign_id = body.campaign_id
    }

    toInsert.push(record)
    // Add to existing list to prevent intra-batch dupes
    existingList.push({ id: '', name: p.name, city: p.city ?? null })
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ imported: 0, skipped, ids: [] })
  }

  // Batch insert (Supabase supports up to 1000 rows)
  const { data: inserted, error } = await supabase
    .from('prospects' as any)
    .insert(toInsert)
    .select('id')

  if (error) {
    console.error('[prospecting/import] Insert error:', error)
    return NextResponse.json({ error: 'Database insert failed' }, { status: 500 })
  }

  const ids = ((inserted ?? []) as unknown as { id: string }[]).map((r) => r.id)

  // Update campaign leads_count if campaign_id provided
  if (body.campaign_id && ids.length > 0) {
    try {
      await supabase.rpc('increment_field' as any, {
        table_name: 'outreach_campaigns',
        field_name: 'leads_count',
        row_id: body.campaign_id,
        amount: ids.length,
      })
    } catch {
      // Non-blocking: RPC may not exist yet, update manually
      try {
        const { data }: any = await supabase
          .from('outreach_campaigns' as any)
          .select('leads_count')
          .eq('id', body.campaign_id)
          .single()
        if (data) {
          await supabase
            .from('outreach_campaigns' as any)
            .update({ leads_count: (data.leads_count ?? 0) + ids.length })
            .eq('id', body.campaign_id)
        }
      } catch {
        // non-blocking
      }
    }
  }

  return NextResponse.json({ imported: ids.length, skipped, ids })
}
