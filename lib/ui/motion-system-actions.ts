'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  MotionIntensity,
  MotionPreference,
  MotionToken,
  StateTransitionRule,
  TransitionType,
  MotionSummary,
} from './motion-system-types'

const PREFS_TABLE = 'motion_preferences'
const RULES_TABLE = 'state_transition_rules'

const VALID_INTENSITIES: MotionIntensity[] = ['none', 'subtle', 'moderate', 'full']
const VALID_TRANSITIONS: TransitionType[] = ['fade', 'slide', 'scale', 'collapse', 'morph']

function mapPrefRow(row: any): MotionPreference {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    chefId: row.chef_id,
    intensity: row.intensity as MotionIntensity,
    reducedMotion: row.reduced_motion ?? false,
    customTokens: (row.custom_tokens ?? []) as MotionToken[],
    updatedAt: row.updated_at,
  }
}

function mapRuleRow(row: any): StateTransitionRule {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fromState: row.from_state,
    toState: row.to_state,
    transitionType: row.transition_type as TransitionType,
    duration: row.duration,
    easing: row.easing,
    component: row.component ?? null,
    createdAt: row.created_at,
  }
}

function buildDefaultPreference(tenantId: string, chefId: string): MotionPreference {
  return {
    id: '',
    tenantId,
    chefId,
    intensity: 'moderate',
    reducedMotion: false,
    customTokens: [],
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Get current chef's motion preference. Returns default if none saved.
 */
export async function getMotionPreference(): Promise<MotionPreference> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from(PREFS_TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('chef_id', user.id)
    .maybeSingle()

  if (error) throw new Error(`Failed to load motion preference: ${error.message}`)
  if (!data) return buildDefaultPreference(user.tenantId!, user.id)

  return mapPrefRow(data)
}

/**
 * Save motion preference for current chef. Upserts on tenant+chef.
 */
export async function updateMotionPreference(
  intensity: MotionIntensity,
  reducedMotion?: boolean,
  customTokens?: MotionToken[]
): Promise<MotionPreference> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!VALID_INTENSITIES.includes(intensity)) {
    throw new Error(`Invalid intensity: ${intensity}`)
  }

  const payload = {
    tenant_id: user.tenantId!,
    chef_id: user.id,
    intensity,
    reduced_motion: reducedMotion ?? false,
    custom_tokens: customTokens ?? [],
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from(PREFS_TABLE)
    .upsert(payload, { onConflict: 'tenant_id,chef_id' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to save motion preference: ${error.message}`)

  return mapPrefRow(data)
}

/**
 * List state transition rules, optionally filtered by component.
 */
export async function getStateTransitionRules(
  component?: string
): Promise<StateTransitionRule[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from(RULES_TABLE)
    .select('*')
    .eq('tenant_id', user.tenantId!)

  if (component) {
    query = query.eq('component', component)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) throw new Error(`Failed to load transition rules: ${error.message}`)

  return (data ?? []).map(mapRuleRow)
}

/**
 * Create or update a state transition rule.
 */
export async function upsertStateTransitionRule(
  fromState: string,
  toState: string,
  transitionType: TransitionType,
  duration: number,
  easing: string,
  component?: string
): Promise<StateTransitionRule> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!VALID_TRANSITIONS.includes(transitionType)) {
    throw new Error(`Invalid transition type: ${transitionType}`)
  }
  if (!fromState || !toState) {
    throw new Error('fromState and toState are required')
  }
  if (duration < 0 || duration > 5000) {
    throw new Error('Duration must be between 0 and 5000ms')
  }

  // Check for existing rule with same from/to/component
  let existingQuery = db
    .from(RULES_TABLE)
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('from_state', fromState)
    .eq('to_state', toState)

  if (component) {
    existingQuery = existingQuery.eq('component', component)
  } else {
    existingQuery = existingQuery.is('component', null)
  }

  const { data: existing } = await existingQuery.maybeSingle()

  const payload = {
    tenant_id: user.tenantId!,
    from_state: fromState,
    to_state: toState,
    transition_type: transitionType,
    duration,
    easing,
    component: component ?? null,
  }

  let result
  if (existing) {
    const { data, error } = await db
      .from(RULES_TABLE)
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to update transition rule: ${error.message}`)
    result = data
  } else {
    const { data, error } = await db
      .from(RULES_TABLE)
      .insert(payload)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to create transition rule: ${error.message}`)
    result = data
  }

  return mapRuleRow(result)
}

/**
 * Return built-in motion tokens (not persisted, just defaults).
 */
export async function getDefaultMotionTokens(): Promise<MotionToken[]> {
  await requireChef()

  return [
    { name: 'instant', duration: 0, easing: 'linear', transitionType: 'fade', description: 'No animation' },
    { name: 'fast', duration: 100, easing: 'ease-out', transitionType: 'fade', description: 'Quick micro-interaction' },
    { name: 'normal', duration: 200, easing: 'ease-in-out', transitionType: 'fade', description: 'Standard transition' },
    { name: 'smooth', duration: 300, easing: 'ease-in-out', transitionType: 'slide', description: 'Panel or drawer slide' },
    { name: 'deliberate', duration: 500, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', transitionType: 'scale', description: 'Emphasis transition' },
    { name: 'collapse', duration: 250, easing: 'ease-out', transitionType: 'collapse', description: 'Accordion collapse/expand' },
    { name: 'morph', duration: 400, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', transitionType: 'morph', description: 'Shape or layout morph' },
  ]
}

/**
 * Aggregate motion system stats for current tenant.
 */
export async function getMotionSummary(): Promise<MotionSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all rules
  const { data: rules, error: rulesErr } = await db
    .from(RULES_TABLE)
    .select('transition_type')
    .eq('tenant_id', user.tenantId!)

  if (rulesErr) throw new Error(`Failed to load rules: ${rulesErr.message}`)

  // Get all preferences for tenant
  const { data: prefs, error: prefsErr } = await db
    .from(PREFS_TABLE)
    .select('intensity, reduced_motion')
    .eq('tenant_id', user.tenantId!)

  if (prefsErr) throw new Error(`Failed to load preferences: ${prefsErr.message}`)

  const byTransitionType: Record<TransitionType, number> = {
    fade: 0, slide: 0, scale: 0, collapse: 0, morph: 0,
  }
  for (const r of rules ?? []) {
    const tt = r.transition_type as TransitionType
    if (tt in byTransitionType) byTransitionType[tt]++
  }

  const preferenceDistribution: Record<MotionIntensity, number> = {
    none: 0, subtle: 0, moderate: 0, full: 0,
  }
  let reducedMotionCount = 0
  for (const p of prefs ?? []) {
    const i = p.intensity as MotionIntensity
    if (i in preferenceDistribution) preferenceDistribution[i]++
    if (p.reduced_motion) reducedMotionCount++
  }

  return {
    totalRules: (rules ?? []).length,
    byTransitionType,
    preferenceDistribution,
    reducedMotionCount,
  }
}
