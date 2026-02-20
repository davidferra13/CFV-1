import type { IntegrationProvider } from './types'

export type IntegrationCategory = 'website' | 'pos' | 'scheduling' | 'crm' | 'custom'

export type IntegrationProviderMeta = {
  provider: IntegrationProvider
  label: string
  category: IntegrationCategory
  supportsWebhook: boolean
  supportsPull: boolean
  supportsOAuth: boolean
}

export const INTEGRATION_PROVIDER_META: IntegrationProviderMeta[] = [
  {
    provider: 'wix',
    label: 'Wix',
    category: 'website',
    supportsWebhook: true,
    supportsPull: false,
    supportsOAuth: false,
  },
  {
    provider: 'gmail',
    label: 'Gmail',
    category: 'website',
    supportsWebhook: false,
    supportsPull: true,
    supportsOAuth: true,
  },
  {
    provider: 'square',
    label: 'Square',
    category: 'pos',
    supportsWebhook: true,
    supportsPull: true,
    supportsOAuth: true,
  },
  {
    provider: 'shopify_pos',
    label: 'Shopify POS',
    category: 'pos',
    supportsWebhook: true,
    supportsPull: true,
    supportsOAuth: true,
  },
  {
    provider: 'clover',
    label: 'Clover',
    category: 'pos',
    supportsWebhook: true,
    supportsPull: true,
    supportsOAuth: true,
  },
  {
    provider: 'toast',
    label: 'Toast',
    category: 'pos',
    supportsWebhook: true,
    supportsPull: true,
    supportsOAuth: true,
  },
  {
    provider: 'lightspeed',
    label: 'Lightspeed',
    category: 'pos',
    supportsWebhook: true,
    supportsPull: true,
    supportsOAuth: true,
  },
  {
    provider: 'calendly',
    label: 'Calendly',
    category: 'scheduling',
    supportsWebhook: true,
    supportsPull: true,
    supportsOAuth: true,
  },
  {
    provider: 'google_calendar',
    label: 'Google Calendar',
    category: 'scheduling',
    supportsWebhook: true,
    supportsPull: true,
    supportsOAuth: true,
  },
  {
    provider: 'hubspot',
    label: 'HubSpot',
    category: 'crm',
    supportsWebhook: true,
    supportsPull: true,
    supportsOAuth: true,
  },
  {
    provider: 'salesforce',
    label: 'Salesforce',
    category: 'crm',
    supportsWebhook: true,
    supportsPull: true,
    supportsOAuth: true,
  },
  {
    provider: 'custom_webhook',
    label: 'Custom Webhook',
    category: 'custom',
    supportsWebhook: true,
    supportsPull: false,
    supportsOAuth: false,
  },
  {
    provider: 'csv_import',
    label: 'CSV Import',
    category: 'custom',
    supportsWebhook: false,
    supportsPull: false,
    supportsOAuth: false,
  },
]

export function getProviderMeta(provider: string): IntegrationProviderMeta | null {
  return INTEGRATION_PROVIDER_META.find((item) => item.provider === provider) ?? null
}
