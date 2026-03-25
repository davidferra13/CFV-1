'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { COMMON_STATE_RATES_BPS } from '@/lib/finance/sales-tax-constants'

// -- Types -------------------------------------------------------------------

export interface ChefTaxConfig {
  id: string
  chefId: string
  stateCode: string
  rateBps: number
  localRateBps: number
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface ResolvedTaxRate {
  stateCode: string
  rateBps: number
  localRateBps: number
  combinedBps: number
  source: 'chef_override' | 'default'
  description: string | null
}

// -- CRUD --------------------------------------------------------------------

/** Get all per-state tax rate overrides for the current chef. */
export async function getChefTaxRates(): Promise<ChefTaxConfig[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_tax_config')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('state_code', { ascending: true })

  if (error) {
    console.error('[chef-tax-config] Failed to fetch:', error)
    throw new Error('Failed to load tax rate overrides')
  }

  return (data || []).map(mapConfig)
}

/** Get a single state override for the current chef. */
export async function getChefTaxRateForState(stateCode: string): Promise<ChefTaxConfig | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('chef_tax_config')
    .select('*')
    .eq('chef_id', user.entityId)
    .eq('state_code', stateCode.toUpperCase())
    .single()

  if (!data) return null
  return mapConfig(data)
}

/** Create or update a per-state tax rate override. */
export async function updateChefTaxRate(input: {
  stateCode: string
  rateBps: number
  localRateBps?: number
  description?: string | null
}): Promise<ChefTaxConfig> {
  const user = await requireChef()
  const db: any = createServerClient()

  const stateCode = input.stateCode.toUpperCase()

  if (!stateCode || stateCode.length < 2) {
    throw new Error('Invalid state code')
  }
  if (input.rateBps < 0 || input.rateBps > 10000) {
    throw new Error('Rate must be between 0 and 10000 bps')
  }
  const localBps = input.localRateBps ?? 0
  if (localBps < 0 || localBps > 10000) {
    throw new Error('Local rate must be between 0 and 10000 bps')
  }

  const { data, error } = await db
    .from('chef_tax_config')
    .upsert(
      {
        chef_id: user.entityId,
        state_code: stateCode,
        rate_bps: input.rateBps,
        local_rate_bps: localBps,
        description: input.description ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'chef_id,state_code' }
    )
    .select()
    .single()

  if (error) {
    console.error('[chef-tax-config] Upsert error:', error)
    throw new Error('Failed to save tax rate override')
  }

  return mapConfig(data)
}

/** Delete a per-state tax rate override (reverts to default constant). */
export async function deleteChefTaxRate(stateCode: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_tax_config')
    .delete()
    .eq('chef_id', user.entityId)
    .eq('state_code', stateCode.toUpperCase())

  if (error) {
    console.error('[chef-tax-config] Delete error:', error)
    throw new Error('Failed to delete tax rate override')
  }
}

// -- Resolution (the key function) -------------------------------------------

/**
 * Resolve the effective tax rate for a given state.
 * Checks per-chef overrides first, falls back to hardcoded constants.
 */
export async function resolveEffectiveTaxRate(stateCode: string): Promise<ResolvedTaxRate> {
  const code = stateCode.toUpperCase()

  // Try chef override first
  const override = await getChefTaxRateForState(code)
  if (override) {
    return {
      stateCode: code,
      rateBps: override.rateBps,
      localRateBps: override.localRateBps,
      combinedBps: override.rateBps + override.localRateBps,
      source: 'chef_override',
      description: override.description,
    }
  }

  // Fall back to hardcoded constants
  const defaultRate = COMMON_STATE_RATES_BPS[code]
  return {
    stateCode: code,
    rateBps: defaultRate?.rateBps ?? 0,
    localRateBps: 0,
    combinedBps: defaultRate?.rateBps ?? 0,
    source: 'default',
    description: defaultRate?.label ?? null,
  }
}

/**
 * Resolve effective tax rates for all states (merges chef overrides with defaults).
 * Returns a map of state code to resolved rate.
 */
export async function resolveAllEffectiveTaxRates(): Promise<Record<string, ResolvedTaxRate>> {
  const overrides = await getChefTaxRates()
  const overrideMap = new Map(overrides.map((o) => [o.stateCode, o]))

  const result: Record<string, ResolvedTaxRate> = {}

  // Process all known states from constants
  for (const [code, info] of Object.entries(COMMON_STATE_RATES_BPS)) {
    const override = overrideMap.get(code)
    if (override) {
      result[code] = {
        stateCode: code,
        rateBps: override.rateBps,
        localRateBps: override.localRateBps,
        combinedBps: override.rateBps + override.localRateBps,
        source: 'chef_override',
        description: override.description,
      }
      overrideMap.delete(code)
    } else {
      result[code] = {
        stateCode: code,
        rateBps: info.rateBps,
        localRateBps: 0,
        combinedBps: info.rateBps,
        source: 'default',
        description: info.label,
      }
    }
  }

  // Include any overrides for states NOT in the constants (custom entries)
  for (const [code, override] of overrideMap) {
    result[code] = {
      stateCode: code,
      rateBps: override.rateBps,
      localRateBps: override.localRateBps,
      combinedBps: override.rateBps + override.localRateBps,
      source: 'chef_override',
      description: override.description,
    }
  }

  return result
}

// -- Mapper ------------------------------------------------------------------

function mapConfig(r: any): ChefTaxConfig {
  return {
    id: r.id,
    chefId: r.chef_id,
    stateCode: r.state_code,
    rateBps: r.rate_bps,
    localRateBps: r.local_rate_bps,
    description: r.description,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}
