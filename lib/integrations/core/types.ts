// Integration core shared types.
// Provider adapters should normalize source events into this shape.

export const INTEGRATION_PROVIDERS = [
  'square',
  'shopify_pos',
  'clover',
  'toast',
  'lightspeed',
  'calendly',
  'google_calendar',
  'hubspot',
  'salesforce',
  'wix',
  'gmail',
  'custom_webhook',
  'csv_import',
  'quickbooks',
  'docusign',
  'zapier',
  'yelp',
] as const

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number]

export type IntegrationSyncStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'duplicate'

export type CanonicalEventType =
  | 'lead_created'
  | 'lead_updated'
  | 'appointment_booked'
  | 'appointment_canceled'
  | 'order_created'
  | 'order_updated'
  | 'payment_captured'
  | 'payment_refunded'
  | 'message_received'
  | 'unknown'

export type NormalizedIntegrationEvent = {
  provider: IntegrationProvider
  sourceEventId: string
  sourceEventType: string
  canonicalEventType: CanonicalEventType
  occurredAt: string | null
  externalEntityType?: string | null
  externalEntityId?: string | null
  normalizedPayload: Record<string, unknown>
}

export type ProviderAdapter = {
  provider: IntegrationProvider
  normalizeWebhook: (payload: Record<string, unknown>) => Promise<NormalizedIntegrationEvent>
  pullSince?: (
    connectionId: string,
    cursor?: string | null
  ) => Promise<NormalizedIntegrationEvent[]>
}

export type IntegrationConnectionSummary = {
  id: string
  provider: IntegrationProvider
  status: 'connected' | 'disconnected' | 'error' | 'reauth_required'
  authType: 'oauth2' | 'api_key' | 'pat' | 'none'
  externalAccountName: string | null
  externalAccountId: string | null
  lastSyncAt: string | null
  errorCount: number
  lastError: string | null
  connectedAt: string
}

export type IntegrationEventSummary = {
  id: string
  provider: IntegrationProvider
  sourceEventType: string
  canonicalEventType: string | null
  status: IntegrationSyncStatus
  receivedAt: string
  processedAt: string | null
  error: string | null
}
