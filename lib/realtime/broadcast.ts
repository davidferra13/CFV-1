import { broadcast } from './sse-server'
import { emitRuntimeEvent } from '@/lib/runtime-transparency/events'

type LiveMutationPayload = {
  entity: string
  entityId?: string | null
  action: 'insert' | 'update' | 'delete' | 'mutation'
  reason?: string
  source?: string
  patch?: Record<string, unknown>
}

function recordId(record: any): string | null {
  return typeof record?.id === 'string' ? record.id : null
}

function withMutationEnvelope(payload: LiveMutationPayload) {
  return {
    ...payload,
    occurredAt: new Date().toISOString(),
  }
}

export function broadcastTenantMutation(tenantId: string, payload: LiveMutationPayload) {
  if (!tenantId) return
  emitRuntimeEvent({
    type: 'state:update',
    source: 'realtime.broadcastTenantMutation',
    scope: {
      tenant: tenantId,
      workflow: `${payload.entity}:${payload.action}`,
    },
    payload,
  })
  broadcast(`tenant:${tenantId}`, 'live_mutation', withMutationEnvelope(payload))
}

export function broadcastUserMutation(userId: string, payload: LiveMutationPayload) {
  if (!userId) return
  emitRuntimeEvent({
    type: 'state:update',
    source: 'realtime.broadcastUserMutation',
    scope: {
      user: userId,
      workflow: `${payload.entity}:${payload.action}`,
    },
    payload,
  })
  broadcast(`user:${userId}`, 'live_mutation', withMutationEnvelope(payload))
}

// Broadcast after a DB mutation - call from server actions
export function broadcastInsert(table: string, tenantId: string, record: any) {
  const patch = { new: record }
  broadcast(`${table}:${tenantId}`, 'INSERT', patch)

  const payload = {
    entity: table,
    entityId: recordId(record),
    action: 'insert' as const,
    reason: `${table} created`,
    source: 'mutation',
    patch,
  }

  if (table === 'notifications') {
    broadcastUserMutation(tenantId, payload)
  } else {
    broadcastTenantMutation(tenantId, payload)
  }
}

export function broadcastUpdate(table: string, tenantId: string, record: any, old?: any) {
  const patch = { new: record, old }
  broadcast(`${table}:${tenantId}`, 'UPDATE', patch)
  broadcastTenantMutation(tenantId, {
    entity: table,
    entityId: recordId(record),
    action: 'update',
    reason: `${table} updated`,
    source: 'mutation',
    patch,
  })
}

export function broadcastDelete(table: string, tenantId: string, record: any) {
  const patch = { old: record }
  broadcast(`${table}:${tenantId}`, 'DELETE', patch)
  broadcastTenantMutation(tenantId, {
    entity: table,
    entityId: recordId(record),
    action: 'delete',
    reason: `${table} removed`,
    source: 'mutation',
    patch,
  })
}

// Broadcast typing indicator
export function broadcastTyping(channel: string, userId: string, isTyping: boolean) {
  broadcast(`typing:${channel}`, 'typing', { userId, isTyping })
}

// Broadcast to a specific channel (generic)
export { broadcast } from './sse-server'
