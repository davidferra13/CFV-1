'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  SettingCategory,
  SettingDefinition,
  SettingValue,
  SettingsSection,
  SettingsExport,
} from './settings-registry-types'

// ---------------------------------------------------------------------------
// Registry: all setting definitions grouped by category
// ---------------------------------------------------------------------------

const SETTINGS_REGISTRY: SettingDefinition[] = [
  // Profile (6)
  {
    key: 'profile.display_name',
    label: 'Display Name',
    description: 'Name shown to clients and on public pages',
    category: 'profile',
    type: 'text',
    defaultValue: '',
    requiresRestart: false,
    proOnly: false,
  },
  {
    key: 'profile.bio',
    label: 'Bio',
    description: 'Short biography for your profile',
    category: 'profile',
    type: 'textarea',
    defaultValue: '',
    requiresRestart: false,
    proOnly: false,
  },
  {
    key: 'profile.phone',
    label: 'Phone Number',
    description: 'Contact phone number',
    category: 'profile',
    type: 'text',
    defaultValue: '',
    requiresRestart: false,
    proOnly: false,
  },
  {
    key: 'profile.timezone',
    label: 'Timezone',
    description: 'Your local timezone for scheduling',
    category: 'profile',
    type: 'select',
    defaultValue: 'America/New_York',
    options: [
      { label: 'Eastern', value: 'America/New_York' },
      { label: 'Central', value: 'America/Chicago' },
      { label: 'Mountain', value: 'America/Denver' },
      { label: 'Pacific', value: 'America/Los_Angeles' },
    ],
    requiresRestart: false,
    proOnly: false,
  },
  {
    key: 'profile.website_url',
    label: 'Website URL',
    description: 'Link to your external website',
    category: 'profile',
    type: 'text',
    defaultValue: '',
    requiresRestart: false,
    proOnly: false,
  },
  {
    key: 'profile.tagline',
    label: 'Tagline',
    description: 'Short tagline for your profile',
    category: 'profile',
    type: 'text',
    defaultValue: '',
    requiresRestart: false,
    proOnly: false,
  },

  // Branding (4)
  {
    key: 'branding.primary_color',
    label: 'Primary Color',
    description: 'Main brand color used on your portal',
    category: 'branding',
    type: 'color',
    defaultValue: '#2563eb',
    requiresRestart: false,
    proOnly: false,
  },
  {
    key: 'branding.logo_url',
    label: 'Logo URL',
    description: 'URL to your logo image',
    category: 'branding',
    type: 'text',
    defaultValue: '',
    requiresRestart: false,
    proOnly: false,
  },
  {
    key: 'branding.portal_headline',
    label: 'Portal Headline',
    description: 'Headline displayed on your client portal',
    category: 'branding',
    type: 'text',
    defaultValue: '',
    requiresRestart: false,
    proOnly: true,
  },
  {
    key: 'branding.email_footer',
    label: 'Email Footer',
    description: 'Custom footer appended to client emails',
    category: 'branding',
    type: 'textarea',
    defaultValue: '',
    requiresRestart: false,
    proOnly: true,
  },

  // Notifications (3)
  {
    key: 'notifications.email_new_inquiry',
    label: 'New Inquiry Emails',
    description: 'Get emailed when a new inquiry comes in',
    category: 'notifications',
    type: 'toggle',
    defaultValue: true,
    requiresRestart: false,
    proOnly: false,
  },
  {
    key: 'notifications.email_payment_received',
    label: 'Payment Received Emails',
    description: 'Get emailed when a payment is received',
    category: 'notifications',
    type: 'toggle',
    defaultValue: true,
    requiresRestart: false,
    proOnly: false,
  },
  {
    key: 'notifications.email_event_reminder',
    label: 'Event Reminder Emails',
    description: 'Get emailed with upcoming event reminders',
    category: 'notifications',
    type: 'toggle',
    defaultValue: true,
    requiresRestart: false,
    proOnly: false,
  },

  // Billing (3)
  {
    key: 'billing.default_payment_terms',
    label: 'Default Payment Terms',
    description: 'Default payment terms for new invoices',
    category: 'billing',
    type: 'select',
    defaultValue: 'due_on_receipt',
    options: [
      { label: 'Due on Receipt', value: 'due_on_receipt' },
      { label: 'Net 15', value: 'net_15' },
      { label: 'Net 30', value: 'net_30' },
      { label: 'Net 60', value: 'net_60' },
    ],
    requiresRestart: false,
    proOnly: false,
  },
  {
    key: 'billing.gratuity_mode',
    label: 'Gratuity Mode',
    description: 'How gratuity is handled on invoices',
    category: 'billing',
    type: 'select',
    defaultValue: 'optional',
    options: [
      { label: 'Optional', value: 'optional' },
      { label: 'Suggested', value: 'suggested' },
      { label: 'Included', value: 'included' },
      { label: 'Hidden', value: 'hidden' },
    ],
    requiresRestart: false,
    proOnly: false,
  },
  {
    key: 'billing.cancellation_cutoff_days',
    label: 'Cancellation Cutoff (days)',
    description: 'Days before event when cancellation is no longer free',
    category: 'billing',
    type: 'number',
    defaultValue: 7,
    requiresRestart: false,
    proOnly: false,
  },

  // Integrations (2)
  {
    key: 'integrations.google_calendar_enabled',
    label: 'Google Calendar Sync',
    description: 'Sync events with Google Calendar',
    category: 'integrations',
    type: 'toggle',
    defaultValue: false,
    requiresRestart: false,
    proOnly: true,
  },
  {
    key: 'integrations.stripe_connected',
    label: 'Stripe Connected',
    description: 'Whether Stripe is connected for payments',
    category: 'integrations',
    type: 'toggle',
    defaultValue: false,
    requiresRestart: false,
    proOnly: false,
  },

  // Privacy (4)
  {
    key: 'privacy.profile_public',
    label: 'Public Profile',
    description: 'Allow your profile to appear in the directory',
    category: 'privacy',
    type: 'toggle',
    defaultValue: true,
    requiresRestart: false,
    proOnly: false,
  },
  {
    key: 'privacy.show_pricing',
    label: 'Show Pricing',
    description: 'Display pricing on your public profile',
    category: 'privacy',
    type: 'toggle',
    defaultValue: false,
    requiresRestart: false,
    proOnly: false,
  },
  {
    key: 'privacy.allow_direct_messages',
    label: 'Allow Direct Messages',
    description: 'Let potential clients message you directly',
    category: 'privacy',
    type: 'toggle',
    defaultValue: true,
    requiresRestart: false,
    proOnly: false,
  },
  {
    key: 'privacy.data_sharing_consent',
    label: 'Analytics Data Sharing',
    description: 'Share anonymized data to improve the platform',
    category: 'privacy',
    type: 'toggle',
    defaultValue: false,
    requiresRestart: false,
    proOnly: false,
  },

  // Advanced (3)
  {
    key: 'advanced.ai_suggestions_enabled',
    label: 'AI Suggestions',
    description: 'Enable AI-powered suggestions for menus and pricing',
    category: 'advanced',
    type: 'toggle',
    defaultValue: true,
    requiresRestart: false,
    proOnly: true,
  },
  {
    key: 'advanced.booking_auto_confirm',
    label: 'Auto-confirm Bookings',
    description: 'Automatically confirm bookings that meet your criteria',
    category: 'advanced',
    type: 'toggle',
    defaultValue: false,
    requiresRestart: false,
    proOnly: true,
  },
  {
    key: 'advanced.experimental_features',
    label: 'Experimental Features',
    description: 'Opt in to beta features before general release',
    category: 'advanced',
    type: 'toggle',
    defaultValue: false,
    requiresRestart: true,
    proOnly: false,
  },
]

const VALID_KEYS = new Set(SETTINGS_REGISTRY.map((s) => s.key))

const SECTION_META: Record<SettingCategory, { label: string; description: string; icon: string }> =
  {
    profile: {
      label: 'Profile',
      description: 'Your public identity and contact info',
      icon: 'User',
    },
    branding: {
      label: 'Branding',
      description: 'Colors, logo, and client-facing appearance',
      icon: 'Palette',
    },
    notifications: {
      label: 'Notifications',
      description: 'Email and alert preferences',
      icon: 'Bell',
    },
    billing: {
      label: 'Billing',
      description: 'Payment terms, gratuity, and cancellation policy',
      icon: 'CreditCard',
    },
    integrations: {
      label: 'Integrations',
      description: 'Third-party service connections',
      icon: 'Plug',
    },
    privacy: {
      label: 'Privacy',
      description: 'Visibility and data sharing controls',
      icon: 'Shield',
    },
    advanced: {
      label: 'Advanced',
      description: 'AI features, automation, and experiments',
      icon: 'Settings',
    },
  }

// ---------------------------------------------------------------------------
// 1. getSettingsRegistry
// ---------------------------------------------------------------------------

export async function getSettingsRegistry(): Promise<SettingsSection[]> {
  const categories: SettingCategory[] = [
    'profile',
    'branding',
    'notifications',
    'billing',
    'integrations',
    'privacy',
    'advanced',
  ]

  return categories.map((cat) => {
    const meta = SECTION_META[cat]
    const settings = SETTINGS_REGISTRY.filter((s) => s.category === cat)
    return {
      category: cat,
      label: meta.label,
      description: meta.description,
      icon: meta.icon,
      settings,
      completeness: 0,
    }
  })
}

// ---------------------------------------------------------------------------
// 2. getSettingValues
// ---------------------------------------------------------------------------

export async function getSettingValues(): Promise<SettingValue[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('setting_values')
    .select('id, tenant_id, key, value, updated_at')
    .eq('tenant_id', chef.tenantId)

  if (error) throw new Error(`Failed to load settings: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    key: row.key,
    value: row.value,
    updatedAt: row.updated_at,
  }))
}

// ---------------------------------------------------------------------------
// 3. updateSetting
// ---------------------------------------------------------------------------

export async function updateSetting(key: string, value: unknown): Promise<{ success: boolean }> {
  if (!VALID_KEYS.has(key)) {
    throw new Error(`Invalid setting key: ${key}`)
  }

  const chef = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('setting_values')
    .upsert(
      { tenant_id: chef.tenantId, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id,key' }
    )

  if (error) throw new Error(`Failed to update setting: ${error.message}`)

  return { success: true }
}

// ---------------------------------------------------------------------------
// 4. bulkUpdateSettings
// ---------------------------------------------------------------------------

export async function bulkUpdateSettings(
  updates: { key: string; value: unknown }[]
): Promise<{ success: boolean; updated: number }> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const validUpdates = updates.filter((u) => VALID_KEYS.has(u.key))
  if (validUpdates.length === 0) {
    throw new Error('No valid setting keys provided')
  }

  const now = new Date().toISOString()
  const rows = validUpdates.map((u) => ({
    tenant_id: chef.tenantId,
    key: u.key,
    value: u.value,
    updated_at: now,
  }))

  const { error } = await db.from('setting_values').upsert(rows, { onConflict: 'tenant_id,key' })

  if (error) throw new Error(`Failed to bulk update settings: ${error.message}`)

  return { success: true, updated: validUpdates.length }
}

// ---------------------------------------------------------------------------
// 5. getSettingsCompleteness
// ---------------------------------------------------------------------------

export async function getSettingsCompleteness(): Promise<Record<SettingCategory, number>> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('setting_values')
    .select('key')
    .eq('tenant_id', chef.tenantId)

  if (error) throw new Error(`Failed to check completeness: ${error.message}`)

  const savedKeys = new Set((data ?? []).map((row: any) => row.key))

  const categories: SettingCategory[] = [
    'profile',
    'branding',
    'notifications',
    'billing',
    'integrations',
    'privacy',
    'advanced',
  ]
  const result: Record<string, number> = {}

  for (const cat of categories) {
    const catSettings = SETTINGS_REGISTRY.filter((s) => s.category === cat)
    if (catSettings.length === 0) {
      result[cat] = 100
      continue
    }
    const configured = catSettings.filter((s) => savedKeys.has(s.key)).length
    result[cat] = Math.round((configured / catSettings.length) * 100)
  }

  return result as Record<SettingCategory, number>
}

// ---------------------------------------------------------------------------
// 6. exportSettings
// ---------------------------------------------------------------------------

export async function exportSettings(): Promise<SettingsExport> {
  const values = await getSettingValues()

  const settings: Record<string, unknown> = {}
  for (const v of values) {
    settings[v.key] = v.value
  }

  return {
    exportedAt: new Date().toISOString(),
    settings,
    version: '1.0.0',
  }
}

// ---------------------------------------------------------------------------
// 7. importSettings
// ---------------------------------------------------------------------------

export async function importSettings(
  data: Record<string, unknown>
): Promise<{ success: boolean; imported: number; skipped: string[] }> {
  const entries = Object.entries(data)
  const valid: { key: string; value: unknown }[] = []
  const skipped: string[] = []

  for (const [key, value] of entries) {
    if (VALID_KEYS.has(key)) {
      valid.push({ key, value })
    } else {
      skipped.push(key)
    }
  }

  if (valid.length === 0) {
    return { success: true, imported: 0, skipped }
  }

  const result = await bulkUpdateSettings(valid)

  return { success: result.success, imported: result.updated, skipped }
}
