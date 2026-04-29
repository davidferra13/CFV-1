import { createServerClient } from '@/lib/db/server'
import type { ClientContinuityChangeDigest, ClientContinuityChangeItem } from './types'

type DbClient = any

type ContinuityChangeInput = {
  tenantId: string
  clientId: string
  authUserId: string
  limit?: number
  db?: DbClient
}

type ActivityRow = {
  created_at: string
}

type NotificationRow = {
  id: string
  category: string
  action: string
  title: string
  body: string | null
  action_url: string | null
  read_at: string | null
  created_at: string
}

const DEFAULT_CHANGE_LIMIT = 5
const UNREAD_LOOKBACK_DAYS = 14

function fallbackNotificationHref(row: Pick<NotificationRow, 'action_url'>): string {
  return row.action_url && row.action_url.startsWith('/') && !row.action_url.startsWith('//')
    ? row.action_url
    : '/notifications'
}

function normalizeNotification(row: NotificationRow): ClientContinuityChangeItem {
  return {
    id: `notification:${row.id}`,
    source: 'notification_change',
    kind: 'notification_change',
    label: row.title,
    detail: row.body || 'New client portal update.',
    href: fallbackNotificationHref(row),
    category: row.category,
    action: row.action,
    occurredAt: row.created_at,
    readAt: row.read_at,
  }
}

async function getLastDashboardVisit(input: ContinuityChangeInput): Promise<string | null> {
  const db = input.db ?? createServerClient({ admin: true })
  const { data, error } = await db
    .from('activity_events')
    .select('created_at')
    .eq('tenant_id', input.tenantId)
    .eq('client_id', input.clientId)
    .eq('actor_type', 'client')
    .eq('event_type', 'events_list_viewed')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error('Failed to fetch client dashboard activity checkpoint')
  }

  const rows = (data ?? []) as ActivityRow[]
  return rows[0]?.created_at ?? null
}

async function getNotificationsSince(input: {
  db: DbClient
  tenantId: string
  authUserId: string
  since: string
  limit: number
}): Promise<NotificationRow[]> {
  const { data, error } = await input.db
    .from('notifications')
    .select('id, category, action, title, body, action_url, read_at, created_at')
    .eq('tenant_id', input.tenantId)
    .eq('recipient_id', input.authUserId)
    .is('archived_at', null)
    .gt('created_at', input.since)
    .order('created_at', { ascending: false })
    .limit(input.limit)

  if (error) {
    throw new Error('Failed to fetch client continuity notification changes')
  }

  return (data ?? []) as NotificationRow[]
}

async function getRecentUnreadNotifications(input: {
  db: DbClient
  tenantId: string
  authUserId: string
  limit: number
}): Promise<NotificationRow[]> {
  const since = new Date(Date.now() - UNREAD_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await input.db
    .from('notifications')
    .select('id, category, action, title, body, action_url, read_at, created_at')
    .eq('tenant_id', input.tenantId)
    .eq('recipient_id', input.authUserId)
    .is('archived_at', null)
    .is('read_at', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(input.limit)

  if (error) {
    throw new Error('Failed to fetch recent unread client continuity notifications')
  }

  return (data ?? []) as NotificationRow[]
}

export async function getClientContinuityChangeDigest(
  input: ContinuityChangeInput
): Promise<ClientContinuityChangeDigest> {
  const db = input.db ?? createServerClient({ admin: true })
  const limit = Math.max(1, Math.min(10, input.limit ?? DEFAULT_CHANGE_LIMIT))

  if (!input.authUserId) {
    return {
      since: null,
      basis: 'none',
      label: 'No client notification recipient is linked yet.',
      items: [],
      unreadCount: 0,
    }
  }

  const lastDashboardVisit = await getLastDashboardVisit({ ...input, db })

  if (lastDashboardVisit) {
    const notifications = await getNotificationsSince({
      db,
      tenantId: input.tenantId,
      authUserId: input.authUserId,
      since: lastDashboardVisit,
      limit,
    })

    return {
      since: lastDashboardVisit,
      basis: 'last_dashboard_visit',
      label:
        notifications.length > 0
          ? `${notifications.length} update${notifications.length === 1 ? '' : 's'} since your last dashboard visit.`
          : 'No new client portal updates since your last dashboard visit.',
      items: notifications.map(normalizeNotification),
      unreadCount: notifications.filter((notification) => !notification.read_at).length,
    }
  }

  const unreadNotifications = await getRecentUnreadNotifications({
    db,
    tenantId: input.tenantId,
    authUserId: input.authUserId,
    limit,
  })

  return {
    since: null,
    basis: unreadNotifications.length > 0 ? 'unread_recent' : 'none',
    label:
      unreadNotifications.length > 0
        ? `${unreadNotifications.length} unread update${unreadNotifications.length === 1 ? '' : 's'} from the last ${UNREAD_LOOKBACK_DAYS} days.`
        : 'No previous dashboard visit or unread recent update is recorded.',
    items: unreadNotifications.map(normalizeNotification),
    unreadCount: unreadNotifications.length,
  }
}
