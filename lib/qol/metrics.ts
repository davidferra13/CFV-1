export const QOL_METRIC_KEYS = [
  'draft_restored',
  'save_failed',
  'conflict_detected',
  'offline_replay_succeeded',
  'offline_replay_failed',
  'duplicate_create_prevented',
] as const

export type QolMetricKey = (typeof QOL_METRIC_KEYS)[number]

export type QolMetricEventInput = {
  tenantId: string
  actorId?: string | null
  metricKey: QolMetricKey
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown>
}

function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {}
  const entries = Object.entries(metadata).slice(0, 50)
  return Object.fromEntries(entries)
}

export function isQolMetricKey(value: unknown): value is QolMetricKey {
  return typeof value === 'string' && (QOL_METRIC_KEYS as readonly string[]).includes(value)
}

export async function recordQolMetricEvent(db: any, input: QolMetricEventInput): Promise<void> {
  try {
    await (db.from('qol_metric_events' as any) as any).insert({
      tenant_id: input.tenantId,
      actor_id: input.actorId ?? null,
      metric_key: input.metricKey,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      metadata: sanitizeMetadata(input.metadata),
    })
  } catch {
    // Metrics are best-effort and must never break user flows.
  }
}
