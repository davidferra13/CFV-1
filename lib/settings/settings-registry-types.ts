export type SettingCategory = 'profile' | 'branding' | 'notifications' | 'billing' | 'integrations' | 'privacy' | 'advanced'
export type SettingType = 'toggle' | 'text' | 'select' | 'number' | 'color' | 'textarea'

export interface SettingDefinition {
  key: string
  label: string
  description: string
  category: SettingCategory
  type: SettingType
  defaultValue: unknown
  options?: { label: string; value: string }[]
  requiresRestart: boolean
  proOnly: boolean
}

export interface SettingValue {
  id: string
  tenantId: string
  key: string
  value: unknown
  updatedAt: string
}

export interface SettingsSection {
  category: SettingCategory
  label: string
  description: string
  icon: string
  settings: SettingDefinition[]
  completeness: number
}

export interface SettingsExport {
  exportedAt: string
  settings: Record<string, unknown>
  version: string
}
