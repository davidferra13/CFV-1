'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  InquiryCockpitEntry,
  InquiryFilter,
  InquiryMetrics,
  InquiryPriority,
  InquiryStatus,
  InquiryTemplate,
} from './inquiry-cockpit-types'

// ---------------------------------------------------------------------------
// 1. getInquiryCockpit - filtered inquiry list with counts
// ---------------------------------------------------------------------------
export async function getInquiryCockpit(
  filters?: InquiryFilter
): Promise<{ entries: InquiryCockpitEntry[]; total: number }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('inquiry_cockpit_entries')
    .select('*', { count: 'exact' })
    .eq('tenant_id', chef.id)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority)
  }
  if (filters?.source) {
    query = query.eq('source', filters.source)
  }
  if (filters?.dateRange?.from) {
    query = query.gte('created_at', filters.dateRange.from)
  }
  if (filters?.dateRange?.to) {
    query = query.lte('created_at', filters.dateRange.to)
  }
  if (filters?.search) {
    query = query.or(
      `client_name.ilike.%${filters.search}%,client_email.ilike.%${filters.search}%`
    )
  }

  const { data, count, error } = await query

  if (error) throw new Error(`Failed to load inquiries: ${error.message}`)

  const entries: InquiryCockpitEntry[] = (data ?? []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    source: row.source,
    eventType: row.event_type,
    eventDate: row.event_date,
    guestCount: row.guest_count,
    budget: row.budget,
    status: row.status as InquiryStatus,
    priority: row.priority as InquiryPriority,
    notes: row.notes,
    responseTimeMinutes: row.response_time_minutes,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  return { entries, total: count ?? entries.length }
}

// ---------------------------------------------------------------------------
// 2. updateInquiryStatus - change inquiry status
// ---------------------------------------------------------------------------
export async function updateInquiryStatus(
  inquiryId: string,
  status: InquiryStatus,
  notes?: string
): Promise<{ success: boolean }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const update: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (notes !== undefined) update.notes = notes

  // Calculate response time when first responding
  if (status === 'responded') {
    const { data: existing } = await db
      .from('inquiry_cockpit_entries')
      .select('created_at, response_time_minutes')
      .eq('id', inquiryId)
      .eq('tenant_id', chef.id)
      .single()

    if (existing && !existing.response_time_minutes) {
      const created = new Date(existing.created_at).getTime()
      const now = Date.now()
      update.response_time_minutes = Math.round((now - created) / 60000)
    }
  }

  const { error } = await db
    .from('inquiry_cockpit_entries')
    .update(update)
    .eq('id', inquiryId)
    .eq('tenant_id', chef.id)

  if (error) throw new Error(`Failed to update status: ${error.message}`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// 3. setInquiryPriority - set/change priority
// ---------------------------------------------------------------------------
export async function setInquiryPriority(
  inquiryId: string,
  priority: InquiryPriority
): Promise<{ success: boolean }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('inquiry_cockpit_entries')
    .update({ priority, updated_at: new Date().toISOString() })
    .eq('id', inquiryId)
    .eq('tenant_id', chef.id)

  if (error) throw new Error(`Failed to set priority: ${error.message}`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// 4. getInquiryMetrics - conversion rates, response times, source breakdown
// ---------------------------------------------------------------------------
export async function getInquiryMetrics(
  dateRange?: { from: string; to: string }
): Promise<InquiryMetrics> {
  const chef = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('inquiry_cockpit_entries')
    .select('*')
    .eq('tenant_id', chef.id)

  if (dateRange?.from) query = query.gte('created_at', dateRange.from)
  if (dateRange?.to) query = query.lte('created_at', dateRange.to)

  const { data, error } = await query
  if (error) throw new Error(`Failed to load metrics: ${error.message}`)

  const rows: any[] = data ?? []
  const total = rows.length

  // Average response time (only for entries with a recorded response)
  const responseTimes = rows
    .map((r: any) => r.response_time_minutes)
    .filter((t: any): t is number => t != null)
  const avgResponseTime =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((a: number, b: number) => a + b, 0) /
            responseTimes.length
        )
      : null

  // Conversion rate
  const converted = rows.filter((r: any) => r.status === 'converted').length
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0

  // Group by source
  const bySource: Record<string, number> = {}
  for (const row of rows) {
    bySource[row.source] = (bySource[row.source] ?? 0) + 1
  }

  // Group by status
  const byStatus: Record<string, number> = {}
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1
  }

  // Group by month (YYYY-MM)
  const byMonth: Record<string, number> = {}
  for (const row of rows) {
    const month = (row.created_at as string).slice(0, 7)
    byMonth[month] = (byMonth[month] ?? 0) + 1
  }

  return { totalInquiries: total, avgResponseTime, conversionRate, bySource, byStatus, byMonth }
}

// ---------------------------------------------------------------------------
// 5. saveResponseTemplate - save reusable response template
// ---------------------------------------------------------------------------
export async function saveResponseTemplate(
  name: string,
  subject: string,
  body: string,
  category?: string
): Promise<{ success: boolean; id: string }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('inquiry_response_templates')
    .insert({
      tenant_id: chef.id,
      name,
      subject,
      body,
      category: category ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to save template: ${error.message}`)

  return { success: true, id: data.id }
}

// ---------------------------------------------------------------------------
// 6. getResponseTemplates - list response templates
// ---------------------------------------------------------------------------
export async function getResponseTemplates(
  category?: string
): Promise<InquiryTemplate[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('inquiry_response_templates')
    .select('*')
    .eq('tenant_id', chef.id)
    .order('use_count', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load templates: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    subject: row.subject,
    body: row.body,
    category: row.category,
    useCount: row.use_count ?? 0,
    createdAt: row.created_at,
  }))
}

// ---------------------------------------------------------------------------
// 7. getInquiryTimeline - status changes and interactions for one inquiry
// ---------------------------------------------------------------------------
export async function getInquiryTimeline(
  inquiryId: string
): Promise<{ id: string; status: InquiryStatus; notes: string | null; createdAt: string }[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Verify ownership
  const { data: entry, error: lookupErr } = await db
    .from('inquiry_cockpit_entries')
    .select('id')
    .eq('id', inquiryId)
    .eq('tenant_id', chef.id)
    .single()

  if (lookupErr || !entry) {
    throw new Error('Inquiry not found or access denied')
  }

  // For now, return current state as single timeline entry.
  // A dedicated timeline/audit table can be added later for full history.
  const { data: current } = await db
    .from('inquiry_cockpit_entries')
    .select('id, status, notes, updated_at')
    .eq('id', inquiryId)
    .eq('tenant_id', chef.id)
    .single()

  if (!current) return []

  return [
    {
      id: current.id,
      status: current.status as InquiryStatus,
      notes: current.notes,
      createdAt: current.updated_at,
    },
  ]
}
