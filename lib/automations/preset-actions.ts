// Preset Automation Rules Server Actions
// Chef-facing CRUD for config-driven toggle rules.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { PRESET_RULE_DEFINITIONS } from './rules'
import type { PresetRuleType, PresetRuleConfig } from './types'

// -------- Get All Preset Rules --------
// Returns a merged list: definitions + DB state. Missing DB rows get defaults.

export async function getPresetRules(): Promise<PresetRuleConfig[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('preset_automation_rules' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getPresetRules] Error:', error)
  }

  const dbRows = (data || []) as any[]
  const dbMap = new Map<string, any>()
  for (const row of dbRows) {
    dbMap.set(row.rule_type, row)
  }

  // Merge definitions with DB state
  return PRESET_RULE_DEFINITIONS.map((def) => {
    const dbRow = dbMap.get(def.type)
    if (dbRow) {
      return {
        type: def.type as PresetRuleType,
        enabled: dbRow.enabled,
        config: { ...def.defaultConfig, ...(dbRow.config || {}) },
        last_triggered_at: dbRow.last_triggered_at,
      }
    }
    return {
      type: def.type as PresetRuleType,
      enabled: false,
      config: { ...def.defaultConfig },
      last_triggered_at: null,
    }
  })
}

// -------- Toggle Preset Rule --------

export async function togglePresetRule(ruleType: PresetRuleType, enabled: boolean) {
  const user = await requireChef()
  const db: any = createServerClient()

  const definition = PRESET_RULE_DEFINITIONS.find((d) => d.type === ruleType)
  if (!definition) {
    throw new Error(`Unknown preset rule type: ${ruleType}`)
  }

  const { error } = await db.from('preset_automation_rules' as any).upsert(
    {
      tenant_id: user.tenantId!,
      rule_type: ruleType,
      enabled,
      config: definition.defaultConfig,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,rule_type' }
  )

  if (error) {
    console.error('[togglePresetRule] Error:', error)
    throw new Error('Failed to toggle preset rule')
  }

  revalidatePath('/settings/automations')
  return { success: true }
}

// -------- Update Preset Rule Config --------

export async function updatePresetRuleConfig(
  ruleType: PresetRuleType,
  config: Record<string, number | string | boolean>
) {
  const user = await requireChef()
  const db: any = createServerClient()

  const definition = PRESET_RULE_DEFINITIONS.find((d) => d.type === ruleType)
  if (!definition) {
    throw new Error(`Unknown preset rule type: ${ruleType}`)
  }

  // Validate config keys against definition
  const validKeys = new Set(definition.configFields.map((f) => f.key))
  const sanitizedConfig: Record<string, number | string | boolean> = {}
  for (const [key, value] of Object.entries(config)) {
    if (validKeys.has(key)) {
      sanitizedConfig[key] = value
    }
  }

  const mergedConfig = { ...definition.defaultConfig, ...sanitizedConfig }

  const { error } = await db.from('preset_automation_rules' as any).upsert(
    {
      tenant_id: user.tenantId!,
      rule_type: ruleType,
      config: mergedConfig,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,rule_type' }
  )

  if (error) {
    console.error('[updatePresetRuleConfig] Error:', error)
    throw new Error('Failed to update preset rule config')
  }

  revalidatePath('/settings/automations')
  return { success: true }
}
