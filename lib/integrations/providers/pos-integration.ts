import type { IntegrationProvider } from '@/lib/integrations/core/types'

const POS_PROVIDERS: IntegrationProvider[] = [
  'square',
  'shopify_pos',
  'clover',
  'toast',
  'lightspeed',
]

export type PosConnectionInput = {
  provider: IntegrationProvider
  externalAccountId?: string | null
  externalAccountName?: string | null
  apiKey?: string | null
}

export function isPosProvider(provider: IntegrationProvider): boolean {
  return POS_PROVIDERS.includes(provider)
}

export function normalizePosConnectionInput(input: PosConnectionInput): {
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
      channel: 'pos',
      provider: input.provider,
      capturePayments: true,
      syncOrders: true,
    },
  }
}

export function normalizePosWebhookPayload(
  provider: IntegrationProvider,
  payload: Record<string, unknown>
): {
  sourceEventId: string
  sourceEventType: string
  canonicalEventType: 'order_created' | 'order_updated' | 'payment_captured' | 'unknown'
  normalizedPayload: Record<string, unknown>
} {
  const sourceEventType =
    (typeof payload.type === 'string' && payload.type) ||
    (typeof payload.event_type === 'string' && payload.event_type) ||
    'unknown'
  const sourceEventId =
    (typeof payload.id === 'string' && payload.id) ||
    (typeof payload.event_id === 'string' && payload.event_id) ||
    `${provider}-${Date.now()}`
  const normalized = sourceEventType.toLowerCase()

  const canonicalEventType = normalized.includes('payment')
    ? 'payment_captured'
    : normalized.includes('order') && normalized.includes('update')
      ? 'order_updated'
      : normalized.includes('order')
        ? 'order_created'
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
