'use server'

import { createHash } from 'crypto'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { escapeLikePattern } from '@/lib/db/escape-like'
import type { MemoryCategory } from '@/lib/ai/remy-memory-types'
import {
  buildRemyOperatingHub,
  type RemyOperatingHubData,
  type RemyRawHubInput,
} from '@/lib/remy/operating-hub'

const MEMORY_CATEGORIES: MemoryCategory[] = [
  'chef_preference',
  'client_insight',
  'business_rule',
  'communication_style',
  'culinary_note',
  'scheduling_pattern',
  'pricing_pattern',
  'workflow_preference',
]

interface SafeRows {
  source: string
  rows: Array<Record<string, unknown>>
  available: boolean
  note: string
}

export async function loadRemyOperatingHub(searchQuery?: string): Promise<RemyOperatingHubData> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const now = new Date()
  const nowIso = now.toISOString()
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    upcomingEvents,
    completedEvents,
    overdueTasks,
    unreadInbox,
    pendingQuotes,
    openInquiries,
    memories,
    auditEntries,
    policyRows,
    searchRows,
  ] = await Promise.all([
    safeRows(
      'events',
      db
        .from('events')
        .select('id, title, occasion, event_date, guest_count, status, updated_at, created_at')
        .eq('tenant_id', tenantId)
        .gte('event_date', nowIso)
        .lte('event_date', twoWeeks)
        .order('event_date', { ascending: true })
        .limit(20)
    ),
    safeRows(
      'completed_events',
      db
        .from('events')
        .select('id, title, occasion, event_date, guest_count, status, updated_at, created_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('event_date', thirtyDaysAgo)
        .order('event_date', { ascending: false })
        .limit(20)
    ),
    safeRows(
      'tasks',
      db
        .from('tasks')
        .select('id, title, due_date, completed, updated_at, created_at')
        .eq('tenant_id', tenantId)
        .eq('completed', false)
        .lt('due_date', nowIso)
        .order('due_date', { ascending: true })
        .limit(20)
    ),
    safeRows(
      'inbox_messages',
      db
        .from('inbox_messages')
        .select('id, subject, preview, body, message, read, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(20)
    ),
    safeRows(
      'quotes',
      db
        .from('quotes')
        .select('id, quote_name, status, sent_at, updated_at, created_at')
        .eq('tenant_id', tenantId)
        .in('status', ['draft', 'sent', 'pending', 'viewed'])
        .order('updated_at', { ascending: false })
        .limit(30)
    ),
    safeRows(
      'inquiries',
      db
        .from('inquiries')
        .select('id, status, channel, confirmed_occasion, first_contact_at, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .in('status', ['new', 'awaiting_chef', 'awaiting_client', 'quoted'])
        .order('created_at', { ascending: true })
        .limit(30)
    ),
    safeRows(
      'remy_memories',
      db
        .from('remy_memories')
        .select(
          'id, category, content, importance, access_count, related_client_id, source_message, is_active, last_accessed_at, created_at, updated_at'
        )
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('importance', { ascending: false })
        .order('last_accessed_at', { ascending: false })
        .limit(40)
    ),
    safeRows(
      'remy_action_audit_log',
      db
        .from('remy_action_audit_log')
        .select('id, task_type, source, status, error_message, started_at, finished_at, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(60)
    ),
    safeRows(
      'remy_approval_policies',
      db
        .from('remy_approval_policies')
        .select('task_type, decision, reason, enabled, updated_at')
        .eq('tenant_id', tenantId)
        .order('task_type', { ascending: true })
        .limit(80)
    ),
    searchQuery?.trim()
      ? runBusinessSearch(db, tenantId, searchQuery.trim())
      : Promise.resolve(emptyRows('search')),
  ])

  const raw: RemyRawHubInput = {
    nowIso,
    upcomingEvents: upcomingEvents.rows,
    completedEvents: completedEvents.rows,
    overdueTasks: overdueTasks.rows,
    unreadInbox: unreadInbox.rows,
    pendingQuotes: pendingQuotes.rows,
    openInquiries: openInquiries.rows,
    memories: memories.rows,
    auditEntries: auditEntries.rows,
    policyRows: policyRows.rows,
    searchRows: searchRows.rows,
    dataAvailability: [
      upcomingEvents,
      completedEvents,
      overdueTasks,
      unreadInbox,
      pendingQuotes,
      openInquiries,
      memories,
      auditEntries,
      policyRows,
      searchRows,
    ].map(({ source, available, note }) => ({ source, available, note })),
  }

  return buildRemyOperatingHub(raw)
}

export async function addRemyDecisionMemoryAction(formData: FormData): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const content = String(formData.get('content') ?? '').trim()
  const category = normalizeCategory(String(formData.get('category') ?? 'business_rule'))
  const importance = clampImportance(Number(formData.get('importance') ?? 6))

  if (!content) return

  const db: any = createServerClient()
  const { error } = await db.from('remy_memories').insert({
    tenant_id: tenantId,
    category,
    content,
    importance,
    content_hash: hashContent(content),
    source_message: 'Manually added from Remy operating hub',
  })

  if (error) throw new Error(`Failed to add Remy memory: ${error.message}`)
  revalidatePath('/remy/operating')
}

export async function updateRemyDecisionMemoryAction(formData: FormData): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const memoryId = String(formData.get('memoryId') ?? '').trim()
  const content = String(formData.get('content') ?? '').trim()
  const category = normalizeCategory(String(formData.get('category') ?? 'business_rule'))
  const importance = clampImportance(Number(formData.get('importance') ?? 6))

  if (!memoryId || !content) return

  const db: any = createServerClient()
  const { error } = await db
    .from('remy_memories')
    .update({
      category,
      content,
      importance,
      content_hash: hashContent(content),
      source_message: 'Edited from Remy operating hub',
      updated_at: new Date().toISOString(),
    })
    .eq('id', memoryId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to update Remy memory: ${error.message}`)
  revalidatePath('/remy/operating')
}

export async function archiveRemyDecisionMemoryAction(formData: FormData): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const memoryId = String(formData.get('memoryId') ?? '').trim()

  if (!memoryId) return

  const db: any = createServerClient()
  const { error } = await db
    .from('remy_memories')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', memoryId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to archive Remy memory: ${error.message}`)
  revalidatePath('/remy/operating')
}

async function runBusinessSearch(
  db: any,
  tenantId: string,
  searchQuery: string
): Promise<SafeRows> {
  const pattern = `%${escapeLikePattern(searchQuery)}%`
  const [clients, events, inquiries, quotes, remy] = await Promise.all([
    safeRows(
      'search_clients',
      db
        .from('clients')
        .select('id, full_name, email, updated_at, created_at')
        .eq('tenant_id', tenantId)
        .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
        .limit(6)
    ),
    safeRows(
      'search_events',
      db
        .from('events')
        .select('id, title, occasion, status, event_date, updated_at, created_at')
        .eq('tenant_id', tenantId)
        .or(`title.ilike.${pattern},occasion.ilike.${pattern},status.ilike.${pattern}`)
        .limit(6)
    ),
    safeRows(
      'search_inquiries',
      db
        .from('inquiries')
        .select('id, confirmed_occasion, channel, status, updated_at, created_at')
        .eq('tenant_id', tenantId)
        .or(`confirmed_occasion.ilike.${pattern},channel.ilike.${pattern},status.ilike.${pattern}`)
        .limit(6)
    ),
    safeRows(
      'search_quotes',
      db
        .from('quotes')
        .select('id, quote_name, status, updated_at, created_at')
        .eq('tenant_id', tenantId)
        .or(`quote_name.ilike.${pattern},status.ilike.${pattern}`)
        .limit(6)
    ),
    safeRows(
      'search_remy_messages',
      db
        .from('remy_messages')
        .select('id, content, created_at')
        .eq('tenant_id', tenantId)
        .ilike('content', pattern)
        .limit(6)
    ),
  ])

  return {
    source: 'search',
    available: [clients, events, inquiries, quotes, remy].some((result) => result.available),
    note: 'Tenant-scoped search across supported business records.',
    rows: [
      ...clients.rows.map((row) => ({
        ...row,
        domain: 'clients',
        title: row.full_name,
        excerpt: row.email,
      })),
      ...events.rows.map((row) => ({
        ...row,
        domain: 'events',
        title: row.title || row.occasion,
        excerpt: row.status,
      })),
      ...inquiries.rows.map((row) => ({
        ...row,
        domain: 'inquiries',
        title: row.confirmed_occasion || row.channel,
        excerpt: row.status,
      })),
      ...quotes.rows.map((row) => ({
        ...row,
        domain: 'quotes',
        title: row.quote_name,
        excerpt: row.status,
      })),
      ...remy.rows.map((row) => ({
        ...row,
        domain: 'remy',
        title: 'Remy conversation',
        excerpt: String(row.content ?? '').slice(0, 180),
      })),
    ],
  }
}

async function safeRows(
  source: string,
  query: PromiseLike<{ data?: unknown; error?: unknown }>
): Promise<SafeRows> {
  try {
    const result = await query
    const error = result.error as { message?: string } | null | undefined
    if (error) {
      return {
        source,
        rows: [],
        available: false,
        note: error.message ?? 'Source query failed.',
      }
    }
    return {
      source,
      rows: Array.isArray(result.data) ? (result.data as Array<Record<string, unknown>>) : [],
      available: true,
      note: 'Loaded from tenant-scoped data.',
    }
  } catch (err) {
    return {
      source,
      rows: [],
      available: false,
      note: err instanceof Error ? err.message : 'Source query failed.',
    }
  }
}

function emptyRows(source: string): SafeRows {
  return { source, rows: [], available: true, note: 'No query submitted.' }
}

function normalizeCategory(value: string): MemoryCategory {
  return MEMORY_CATEGORIES.includes(value as MemoryCategory)
    ? (value as MemoryCategory)
    : 'business_rule'
}

function clampImportance(value: number): number {
  if (!Number.isFinite(value)) return 6
  return Math.min(10, Math.max(1, Math.round(value)))
}

function hashContent(content: string): string {
  const normalized = content.toLowerCase().trim().replace(/\s+/g, ' ')
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32)
}
