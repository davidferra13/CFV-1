'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type TimelineEntityType = 'event' | 'inquiry' | 'quote' | 'menu' | 'client'

export type EntityFieldDiff = {
  field: string
  before: string
  after: string
}

export type EntityTimelineEntry = {
  id: string
  source: 'transition' | 'mutation'
  timestamp: string
  summary: string
  actorType: 'system' | 'user'
  actorLabel: string
  metadata?: Record<string, unknown>
  fieldDiffs: EntityFieldDiff[]
}

const TRANSITION_CONFIG: Partial<
  Record<TimelineEntityType, { table: string; foreignKey: string }>
> = {
  event: { table: 'event_state_transitions', foreignKey: 'event_id' },
  inquiry: { table: 'inquiry_state_transitions', foreignKey: 'inquiry_id' },
  quote: { table: 'quote_state_transitions', foreignKey: 'quote_id' },
  menu: { table: 'menu_state_transitions', foreignKey: 'menu_id' },
}

function toReadable(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value || '—'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map((entry) => toReadable(entry)).join(', ')
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function toLabel(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function parseFieldDiffs(context: Record<string, unknown>): EntityFieldDiff[] {
  const parsed: EntityFieldDiff[] = []
  const rawDiffs = context.field_diffs

  if (rawDiffs && typeof rawDiffs === 'object' && !Array.isArray(rawDiffs)) {
    for (const [field, raw] of Object.entries(rawDiffs as Record<string, unknown>)) {
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const pair = raw as Record<string, unknown>
        parsed.push({
          field: toLabel(field),
          before: toReadable(pair.before),
          after: toReadable(pair.after),
        })
        continue
      }

      parsed.push({
        field: toLabel(field),
        before: '—',
        after: toReadable(raw),
      })
    }
  }

  if (parsed.length > 0) return parsed.slice(0, 30)

  const changed = context.changed_fields
  if (Array.isArray(changed)) {
    for (const field of changed) {
      if (typeof field !== 'string') continue
      parsed.push({
        field: toLabel(field),
        before: '—',
        after: 'Updated',
      })
    }
  }

  return parsed.slice(0, 30)
}

export async function getEntityActivityTimeline(
  entityType: TimelineEntityType,
  entityId: string
): Promise<EntityTimelineEntry[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const transitionConfig = TRANSITION_CONFIG[entityType]
  const transitionsPromise = transitionConfig
    ? (supabase
        .from(transitionConfig.table as any)
        .select('id, from_status, to_status, transitioned_at, transitioned_by, metadata')
        .eq(transitionConfig.foreignKey, entityId)
        .order('transitioned_at', { ascending: false }) as any)
    : Promise.resolve({ data: [] })

  const mutationPromise = supabase
    .from('chef_activity_log')
    .select('id, summary, action, context, created_at, actor_id')
    .eq('tenant_id', user.tenantId!)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(100)

  const [transitionsResult, mutationsResult] = await Promise.all([
    transitionsPromise,
    mutationPromise,
  ])

  const entries: EntityTimelineEntry[] = []

  for (const row of (transitionsResult as any).data ?? []) {
    const fromStatus = row.from_status ? String(row.from_status).replace(/_/g, ' ') : 'created'
    const toStatus = String(row.to_status ?? '').replace(/_/g, ' ')
    const summary = row.from_status
      ? `Status changed: ${fromStatus} → ${toStatus}`
      : `Status initialized: ${toStatus}`

    const actorType: 'system' | 'user' = row.transitioned_by ? 'user' : 'system'
    const actorLabel = row.transitioned_by
      ? row.transitioned_by === user.id
        ? 'You'
        : 'Teammate'
      : 'System'

    entries.push({
      id: `transition-${row.id}`,
      source: 'transition',
      timestamp: row.transitioned_at,
      summary,
      actorType,
      actorLabel,
      metadata:
        row.metadata && typeof row.metadata === 'object'
          ? (row.metadata as Record<string, unknown>)
          : undefined,
      fieldDiffs: [],
    })
  }

  for (const row of mutationsResult.data ?? []) {
    const context =
      row.context && typeof row.context === 'object' && !Array.isArray(row.context)
        ? (row.context as Record<string, unknown>)
        : {}

    entries.push({
      id: `mutation-${row.id}`,
      source: 'mutation',
      timestamp: row.created_at,
      summary: row.summary,
      actorType: row.actor_id ? 'user' : 'system',
      actorLabel: row.actor_id ? (row.actor_id === user.id ? 'You' : 'Teammate') : 'System',
      metadata: context,
      fieldDiffs: parseFieldDiffs(context),
    })
  }

  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return entries.slice(0, 150)
}
