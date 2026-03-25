'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { INTEGRATION_PROVIDER_META } from './providers'
import type {
  IntegrationConnectionSummary,
  IntegrationEventSummary,
  IntegrationProvider,
} from './types'

function toProvider(value: string): IntegrationProvider {
  return value as IntegrationProvider
}

function isMissingRelationError(error: any): boolean {
  return error?.code === '42P01'
}

export async function getIntegrationConnections(): Promise<IntegrationConnectionSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('integration_connections')
    .select(
      'id, provider, status, auth_type, external_account_name, external_account_id, last_sync_at, error_count, last_error, connected_at'
    )
    .eq('tenant_id', user.tenantId)
    .order('connected_at', { ascending: false })

  if (error) {
    if (isMissingRelationError(error)) return []
    console.error('[getIntegrationConnections] Error:', error)
    throw new Error('Failed to load integration connections')
  }

  return ((data || []) as any[]).map((row) => ({
    id: row.id,
    provider: toProvider(row.provider),
    status: row.status,
    authType: row.auth_type,
    externalAccountName: row.external_account_name,
    externalAccountId: row.external_account_id,
    lastSyncAt: row.last_sync_at,
    errorCount: row.error_count ?? 0,
    lastError: row.last_error,
    connectedAt: row.connected_at,
  }))
}

export async function getRecentIntegrationEvents(limit = 25): Promise<IntegrationEventSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('integration_events')
    .select(
      'id, provider, source_event_type, canonical_event_type, status, received_at, processed_at, error'
    )
    .eq('tenant_id', user.tenantId)
    .order('received_at', { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)))

  if (error) {
    if (isMissingRelationError(error)) return []
    console.error('[getRecentIntegrationEvents] Error:', error)
    throw new Error('Failed to load integration events')
  }

  return ((data || []) as any[]).map((row) => ({
    id: row.id,
    provider: toProvider(row.provider),
    sourceEventType: row.source_event_type,
    canonicalEventType: row.canonical_event_type,
    status: row.status,
    receivedAt: row.received_at,
    processedAt: row.processed_at,
    error: row.error,
  }))
}

export async function getIntegrationProviderOverview() {
  const [connections, events] = await Promise.all([
    getIntegrationConnections(),
    getRecentIntegrationEvents(50),
  ])

  const connected = new Set(
    connections.filter((c) => c.status === 'connected').map((c) => c.provider)
  )

  return INTEGRATION_PROVIDER_META.map((meta) => {
    const providerConnections = connections.filter((c) => c.provider === meta.provider)
    const providerEvents = events.filter((e) => e.provider === meta.provider)
    const lastEvent = providerEvents[0] ?? null

    return {
      ...meta,
      isConnected: connected.has(meta.provider),
      connectionCount: providerConnections.length,
      errorCount: providerConnections.reduce((sum, conn) => sum + (conn.errorCount || 0), 0),
      lastSyncAt:
        providerConnections
          .map((conn) => conn.lastSyncAt)
          .filter(Boolean)
          .sort()
          .reverse()[0] ?? null,
      lastEventStatus: lastEvent?.status ?? null,
      lastEventAt: lastEvent?.receivedAt ?? null,
    }
  })
}
