'use server'

// Prospecting Hub — Wave 4: Pipeline & Outreach Actions
// Pipeline stage management, follow-up sequences, AI call scripts,
// outreach logging, CSV import, geographic clustering.

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import {
  FOLLOW_UP_SEQUENCE_SYSTEM_PROMPT,
  buildFollowUpSequencePrompt,
  AI_CALL_SCRIPT_SYSTEM_PROMPT,
  buildAICallScriptPrompt,
} from './scrub-prompt'
import { computeLeadScore } from './lead-scoring'
import type { Prospect, OutreachLogEntry, GeoCluster, FollowUpSequence } from './types'
import type { PipelineStage } from './constants'

// ── Pipeline Stage Management ────────────────────────────────────────────────

export async function updatePipelineStage(
  prospectId: string,
  stage: PipelineStage,
  notes?: string
) {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  const updates: Record<string, unknown> = { pipeline_stage: stage }

  // Auto-sync status field for backwards compatibility
  if (stage === 'converted') {
    updates.status = 'converted'
    updates.converted_at = new Date().toISOString()
  } else if (stage === 'lost') {
    updates.status = 'not_interested'
  } else if (stage === 'contacted') {
    if (updates.status !== 'called' && updates.status !== 'follow_up') {
      updates.status = 'called'
    }
  }

  const { error } = await supabase
    .from('prospects')
    .update(updates)
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Failed to update pipeline stage')

  // Log the stage change
  await supabase.from('prospect_outreach_log').insert({
    prospect_id: prospectId,
    chef_id: user.tenantId!,
    outreach_type: 'note',
    notes: notes || `Pipeline stage changed to ${stage}`,
  })

  revalidatePath('/prospecting')
  revalidatePath('/prospecting/pipeline')
  revalidatePath(`/prospecting/${prospectId}`)

  return { success: true as const }
}

export async function getProspectsByPipelineStage(): Promise<Record<PipelineStage, Prospect[]>> {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('lead_score', { ascending: false })

  if (error || !data) {
    return {
      new: [],
      researched: [],
      contacted: [],
      responded: [],
      meeting_set: [],
      converted: [],
      lost: [],
    }
  }

  const grouped: Record<PipelineStage, Prospect[]> = {
    new: [],
    researched: [],
    contacted: [],
    responded: [],
    meeting_set: [],
    converted: [],
    lost: [],
  }

  for (const prospect of data as Prospect[]) {
    const stage = prospect.pipeline_stage || 'new'
    if (stage in grouped) {
      grouped[stage].push(prospect)
    } else {
      grouped.new.push(prospect)
    }
  }

  return grouped
}

// ── Outreach Log ─────────────────────────────────────────────────────────────

export async function logOutreach(
  prospectId: string,
  outreachType: string,
  data: {
    sequenceNumber?: number
    subject?: string
    body?: string
    outcome?: string
    notes?: string
  }
) {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase.from('prospect_outreach_log').insert({
    prospect_id: prospectId,
    chef_id: user.tenantId!,
    outreach_type: outreachType,
    sequence_number: data.sequenceNumber ?? null,
    subject: data.subject ?? null,
    body: data.body ?? null,
    outcome: data.outcome ?? null,
    notes: data.notes ?? null,
  })

  if (error) throw new Error('Failed to log outreach')

  // Auto-advance pipeline stage based on outreach type
  if (outreachType === 'email' || outreachType === 'call') {
    const { data: prospect } = await supabase
      .from('prospects')
      .select('pipeline_stage')
      .eq('id', prospectId)
      .eq('chef_id', user.tenantId!)
      .single()

    if (prospect?.pipeline_stage === 'new' || prospect?.pipeline_stage === 'researched') {
      await supabase
        .from('prospects')
        .update({ pipeline_stage: 'contacted' })
        .eq('id', prospectId)
        .eq('chef_id', user.tenantId!)
    }
  } else if (outreachType === 'response_received') {
    await supabase
      .from('prospects')
      .update({ pipeline_stage: 'responded' })
      .eq('id', prospectId)
      .eq('chef_id', user.tenantId!)
  } else if (outreachType === 'meeting_scheduled') {
    await supabase
      .from('prospects')
      .update({ pipeline_stage: 'meeting_set' })
      .eq('id', prospectId)
      .eq('chef_id', user.tenantId!)
  }

  revalidatePath(`/prospecting/${prospectId}`)
  revalidatePath('/prospecting/pipeline')

  return { success: true as const }
}

export async function getOutreachLog(prospectId: string): Promise<OutreachLogEntry[]> {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('prospect_outreach_log')
    .select('*')
    .eq('prospect_id', prospectId)
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as OutreachLogEntry[]
}

// ── Follow-Up Email Sequence ─────────────────────────────────────────────────

const FollowUpEmailSchema = z.object({
  sequence: z.number(),
  subject: z.string(),
  body: z.string(),
  send_after_days: z.number(),
})

const FollowUpSequenceSchema = z.object({
  emails: z.array(FollowUpEmailSchema),
})

export async function generateFollowUpSequence(prospectId: string) {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: prospect, error: fetchError } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !prospect) throw new Error('Prospect not found')

  const userPrompt = buildFollowUpSequencePrompt({
    name: prospect.name,
    category: prospect.category,
    prospectType: prospect.prospect_type,
    description: prospect.description,
    city: prospect.city,
    state: prospect.state,
    contactPerson: prospect.contact_person,
    draftEmail: prospect.draft_email,
    talkingPoints: prospect.talking_points,
    newsIntel: prospect.news_intel,
  })

  const raw = await parseWithOllama(userPrompt, {
    systemPrompt: FOLLOW_UP_SEQUENCE_SYSTEM_PROMPT,
    format: 'json',
    temperature: 0.7,
    model: 'complex',
    timeoutMs: 90_000,
  })

  const parsed = FollowUpSequenceSchema.safeParse(raw)
  if (!parsed.success) throw new Error('Failed to parse follow-up sequence from AI')

  // Build complete sequence: email 1 is the existing draft, emails 2-3 from AI
  const fullSequence: FollowUpSequence = {
    emails: [
      // Email 1: the existing draft email
      ...(prospect.draft_email
        ? [
            {
              sequence: 1,
              subject: 'Initial Outreach',
              body: prospect.draft_email,
              send_after_days: 0,
            },
          ]
        : []),
      // Emails 2-3: from AI
      ...parsed.data.emails,
    ],
  }

  const { error: updateError } = await supabase
    .from('prospects')
    .update({ follow_up_sequence: fullSequence })
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)

  if (updateError) throw new Error('Failed to save follow-up sequence')

  revalidatePath(`/prospecting/${prospectId}`)
  return { success: true as const, sequence: fullSequence }
}

// ── AI Call Script Generator ─────────────────────────────────────────────────

const CallScriptSchema = z.object({
  opening: z.string(),
  valueProp: z.string(),
  theAsk: z.string(),
  objectionHandlers: z.array(
    z.object({
      objection: z.string(),
      response: z.string(),
    })
  ),
  voicemailScript: z.string(),
})

export async function generateAICallScript(prospectId: string) {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: prospect, error: fetchError } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !prospect) throw new Error('Prospect not found')

  const userPrompt = buildAICallScriptPrompt({
    name: prospect.name,
    category: prospect.category,
    prospectType: prospect.prospect_type,
    description: prospect.description,
    city: prospect.city,
    state: prospect.state,
    contactPerson: prospect.contact_person,
    contactTitle: prospect.contact_title,
    eventTypesHosted: prospect.event_types_hosted,
    avgEventBudget: prospect.avg_event_budget,
    luxuryIndicators: prospect.luxury_indicators,
    talkingPoints: prospect.talking_points,
    approachStrategy: prospect.approach_strategy,
    newsIntel: prospect.news_intel,
    competitorsPresent: prospect.competitors_present,
  })

  const raw = await parseWithOllama(userPrompt, {
    systemPrompt: AI_CALL_SCRIPT_SYSTEM_PROMPT,
    format: 'json',
    temperature: 0.7,
    model: 'complex',
    timeoutMs: 90_000,
  })

  const parsed = CallScriptSchema.safeParse(raw)
  if (!parsed.success) throw new Error('Failed to parse call script from AI')

  // Format the script as readable text
  const script = parsed.data
  const formattedScript = [
    '📞 OPENING:',
    script.opening,
    '',
    '💡 VALUE PROP:',
    script.valueProp,
    '',
    '🎯 THE ASK:',
    script.theAsk,
    '',
    '🛡️ OBJECTION HANDLERS:',
    ...script.objectionHandlers.map((h) => `• "${h.objection}"\n  → ${h.response}`),
    '',
    '📱 VOICEMAIL:',
    script.voicemailScript,
  ].join('\n')

  const { error: updateError } = await supabase
    .from('prospects')
    .update({ ai_call_script: formattedScript })
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)

  if (updateError) throw new Error('Failed to save call script')

  revalidatePath(`/prospecting/${prospectId}`)
  return { success: true as const, script: formattedScript }
}

// ── CSV Import ───────────────────────────────────────────────────────────────

const CSV_FIELD_MAP: Record<string, string> = {
  name: 'name',
  business: 'name',
  company: 'name',
  organization: 'name',
  phone: 'phone',
  telephone: 'phone',
  phone_number: 'phone',
  email: 'email',
  email_address: 'email',
  website: 'website',
  url: 'website',
  address: 'address',
  street: 'address',
  street_address: 'address',
  city: 'city',
  state: 'state',
  zip: 'zip',
  zipcode: 'zip',
  zip_code: 'zip',
  postal: 'zip',
  region: 'region',
  area: 'region',
  contact: 'contact_person',
  contact_name: 'contact_person',
  contact_person: 'contact_person',
  title: 'contact_title',
  contact_title: 'contact_title',
  role: 'contact_title',
  description: 'description',
  notes: 'notes',
  category: 'category',
  type: 'prospect_type',
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []

  // Parse header
  const headers = lines[0].split(',').map((h) =>
    h
      .trim()
      .replace(/^["']|["']$/g, '')
      .toLowerCase()
      .replace(/\s+/g, '_')
  )

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      const mappedField = CSV_FIELD_MAP[headers[j]] || headers[j]
      row[mappedField] = values[j]?.trim().replace(/^["']|["']$/g, '') || ''
    }
    if (row.name) rows.push(row)
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  values.push(current)
  return values
}

export async function importProspectsFromCSV(csvText: string) {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  const rows = parseCSV(csvText)
  if (rows.length === 0) throw new Error('No valid rows found in CSV')
  if (rows.length > 500) throw new Error('CSV too large — max 500 prospects per import')

  let imported = 0
  let skipped = 0

  for (const row of rows) {
    // Simple dedup: check if name already exists for this chef
    const { data: existing } = await supabase
      .from('prospects')
      .select('id')
      .eq('chef_id', user.tenantId!)
      .ilike('name', row.name)
      .limit(1)

    if (existing && existing.length > 0) {
      skipped++
      continue
    }

    const { error } = await supabase.from('prospects').insert({
      chef_id: user.tenantId!,
      name: row.name,
      prospect_type: row.prospect_type === 'individual' ? 'individual' : 'organization',
      category: row.category || 'other',
      description: row.description || null,
      phone: row.phone || null,
      email: row.email || null,
      website: row.website || null,
      address: row.address || null,
      city: row.city || null,
      state: row.state || null,
      zip: row.zip || null,
      region: row.region || null,
      contact_person: row.contact_person || null,
      contact_title: row.contact_title || null,
      notes: row.notes || null,
      source: 'csv_import',
      status: 'new',
      pipeline_stage: 'new',
    })

    if (!error) imported++
    else skipped++
  }

  revalidatePath('/prospecting')
  return {
    success: true as const,
    imported,
    skipped,
    total: rows.length,
  }
}

// ── Geographic Clustering ────────────────────────────────────────────────────
// Groups prospects by region for efficient route-based outreach days.

export async function getGeoClusters(): Promise<GeoCluster[]> {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .not('status', 'in', '("dead","not_interested")')
    .order('region', { ascending: true })

  if (error || !data) return []

  const prospects = data as Prospect[]

  // Group by region (or city+state if no region)
  const regionMap = new Map<string, Prospect[]>()
  for (const p of prospects) {
    const key = p.region || [p.city, p.state].filter(Boolean).join(', ') || 'Unknown'
    if (!regionMap.has(key)) regionMap.set(key, [])
    regionMap.get(key)!.push(p)
  }

  // Convert to clusters, sorted by count descending
  const clusters: GeoCluster[] = []
  for (const [region, regionProspects] of regionMap) {
    // Use first prospect with coordinates as cluster center
    const withCoords = regionProspects.find((p) => p.latitude && p.longitude)
    clusters.push({
      center_lat: withCoords?.latitude ?? 0,
      center_lng: withCoords?.longitude ?? 0,
      region,
      prospects: regionProspects.sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0)),
      count: regionProspects.length,
    })
  }

  return clusters.sort((a, b) => b.count - a.count)
}

// ── Geocode Prospect (best-effort, using free Nominatim API) ─────────────────

export async function geocodeProspect(prospectId: string) {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: prospect, error: fetchError } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !prospect) throw new Error('Prospect not found')

  const addressParts = [prospect.address, prospect.city, prospect.state, prospect.zip].filter(
    Boolean
  )
  if (addressParts.length === 0) return { success: false as const, error: 'No address to geocode' }

  const query = encodeURIComponent(addressParts.join(', '))

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      {
        headers: { 'User-Agent': 'ChefFlow/1.0' },
      }
    )

    if (!response.ok) return { success: false as const, error: 'Geocoding API error' }

    const results = await response.json()
    if (!results || results.length === 0) {
      return { success: false as const, error: 'Address not found' }
    }

    const lat = parseFloat(results[0].lat)
    const lng = parseFloat(results[0].lon)

    await supabase
      .from('prospects')
      .update({ latitude: lat, longitude: lng })
      .eq('id', prospectId)
      .eq('chef_id', user.tenantId!)

    revalidatePath(`/prospecting/${prospectId}`)
    return { success: true as const, latitude: lat, longitude: lng }
  } catch {
    return { success: false as const, error: 'Geocoding request failed' }
  }
}

// ── Batch Geocode (best-effort, up to 20 at a time with 1s delay) ────────────

export async function batchGeocode() {
  await requireAdmin()
  const user = await requireChef()
  const supabase = createServerClient()

  // Find prospects without coordinates that have addresses
  const { data, error } = await supabase
    .from('prospects')
    .select('id, address, city, state, zip')
    .eq('chef_id', user.tenantId!)
    .is('latitude', null)
    .not('city', 'is', null)
    .limit(20)

  if (error || !data || data.length === 0) {
    return { success: true as const, geocoded: 0, message: 'No prospects to geocode' }
  }

  let geocoded = 0
  for (const prospect of data) {
    const result = await geocodeProspect(prospect.id)
    if (result.success) geocoded++
    // Respect Nominatim's rate limit (1 request/second)
    await new Promise((resolve) => setTimeout(resolve, 1100))
  }

  revalidatePath('/prospecting')
  return { success: true as const, geocoded, total: data.length }
}
