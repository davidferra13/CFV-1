import { pgClient } from '@/lib/db'

type CalendarSnapshotItem = {
  id: string
  type: string
  category: string
  title: string
  startDate: string
  endDate: string
  startTime?: string
  status?: string
  url?: string
  isBlocking: boolean
}

export type ContextSnapshotSource =
  | 'calendar_page'
  | 'integration_callback'
  | 'scheduled_messages_cron'

export type ContextSnapshotKind =
  | 'calendar_context'
  | 'integration_connection'
  | 'scheduled_message'

export type ContextSnapshotRecord = {
  id: number
  tenant_id: string
  entity_type: ContextSnapshotKind
  entity_id: string
  snapshot: Record<string, unknown>
  operation_log_id: number | null
  created_at: string
}

type RecordSnapshotInput = {
  tenantId: string
  entityType: ContextSnapshotKind
  entityId: string
  source: ContextSnapshotSource
  summary: string
  payload: Record<string, unknown>
  minIntervalMinutes?: number
}

export async function recordContextSnapshotDirect({
  tenantId,
  entityType,
  entityId,
  source,
  summary,
  payload,
  minIntervalMinutes = 15,
}: RecordSnapshotInput): Promise<number | null> {
  try {
    if (!tenantId || !entityId || !summary.trim()) return null

    if (minIntervalMinutes > 0) {
      const threshold = new Date(Date.now() - minIntervalMinutes * 60_000).toISOString()
      const [existing] = await pgClient`
        SELECT id
        FROM entity_snapshots
        WHERE tenant_id = ${tenantId}
          AND entity_type = ${entityType}
          AND entity_id = ${entityId}
          AND snapshot->>'source' = ${source}
          AND created_at >= ${threshold}
        ORDER BY created_at DESC
        LIMIT 1
      `

      if (existing?.id) return Number(existing.id)
    }

    const snapshot = {
      context_snapshot_kind: entityType,
      source,
      summary,
      payload,
      captured_at: new Date().toISOString(),
    }

    const [row] = await pgClient`
      INSERT INTO entity_snapshots (tenant_id, entity_type, entity_id, snapshot)
      VALUES (${tenantId}, ${entityType}, ${entityId}, ${JSON.stringify(snapshot)}::jsonb)
      RETURNING id
    `

    return row?.id ? Number(row.id) : null
  } catch (err) {
    console.error('[non-blocking] Context snapshot write failed:', err)
    return null
  }
}

export async function captureCalendarContextSnapshot(input: {
  tenantId: string
  rangeStart: string
  rangeEnd: string
  items: CalendarSnapshotItem[]
}): Promise<number | null> {
  const countsByType = input.items.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1
    return acc
  }, {})

  const blockingCount = input.items.filter((item) => item.isBlocking).length
  const leadCount = input.items.filter((item) => item.category === 'leads').length

  return recordContextSnapshotDirect({
    tenantId: input.tenantId,
    entityType: 'calendar_context',
    entityId: input.tenantId,
    source: 'calendar_page',
    summary: `Calendar context for ${input.rangeStart} through ${input.rangeEnd}`,
    payload: {
      range_start: input.rangeStart,
      range_end: input.rangeEnd,
      total_items: input.items.length,
      blocking_count: blockingCount,
      lead_count: leadCount,
      counts_by_type: countsByType,
      upcoming_items: input.items.slice(0, 20).map((item) => ({
        id: item.id,
        type: item.type,
        category: item.category,
        title: item.title,
        start_date: item.startDate,
        end_date: item.endDate,
        start_time: item.startTime ?? null,
        status: item.status ?? null,
        url: item.url ?? null,
        is_blocking: item.isBlocking,
      })),
    },
  })
}

export async function captureIntegrationCallbackSnapshot(input: {
  tenantId: string
  provider: string
  status: 'received' | 'error'
  hasCode: boolean
  errorParam?: string | null
}): Promise<number | null> {
  return recordContextSnapshotDirect({
    tenantId: input.tenantId,
    entityType: 'integration_connection',
    entityId: input.tenantId,
    source: 'integration_callback',
    summary: `${input.provider} OAuth callback ${input.status}`,
    payload: {
      provider: input.provider,
      status: input.status,
      has_code: input.hasCode,
      error_param: input.errorParam ?? null,
    },
    minIntervalMinutes: 0,
  })
}

export async function captureScheduledMessageSnapshot(input: {
  tenantId: string
  messageId: string
  stage: 'due' | 'sent' | 'failed' | 'pending_channel'
  channel: string
  scheduledFor: string
  contextType?: string | null
  contextId?: string | null
  recipientId?: string | null
  errorMessage?: string | null
}): Promise<number | null> {
  return recordContextSnapshotDirect({
    tenantId: input.tenantId,
    entityType: 'scheduled_message',
    entityId: input.messageId,
    source: 'scheduled_messages_cron',
    summary: `Scheduled message ${input.stage}`,
    payload: {
      message_id: input.messageId,
      stage: input.stage,
      channel: input.channel,
      scheduled_for: input.scheduledFor,
      context_type: input.contextType ?? null,
      context_id: input.contextId ?? null,
      recipient_id: input.recipientId ?? null,
      error_message: input.errorMessage ?? null,
    },
    minIntervalMinutes: 0,
  })
}

export async function listContextSnapshots(input: {
  tenantId: string
  source?: ContextSnapshotSource | 'all'
  limit?: number
}): Promise<ContextSnapshotRecord[]> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100)
  const source = input.source && input.source !== 'all' ? input.source : null

  if (source) {
    const rows = await pgClient`
      SELECT id, tenant_id, entity_type, entity_id, snapshot, operation_log_id, created_at
      FROM entity_snapshots
      WHERE tenant_id = ${input.tenantId}
        AND entity_type IN ('calendar_context', 'integration_connection', 'scheduled_message')
        AND snapshot->>'source' = ${source}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return rows as unknown as ContextSnapshotRecord[]
  }

  const rows = await pgClient`
    SELECT id, tenant_id, entity_type, entity_id, snapshot, operation_log_id, created_at
    FROM entity_snapshots
    WHERE tenant_id = ${input.tenantId}
      AND entity_type IN ('calendar_context', 'integration_connection', 'scheduled_message')
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return rows as unknown as ContextSnapshotRecord[]
}

export async function getContextSnapshotById(
  tenantId: string,
  snapshotId: number
): Promise<ContextSnapshotRecord | null> {
  const [row] = await pgClient`
    SELECT id, tenant_id, entity_type, entity_id, snapshot, operation_log_id, created_at
    FROM entity_snapshots
    WHERE tenant_id = ${tenantId}
      AND id = ${snapshotId}
      AND entity_type IN ('calendar_context', 'integration_connection', 'scheduled_message')
    LIMIT 1
  `

  return (row as unknown as ContextSnapshotRecord | undefined) ?? null
}
