'use server'

// Prospecting Hub - Wave 4: Pipeline & Outreach Actions
// Pipeline stage management, follow-up sequences, AI call scripts,
// outreach logging, CSV import, geographic clustering.

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
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
import { isSimilarName } from './fuzzy-match'
import type {
  Prospect,
  OutreachLogEntry,
  GeoCluster,
  FollowUpSequence,
  StageHistoryEntry,
} from './types'
import type { PipelineStage } from './constants'

// ── Pipeline Stage Management ────────────────────────────────────────────────

export async function updatePipelineStage(
  prospectId: string,
  stage: PipelineStage,
  notes?: string
) {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch current stage for history tracking
  const { data: current } = await db
    .from('prospects')
    .select('pipeline_stage')
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)
    .single()

  const fromStage = current?.pipeline_stage ?? null

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

  const { error } = await db
    .from('prospects')
    .update(updates)
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Failed to update pipeline stage')

  // Record stage history (non-blocking)
  try {
    await db.from('prospect_stage_history' as any).insert({
      prospect_id: prospectId,
      chef_id: user.tenantId!,
      from_stage: fromStage,
      to_stage: stage,
      notes: notes || null,
    })
  } catch (err) {
    console.error('[updatePipelineStage] Stage history insert failed (non-blocking):', err)
  }

  // Log the stage change
  await db.from('prospect_outreach_log').insert({
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
  const db: any = createServerClient()

  const { data, error } = await db
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
  const db: any = createServerClient()

  const { error } = await db.from('prospect_outreach_log').insert({
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
    const { data: prospect } = await db
      .from('prospects')
      .select('pipeline_stage')
      .eq('id', prospectId)
      .eq('chef_id', user.tenantId!)
      .single()

    if (prospect?.pipeline_stage === 'new' || prospect?.pipeline_stage === 'researched') {
      await db
        .from('prospects')
        .update({ pipeline_stage: 'contacted' })
        .eq('id', prospectId)
        .eq('chef_id', user.tenantId!)
    }
  } else if (outreachType === 'response_received') {
    await db
      .from('prospects')
      .update({ pipeline_stage: 'responded' })
      .eq('id', prospectId)
      .eq('chef_id', user.tenantId!)
  } else if (outreachType === 'meeting_scheduled') {
    await db
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
  const db: any = createServerClient()

  const { data, error } = await db
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
  const db: any = createServerClient()

  const { data: prospect, error: fetchError } = await db
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

  const raw = await (parseWithOllama as any)(userPrompt, {
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

  const { error: updateError } = await db
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
  const db: any = createServerClient()

  const { data: prospect, error: fetchError } = await db
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

  const raw = await (parseWithOllama as any)(userPrompt, {
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

  const { error: updateError } = await db
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
  const db: any = createServerClient()

  const rows = parseCSV(csvText)
  if (rows.length === 0) throw new Error('No valid rows found in CSV')
  if (rows.length > 500) throw new Error('CSV too large - max 500 prospects per import')

  // Fetch all existing prospect names for fuzzy dedup (one query, not N queries)
  const { data: existingProspects } = await db
    .from('prospects')
    .select('id, name')
    .eq('chef_id', user.tenantId!)

  const existingNames = (existingProspects ?? []).map((p: any) => p.name as string)

  let imported = 0
  let skipped = 0
  const importedNames: string[] = [] // track names added in this batch too

  // Fuzzy dedup: filter out duplicates against existing DB records AND this batch
  const rowsToInsert: typeof rows = []
  for (const row of rows) {
    const isDuplicate =
      existingNames.some((existing: any) => isSimilarName(row.name, existing)) ||
      importedNames.some((added) => isSimilarName(row.name, added))

    if (isDuplicate) {
      skipped++
      continue
    }

    rowsToInsert.push(row)
    importedNames.push(row.name)
  }

  // Batch insert all non-duplicate rows in one query
  if (rowsToInsert.length > 0) {
    const { error } = await db.from('prospects').insert(
      rowsToInsert.map((row) => ({
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
      }))
    )

    if (!error) {
      imported = rowsToInsert.length
    } else {
      skipped += rowsToInsert.length
      imported = 0
    }
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
  const db: any = createServerClient()

  const { data, error } = await db
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
  const db: any = createServerClient()

  const { data: prospect, error: fetchError } = await db
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

    await db
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
  const db: any = createServerClient()

  // Find prospects without coordinates that have addresses
  const { data, error } = await db
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

// ── Export to CSV ────────────────────────────────────────────────────────────

export async function exportProspectsToCSV(filters?: {
  status?: string
  pipelineStage?: string
  region?: string
}): Promise<string> {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('prospects')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('lead_score', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.pipelineStage) query = query.eq('pipeline_stage', filters.pipelineStage)
  if (filters?.region) query = query.ilike('region', `%${filters.region}%`)

  const { data, error } = await query
  if (error || !data || data.length === 0) return ''

  const headers = [
    'name',
    'prospect_type',
    'category',
    'pipeline_stage',
    'lead_score',
    'status',
    'phone',
    'email',
    'website',
    'contact_person',
    'contact_title',
    'address',
    'city',
    'state',
    'zip',
    'region',
    'description',
    'avg_event_budget',
    'annual_events_estimate',
    'last_called_at',
    'call_count',
    'last_outcome',
    'created_at',
  ]

  const { escapeCsvSafe } = await import('@/lib/security/csv-sanitize')

  const rows = data.map((p: any) =>
    headers.map((h) => escapeCsvSafe((p as Record<string, unknown>)[h] as any)).join(',')
  )

  return [headers.join(','), ...rows].join('\n')
}

// ── Pipeline Revenue Per Stage ──────────────────────────────────────────────

export async function getPipelineRevenueByStage(): Promise<
  Record<PipelineStage, { count: number; totalRevenue: number }>
> {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('prospects')
    .select('pipeline_stage, avg_event_budget, annual_events_estimate')
    .eq('chef_id', user.tenantId!)

  if (error || !data) {
    return {
      new: { count: 0, totalRevenue: 0 },
      researched: { count: 0, totalRevenue: 0 },
      contacted: { count: 0, totalRevenue: 0 },
      responded: { count: 0, totalRevenue: 0 },
      meeting_set: { count: 0, totalRevenue: 0 },
      converted: { count: 0, totalRevenue: 0 },
      lost: { count: 0, totalRevenue: 0 },
    }
  }

  const result: Record<string, { count: number; totalRevenue: number }> = {
    new: { count: 0, totalRevenue: 0 },
    researched: { count: 0, totalRevenue: 0 },
    contacted: { count: 0, totalRevenue: 0 },
    responded: { count: 0, totalRevenue: 0 },
    meeting_set: { count: 0, totalRevenue: 0 },
    converted: { count: 0, totalRevenue: 0 },
    lost: { count: 0, totalRevenue: 0 },
  }

  for (const p of data) {
    const stage = (p.pipeline_stage || 'new') as string
    if (!(stage in result)) continue

    result[stage].count++

    // Parse budget string like "$5,000" or "5000" into a number
    const budgetStr = (p.avg_event_budget ?? '').replace(/[$,\s]/g, '')
    const budget = parseFloat(budgetStr) || 0
    const eventsStr = (p.annual_events_estimate ?? '').replace(/[^\d]/g, '')
    const events = parseInt(eventsStr, 10) || 1

    result[stage].totalRevenue += budget * events
  }

  return result as Record<PipelineStage, { count: number; totalRevenue: number }>
}

// ── Auto Pipeline Rules (stale prospect handling) ───────────────────────────

export async function runAutoPipelineRules(): Promise<{
  staleToLost: number
  followUpBumped: number
}> {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  let staleToLost = 0
  let followUpBumped = 0

  // Rule 1: Prospects in "contacted" stage with no outreach activity for 14+ days → "lost"
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const { data: staleContacted } = await db
    .from('prospects')
    .select('id, pipeline_stage')
    .eq('chef_id', user.tenantId!)
    .eq('pipeline_stage', 'contacted')
    .lt('updated_at', fourteenDaysAgo.toISOString())

  if (staleContacted && staleContacted.length > 0) {
    // Batch fetch recent outreach for ALL stale prospects in one query
    const staleIds = staleContacted.map((p: any) => p.id)
    const { data: recentOutreachLogs } = await db
      .from('prospect_outreach_log')
      .select('prospect_id')
      .in('prospect_id', staleIds)
      .eq('chef_id', user.tenantId!)
      .gte('created_at', fourteenDaysAgo.toISOString())

    const hasRecentOutreach = new Set(
      (recentOutreachLogs ?? []).map((log: any) => log.prospect_id as string)
    )

    // Update and log only those without recent outreach
    for (const prospect of staleContacted) {
      if (hasRecentOutreach.has(prospect.id)) continue

      await db
        .from('prospects')
        .update({ pipeline_stage: 'lost' })
        .eq('id', prospect.id)
        .eq('chef_id', user.tenantId!)

      // Log the auto-change
      await db.from('prospect_outreach_log').insert({
        prospect_id: prospect.id,
        chef_id: user.tenantId!,
        outreach_type: 'note',
        notes: 'Auto-moved to Lost - no outreach activity for 14+ days',
      })

      staleToLost++
    }
  }

  // Rule 2: Prospects with overdue follow-ups (7+ days past due) → bump priority
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: overdueFollowUps } = await db
    .from('prospects')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'follow_up')
    .lt('next_follow_up_at', sevenDaysAgo.toISOString())
    .neq('priority', 'high')

  if (overdueFollowUps && overdueFollowUps.length > 0) {
    const overdueIds = overdueFollowUps.map((p: any) => p.id)
    await db
      .from('prospects')
      .update({ priority: 'high' })
      .in('id', overdueIds)
      .eq('chef_id', user.tenantId!)
    followUpBumped = overdueIds.length
  }

  revalidatePath('/prospecting')
  revalidatePath('/prospecting/pipeline')

  return { staleToLost, followUpBumped }
}

// ── Prospect Merge ──────────────────────────────────────────────────────────

export async function mergeProspects(keepId: string, mergeId: string): Promise<{ success: true }> {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch both prospects
  const [keepResult, mergeResult] = await Promise.all([
    db.from('prospects').select('*').eq('id', keepId).eq('chef_id', user.tenantId!).single(),
    db.from('prospects').select('*').eq('id', mergeId).eq('chef_id', user.tenantId!).single(),
  ])

  if (keepResult.error || !keepResult.data) throw new Error('Primary prospect not found')
  if (mergeResult.error || !mergeResult.data) throw new Error('Merge prospect not found')

  const keep = keepResult.data as Record<string, unknown>
  const merge = mergeResult.data as Record<string, unknown>

  // Fields to fill in from merge if keep is null/empty
  const fillableFields = [
    'phone',
    'email',
    'website',
    'address',
    'city',
    'state',
    'zip',
    'region',
    'contact_person',
    'contact_title',
    'contact_direct_phone',
    'contact_direct_email',
    'gatekeeper_name',
    'gatekeeper_notes',
    'best_time_to_call',
    'description',
    'avg_event_budget',
    'annual_events_estimate',
    'membership_size',
    'seasonal_notes',
    'competitors_present',
    'approach_strategy',
    'talking_points',
    'draft_email',
    'news_intel',
    'event_signals',
    'ai_call_script',
  ]

  const updates: Record<string, unknown> = {}
  for (const field of fillableFields) {
    if (!keep[field] && merge[field]) {
      updates[field] = merge[field]
    }
  }

  // Merge arrays: tags, luxury_indicators, event_types_hosted, enrichment_sources
  const arrayFields = ['tags', 'luxury_indicators', 'event_types_hosted', 'enrichment_sources']
  for (const field of arrayFields) {
    const keepArr = (keep[field] as string[]) ?? []
    const mergeArr = (merge[field] as string[]) ?? []
    const combined = [...new Set([...keepArr, ...mergeArr])]
    if (combined.length > keepArr.length) {
      updates[field] = combined
    }
  }

  // Keep the higher lead score
  if ((merge.lead_score as number) > (keep.lead_score as number)) {
    updates.lead_score = merge.lead_score
  }

  // Keep the higher call count (sum)
  updates.call_count = ((keep.call_count as number) ?? 0) + ((merge.call_count as number) ?? 0)

  // Merge social profiles
  const keepSocials = (keep.social_profiles as Record<string, string>) ?? {}
  const mergeSocials = (merge.social_profiles as Record<string, string>) ?? {}
  const combinedSocials = { ...mergeSocials, ...keepSocials } // keep's values win
  if (Object.keys(combinedSocials).length > Object.keys(keepSocials).length) {
    updates.social_profiles = combinedSocials
  }

  // Merge follow_up_sequence if keep doesn't have one
  if (!keep.follow_up_sequence && merge.follow_up_sequence) {
    updates.follow_up_sequence = merge.follow_up_sequence
  }

  // Apply updates to the kept prospect
  if (Object.keys(updates).length > 0) {
    await db.from('prospects').update(updates).eq('id', keepId).eq('chef_id', user.tenantId!)
  }

  // Move outreach log entries from merge to keep
  await db
    .from('prospect_outreach_log')
    .update({ prospect_id: keepId })
    .eq('prospect_id', mergeId)
    .eq('chef_id', user.tenantId!)

  // Move notes from merge to keep
  await db
    .from('prospect_notes')
    .update({ prospect_id: keepId })
    .eq('prospect_id', mergeId)
    .eq('chef_id', user.tenantId!)

  // Add merge note
  await db.from('prospect_notes').insert({
    prospect_id: keepId,
    chef_id: user.tenantId!,
    note_type: 'general',
    content: `Merged with "${merge.name}" - data combined, duplicate removed.`,
  })

  // Delete the merged prospect
  await db.from('prospects').delete().eq('id', mergeId).eq('chef_id', user.tenantId!)

  revalidatePath('/prospecting')
  revalidatePath(`/prospecting/${keepId}`)

  return { success: true as const }
}

// ── Lead Score Snapshot (for trending) ───────────────────────────────────────

export async function snapshotLeadScores(): Promise<{ updated: number }> {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('prospects')
    .select('id, lead_score, previous_lead_score')
    .eq('chef_id', user.tenantId!)

  if (error || !data) return { updated: 0 }

  let updated = 0
  for (const p of data) {
    // Only snapshot if score has changed
    if (p.lead_score !== p.previous_lead_score) {
      await db
        .from('prospects')
        .update({ previous_lead_score: p.lead_score })
        .eq('id', p.id)
        .eq('chef_id', user.tenantId!)
      updated++
    }
  }

  return { updated }
}

// ── Find Similar Prospects (for merge suggestions) ──────────────────────────

export async function findSimilarProspects(prospectId: string): Promise<Prospect[]> {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: prospect } = await db
    .from('prospects')
    .select('name, city, region')
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!prospect) return []

  // Fetch all other prospects to check for fuzzy name matches
  const { data: allProspects } = await db
    .from('prospects')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .neq('id', prospectId)
    .limit(500)

  if (!allProspects) return []

  return (allProspects as Prospect[]).filter((p) => isSimilarName(p.name, prospect.name))
}

// ── Send Prospect Email (via Gmail API) ──────────────────────────────────────

export async function sendProspectEmail(prospectId: string, subject: string, body: string) {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: prospect, error: fetchError } = await db
    .from('prospects')
    .select('*')
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !prospect) throw new Error('Prospect not found')

  const recipientEmail = prospect.contact_direct_email || prospect.email
  if (!recipientEmail) throw new Error('No email address for this prospect')

  // Get Gmail access token
  const { getGoogleAccessToken } = await import('@/lib/google/auth')
  const accessToken = await getGoogleAccessToken(user.entityId!)

  // Send the email
  const { sendEmail } = await import('@/lib/gmail/client')
  const gmailResult = await sendEmail(accessToken, {
    to: recipientEmail,
    subject,
    body,
  })

  // Log the outreach
  await db.from('prospect_outreach_log').insert({
    prospect_id: prospectId,
    chef_id: user.tenantId!,
    outreach_type: 'email',
    subject,
    body,
    notes: `Sent via Gmail to ${recipientEmail}`,
  })

  // Auto-advance pipeline if still in early stages
  if (prospect.pipeline_stage === 'new' || prospect.pipeline_stage === 'researched') {
    await db
      .from('prospects')
      .update({ pipeline_stage: 'contacted' })
      .eq('id', prospectId)
      .eq('chef_id', user.tenantId!)

    // Record stage history (non-blocking)
    try {
      await db.from('prospect_stage_history' as any).insert({
        prospect_id: prospectId,
        chef_id: user.tenantId!,
        from_stage: prospect.pipeline_stage,
        to_stage: 'contacted',
        notes: 'Auto-advanced after email send',
      })
    } catch (err) {
      console.error('[sendProspectEmail] Stage history failed (non-blocking):', err)
    }
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'prospect_emailed' as any,
      domain: 'prospecting',
      entityType: 'prospect',
      entityId: prospectId,
      summary: `Emailed ${prospect.name}: ${subject}`,
      context: { gmail_message_id: gmailResult.messageId },
    })
  } catch (err) {
    console.error('[sendProspectEmail] Activity log failed (non-blocking):', err)
  }

  revalidatePath(`/prospecting/${prospectId}`)
  revalidatePath('/prospecting/pipeline')

  return { success: true as const, messageId: gmailResult.messageId }
}

// ── Prospect Tag Management ──────────────────────────────────────────────────

export async function updateProspectTags(prospectId: string, tags: string[]) {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('prospects')
    .update({ tags })
    .eq('id', prospectId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Failed to update tags')

  revalidatePath(`/prospecting/${prospectId}`)
  revalidatePath('/prospecting')

  return { success: true as const }
}

// ── Stage History ────────────────────────────────────────────────────────────

export async function getStageHistory(prospectId: string): Promise<StageHistoryEntry[]> {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('prospect_stage_history' as any)
    .select('*')
    .eq('prospect_id', prospectId)
    .eq('chef_id', user.tenantId!)
    .order('changed_at', { ascending: false })

  if (error) return []
  return (data ?? []) as StageHistoryEntry[]
}

// ── Bulk Prospect Operations ─────────────────────────────────────────────────

export async function bulkUpdateProspects(
  prospectIds: string[],
  updates: {
    status?: string
    pipeline_stage?: string
    priority?: string
    tags?: string[]
  }
) {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  if (prospectIds.length === 0) throw new Error('No prospects selected')
  if (prospectIds.length > 100) throw new Error('Max 100 prospects per batch')

  const updatePayload: Record<string, unknown> = {}
  if (updates.status) updatePayload.status = updates.status
  if (updates.pipeline_stage) updatePayload.pipeline_stage = updates.pipeline_stage
  if (updates.priority) updatePayload.priority = updates.priority
  if (updates.tags) updatePayload.tags = updates.tags

  if (Object.keys(updatePayload).length === 0) throw new Error('No updates specified')

  // Fetch current stages before update (for accurate stage history)
  let currentStages = new Map<string, string | null>()
  if (updates.pipeline_stage) {
    const { data: current } = await db
      .from('prospects')
      .select('id, pipeline_stage')
      .in('id', prospectIds)
      .eq('chef_id', user.tenantId!)

    if (current) {
      for (const p of current) {
        currentStages.set(p.id, p.pipeline_stage ?? null)
      }
    }
  }

  const { error } = await db
    .from('prospects')
    .update(updatePayload)
    .in('id', prospectIds)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Bulk update failed')

  // Record stage history for pipeline stage changes (with accurate from_stage)
  if (updates.pipeline_stage) {
    try {
      const historyRows = prospectIds.map((id) => ({
        prospect_id: id,
        chef_id: user.tenantId!,
        from_stage: currentStages.get(id) ?? null,
        to_stage: updates.pipeline_stage!,
        notes: 'Bulk update',
      }))
      await db.from('prospect_stage_history' as any).insert(historyRows)
    } catch (err) {
      console.error('[bulkUpdateProspects] Stage history failed (non-blocking):', err)
    }
  }

  revalidatePath('/prospecting')
  revalidatePath('/prospecting/pipeline')

  return { success: true as const, updated: prospectIds.length }
}

export async function bulkDeleteProspects(prospectIds: string[]) {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  if (prospectIds.length === 0) throw new Error('No prospects selected')
  if (prospectIds.length > 100) throw new Error('Max 100 prospects per batch')

  const { error } = await db
    .from('prospects')
    .delete()
    .in('id', prospectIds)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Bulk delete failed')

  revalidatePath('/prospecting')
  revalidatePath('/prospecting/pipeline')

  return { success: true as const, deleted: prospectIds.length }
}

// ── Follow-Up Reminder → Chef Todo ──────────────────────────────────────────

export async function createFollowUpReminders(): Promise<{ created: number }> {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  // Find prospects with follow-ups due today or overdue
  const now = new Date().toISOString()
  const { data: dueProspects, error } = await db
    .from('prospects')
    .select('id, name, next_follow_up_at')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'follow_up')
    .lte('next_follow_up_at', now)
    .order('next_follow_up_at', { ascending: true })
    .limit(50)

  if (error || !dueProspects || dueProspects.length === 0) return { created: 0 }

  // Check which prospects already have a pending todo (avoid duplicates)
  const { data: existingTodos } = await db
    .from('chef_todos')
    .select('text')
    .eq('chef_id', user.tenantId!)
    .eq('completed', false)
    .ilike('text', '%follow up%prospect%')

  const existingTexts = new Set((existingTodos ?? []).map((t: any) => t.text.toLowerCase()))

  // Filter out duplicates, then batch insert
  const todosToInsert = dueProspects
    .map((p: any) => ({ text: `Follow up with prospect: ${p.name}` }))
    .filter((todo: any) => !existingTexts.has(todo.text.toLowerCase()))

  let created = 0
  if (todosToInsert.length > 0) {
    const { error: insertError } = await db.from('chef_todos').insert(
      todosToInsert.map((todo: any) => ({
        chef_id: user.tenantId!,
        text: todo.text,
        completed: false,
        sort_order: 0,
        created_by: user.id,
      }))
    )

    if (!insertError) created = todosToInsert.length
  }

  return { created }
}

// ── Conversion Funnel Stats ────────────────────────────────────────────────

interface FunnelStage {
  stage: string
  count: number
  avgDaysInStage: number | null
}

export async function getConversionFunnelStats(): Promise<{
  stages: FunnelStage[]
  totalProspects: number
}> {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  // Count prospects per pipeline stage
  const { data: prospects, error } = await db
    .from('prospects')
    .select('pipeline_stage')
    .eq('chef_id', user.tenantId!)

  if (error || !prospects) return { stages: [], totalProspects: 0 }

  const stageCounts = new Map<string, number>()
  for (const p of prospects) {
    const stage = p.pipeline_stage || 'new'
    stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1)
  }

  // Calculate avg days in stage from stage history
  const { data: history } = await db
    .from('prospect_stage_history' as any)
    .select('from_stage, to_stage, changed_at')
    .eq('chef_id', user.tenantId!)
    .order('changed_at', { ascending: true })

  const stageDurations = new Map<string, number[]>()
  if (history && history.length > 0) {
    // Group transitions by prospect - track time from entry to exit per stage
    const entryTimes = new Map<string, Map<string, string>>()
    for (const h of history) {
      const key = h.from_stage || '__initial'
      // Record when a prospect entered 'to_stage'
      if (!entryTimes.has(h.to_stage)) entryTimes.set(h.to_stage, new Map())
    }

    // Simpler approach: for each transition, calculate from_stage duration
    // by looking at pairs of transitions
    for (let i = 0; i < history.length - 1; i++) {
      for (let j = i + 1; j < history.length; j++) {
        if (history[j].from_stage === history[i].to_stage) {
          const entryDate = new Date(history[i].changed_at)
          const exitDate = new Date(history[j].changed_at)
          const days = Math.round(
            (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          if (days >= 0 && days < 365) {
            const stage = history[i].to_stage
            if (!stageDurations.has(stage)) stageDurations.set(stage, [])
            stageDurations.get(stage)!.push(days)
          }
          break
        }
      }
    }
  }

  // Build ordered funnel
  const stageOrder = [
    'new',
    'researched',
    'contacted',
    'responded',
    'meeting_set',
    'converted',
    'lost',
  ]
  const stages: FunnelStage[] = stageOrder
    .filter((s) => stageCounts.has(s))
    .map((stage) => {
      const durations = stageDurations.get(stage) || []
      const avgDays =
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null
      return {
        stage,
        count: stageCounts.get(stage)!,
        avgDaysInStage: avgDays,
      }
    })

  return { stages, totalProspects: prospects.length }
}

// ── Hot Pipeline Count (responded + meeting_set) ───────────────────────────

export async function getHotPipelineCount(): Promise<number> {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  const { count, error } = await db
    .from('prospects')
    .select('id', { count: 'exact', head: true })
    .eq('chef_id', user.tenantId!)
    .in('pipeline_stage', ['responded', 'meeting_set'])

  if (error) return 0
  return count ?? 0
}

// ── Check Gmail Connection ─────────────────────────────────────────────────

export async function checkGmailConnected(): Promise<boolean> {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('google_connections')
    .select('gmail_connected')
    .eq('chef_id', user.entityId!)
    .maybeSingle()

  return data?.gmail_connected ?? false
}
