import type { IntegrationProvider } from '@/lib/integrations/core/types'

const CRM_PROVIDERS: IntegrationProvider[] = ['hubspot', 'salesforce']

export type CrmConnectionInput = {
  provider: IntegrationProvider
  externalAccountId?: string | null
  externalAccountName?: string | null
  apiKey?: string | null
}

export function isCrmProvider(provider: IntegrationProvider): boolean {
  return CRM_PROVIDERS.includes(provider)
}

export function normalizeCrmConnectionInput(input: CrmConnectionInput): {
  authType: 'oauth2' | 'api_key'
  externalAccountId: string | null
  externalAccountName: string | null
  apiKey: string | null
  settings: Record<string, unknown>
} {
  return {
    authType: input.apiKey ? 'api_key' : 'oauth2',
    externalAccountId: input.externalAccountId?.trim() || null,
    externalAccountName: input.externalAccountName?.trim() || null,
    apiKey: input.apiKey?.trim() || null,
    settings: {
      channel: 'crm',
      provider: input.provider,
      syncLeads: true,
      syncContacts: true,
    },
  }
}

export function normalizeCrmWebhookPayload(
  provider: IntegrationProvider,
  payload: Record<string, unknown>
): {
  sourceEventId: string
  sourceEventType: string
  canonicalEventType: 'lead_created' | 'lead_updated' | 'message_received' | 'unknown'
  normalizedPayload: Record<string, unknown>
} {
  const sourceEventType =
    (typeof payload.type === 'string' && payload.type) ||
    (typeof payload.event_type === 'string' && payload.event_type) ||
    'unknown'
  const sourceEventId =
    (typeof payload.id === 'string' && payload.id) ||
    (typeof payload.object_id === 'string' && payload.object_id) ||
    `${provider}-${Date.now()}`

  const normalized = sourceEventType.toLowerCase()
  const canonicalEventType = normalized.includes('message')
    ? 'message_received'
    : normalized.includes('update')
      ? 'lead_updated'
      : normalized.includes('lead') || normalized.includes('contact')
        ? 'lead_created'
        : 'unknown'

  return {
    sourceEventId,
    sourceEventType,
    canonicalEventType,
    normalizedPayload: {
      provider,
      eventType: sourceEventType,
      keys: Object.keys(payload),
      payload,
    },
  }
}
