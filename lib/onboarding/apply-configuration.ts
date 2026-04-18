'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { resolveConfiguration, type SystemConfiguration } from './configuration-engine'
import type { ConfigurationInputs } from './configuration-inputs'

function fromTable(db: any, table: string) {
  return (db as any).from(table)
}

/**
 * Full configuration pipeline: resolve inputs -> apply to DB.
 * Called once at end of onboarding interview.
 */
export async function configureWorkspace(inputs: ConfigurationInputs) {
  const config = resolveConfiguration(inputs)
  await applyConfiguration(config)
  return { success: true, hints: config.hints }
}

/**
 * Write SystemConfiguration to database tables.
 * Idempotent: safe to call multiple times with same inputs.
 */
async function applyConfiguration(config: SystemConfiguration) {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.entityId
  const tenantId = user.tenantId!

  // 1. chef_preferences (upsert)
  await upsertChefPreferences(db, chefId, tenantId, config)

  // 2. chef_pricing_config (upsert, new maturity only)
  if (config.pricing) {
    await upsertPricingConfig(db, chefId, config)
  }

  // 3. ai_preferences (upsert)
  await upsertAiPreferences(db, tenantId, config)

  // 4. event_templates: skipped until event creation UI supports template selection
  // (see system-integrity-question-set-configuration-engine.md C8)

  // 5. HACCP plan (non-blocking)
  try {
    const { ensureHACCPPlan } = await import('@/lib/haccp/actions')
    await ensureHACCPPlan(config.archetype)
  } catch (err) {
    console.error('[non-blocking] HACCP plan generation failed', err)
  }

  // 6. Bust caches
  revalidatePath('/', 'layout')
  revalidateTag(`chef-layout-${chefId}`)
  revalidateTag(`chef-archetype-${chefId}`)
  revalidateTag(`chef-preferences-${chefId}`)
}

// ─── Table Writers ────────────────────────────────────────────────────────────

async function upsertChefPreferences(
  db: any,
  chefId: string,
  tenantId: string,
  config: SystemConfiguration
) {
  const payload = {
    archetype: config.archetype,
    enabled_modules: config.enabled_modules,
    primary_nav_hrefs: config.primary_nav_hrefs,
    mobile_tab_hrefs: config.mobile_tab_hrefs,
    dashboard_widgets: config.dashboard_widgets,
    default_prep_hours: config.default_prep_hours,
    default_buffer_minutes: config.default_buffer_minutes,
    default_shopping_minutes: config.default_shopping_minutes,
    target_margin_percent: config.target_margin_percent,
    focus_mode: config.focus_mode,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await fromTable(db, 'chef_preferences')
    .select('id')
    .eq('chef_id', chefId)
    .single()

  if (existing) {
    const { error } = await fromTable(db, 'chef_preferences').update(payload).eq('chef_id', chefId)
    if (error) {
      console.error('[applyConfiguration] chef_preferences update error:', error)
      throw new Error('Failed to apply workspace configuration')
    }
  } else {
    const { error } = await fromTable(db, 'chef_preferences').insert({
      chef_id: chefId,
      tenant_id: tenantId,
      ...payload,
    })
    if (error) {
      console.error('[applyConfiguration] chef_preferences insert error:', error)
      throw new Error('Failed to apply workspace configuration')
    }
  }
}

async function upsertPricingConfig(db: any, chefId: string, config: SystemConfiguration) {
  if (!config.pricing) return

  const payload = {
    deposit_percentage: config.pricing.deposit_percentage,
    balance_due_hours: config.pricing.balance_due_hours,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await fromTable(db, 'chef_pricing_config')
    .select('id')
    .eq('chef_id', chefId)
    .single()

  if (existing) {
    // Only write pricing defaults if current values are still at zero (never manually set)
    const { data: current } = await fromTable(db, 'chef_pricing_config')
      .select('deposit_percentage, balance_due_hours')
      .eq('chef_id', chefId)
      .single()

    const c = current as any
    if (c && c.deposit_percentage === 50 && c.balance_due_hours === 24) {
      // Still at defaults, safe to overwrite
      const { error } = await fromTable(db, 'chef_pricing_config')
        .update(payload)
        .eq('chef_id', chefId)
      if (error) console.error('[non-blocking] pricing config update error:', error)
    }
    // If already customized, don't touch
  } else {
    const { error } = await fromTable(db, 'chef_pricing_config').insert({
      chef_id: chefId,
      ...payload,
    })
    if (error) console.error('[non-blocking] pricing config insert error:', error)
  }
}

async function upsertAiPreferences(db: any, tenantId: string, config: SystemConfiguration) {
  const payload = {
    remy_enabled: config.remy_enabled,
    remy_archetype: config.remy_archetype,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await fromTable(db, 'ai_preferences')
    .select('id')
    .eq('tenant_id', tenantId)
    .single()

  if (existing) {
    const { error } = await fromTable(db, 'ai_preferences')
      .update(payload)
      .eq('tenant_id', tenantId)
    if (error) console.error('[non-blocking] ai_preferences update error:', error)
  } else {
    const { error } = await fromTable(db, 'ai_preferences').insert({
      tenant_id: tenantId,
      ...payload,
    })
    if (error) console.error('[non-blocking] ai_preferences insert error:', error)
  }
}
