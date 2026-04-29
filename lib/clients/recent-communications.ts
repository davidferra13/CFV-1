import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type RecentCommunicationItem = {
  id: string
  clientId: string
  clientName: string
  kind: 'message' | 'note' | 'follow_up'
  occurredAt: string
  summary: string
  detail: string | null
  href: string
  badge: string
}

function coalesceDate(primary: string | null | undefined, fallback: string): string {
  return primary || fallback
}

function snippet(value: string | null | undefined, fallback: string): string {
  const normalized = (value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return fallback
  return normalized.length > 96 ? `${normalized.slice(0, 93)}...` : normalized
}

function humanize(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export async function getRecentClientCommunications(
  limit = 12
): Promise<RecentCommunicationItem[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const [messagesResult, notesResult, followUpsResult] = await Promise.all([
    db
      .from('messages')
      .select('id, client_id, created_at, sent_at, channel, direction, subject, body, status')
      .eq('tenant_id', tenantId)
      .not('client_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(40),
    db
      .from('client_notes')
      .select('id, client_id, created_at, note_text, category, pinned')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(40),
    db
      .from('follow_up_sends')
      .select('id, client_id, event_id, created_at, scheduled_for, sent_at, status, subject')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(40),
  ])

  if (messagesResult.error) {
    throw new Error(`Failed to load recent messages: ${messagesResult.error.message}`)
  }
  if (notesResult.error) {
    throw new Error(`Failed to load recent notes: ${notesResult.error.message}`)
  }
  if (followUpsResult.error) {
    throw new Error(`Failed to load recent follow-ups: ${followUpsResult.error.message}`)
  }

  const clientIds = new Set<string>()
  for (const row of messagesResult.data ?? []) if (row.client_id) clientIds.add(row.client_id)
  for (const row of notesResult.data ?? []) if (row.client_id) clientIds.add(row.client_id)
  for (const row of followUpsResult.data ?? []) if (row.client_id) clientIds.add(row.client_id)

  const clientNames = new Map<string, string>()
  if (clientIds.size > 0) {
    const { data, error } = await db
      .from('clients')
      .select('id, full_name')
      .eq('tenant_id', tenantId)
      .is('deleted_at' as any, null)
      .in('id', Array.from(clientIds))

    if (error) throw new Error(`Failed to load communication clients: ${error.message}`)

    for (const client of data ?? []) {
      clientNames.set(client.id, client.full_name || 'Client')
    }
  }

  const items: RecentCommunicationItem[] = []

  for (const row of messagesResult.data ?? []) {
    if (!row.client_id || !clientNames.has(row.client_id)) continue
    const outbound = row.direction === 'outbound'
    items.push({
      id: `message:${row.id}`,
      clientId: row.client_id,
      clientName: clientNames.get(row.client_id)!,
      kind: 'message',
      occurredAt: coalesceDate(row.sent_at, row.created_at),
      summary: outbound ? 'You messaged client' : 'Client messaged',
      detail: snippet(row.subject || row.body, humanize(row.channel, 'Message')),
      href: `/clients/${row.client_id}`,
      badge: humanize(row.channel, 'Message'),
    })
  }

  for (const row of notesResult.data ?? []) {
    if (!row.client_id || !clientNames.has(row.client_id)) continue
    items.push({
      id: `note:${row.id}`,
      clientId: row.client_id,
      clientName: clientNames.get(row.client_id)!,
      kind: 'note',
      occurredAt: row.created_at,
      summary: row.pinned ? 'Pinned note recorded' : 'Note recorded',
      detail: snippet(row.note_text, humanize(row.category, 'Client note')),
      href: `/clients/${row.client_id}`,
      badge: humanize(row.category, 'Note'),
    })
  }

  for (const row of followUpsResult.data ?? []) {
    if (!row.client_id || !clientNames.has(row.client_id)) continue
    items.push({
      id: `follow_up:${row.id}`,
      clientId: row.client_id,
      clientName: clientNames.get(row.client_id)!,
      kind: 'follow_up',
      occurredAt: coalesceDate(row.sent_at, row.created_at),
      summary: `${humanize(row.status, 'Follow-up')} follow-up`,
      detail: snippet(row.subject, 'Client follow-up'),
      href: row.event_id ? `/events/${row.event_id}` : `/clients/${row.client_id}`,
      badge: 'Follow-up',
    })
  }

  return items
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, Math.max(1, limit))
}
