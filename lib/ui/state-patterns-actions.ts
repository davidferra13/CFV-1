'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  UIStateType,
  StatePatternConfig,
  StatePatternAudit,
  StatePatternSummary,
} from './state-patterns-types'

const VALID_STATE_TYPES: UIStateType[] = ['empty', 'loading', 'error', 'success', 'partial']

/**
 * Get config for a specific state on a route/component.
 */
export async function getStatePatternConfig(
  route: string,
  component: string,
  stateType: UIStateType
): Promise<StatePatternConfig | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('state_pattern_configs')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('route', route)
    .eq('component', component)
    .eq('state_type', stateType)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    tenantId: data.tenant_id,
    route: data.route,
    component: data.component,
    stateType: data.state_type as UIStateType,
    title: data.title,
    message: data.message,
    icon: data.icon,
    actionLabel: data.action_label,
    actionHref: data.action_href,
    illustration: data.illustration,
    createdAt: data.created_at,
  }
}

/**
 * Create or update a state pattern config.
 */
export async function upsertStatePattern(
  route: string,
  component: string,
  stateType: UIStateType,
  title: string,
  message?: string,
  icon?: string,
  actionLabel?: string,
  actionHref?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!VALID_STATE_TYPES.includes(stateType)) {
    return { success: false, error: 'Invalid state type' }
  }
  if (!route || !component || !title) {
    return { success: false, error: 'Route, component, and title are required' }
  }

  const { data: existing } = await db
    .from('state_pattern_configs')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('route', route)
    .eq('component', component)
    .eq('state_type', stateType)
    .single()

  if (existing) {
    const { error } = await db
      .from('state_pattern_configs')
      .update({
        title,
        message: message ?? null,
        icon: icon ?? null,
        action_label: actionLabel ?? null,
        action_href: actionHref ?? null,
      })
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await db
      .from('state_pattern_configs')
      .insert({
        tenant_id: user.tenantId!,
        route,
        component,
        state_type: stateType,
        title,
        message: message ?? null,
        icon: icon ?? null,
        action_label: actionLabel ?? null,
        action_href: actionHref ?? null,
      })

    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Record an audit of which states a component handles.
 * Score = count of handled states (0-4).
 */
export async function auditComponentStates(
  route: string,
  component: string,
  hasEmpty: boolean,
  hasLoading: boolean,
  hasError: boolean,
  hasSuccess: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!route || !component) {
    return { success: false, error: 'Route and component are required' }
  }

  const score = [hasEmpty, hasLoading, hasError, hasSuccess].filter(Boolean).length

  // Upsert by tenant + route + component
  const { data: existing } = await db
    .from('state_pattern_audits')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('route', route)
    .eq('component', component)
    .single()

  if (existing) {
    const { error } = await db
      .from('state_pattern_audits')
      .update({
        has_empty_state: hasEmpty,
        has_loading_state: hasLoading,
        has_error_state: hasError,
        has_success_state: hasSuccess,
        score,
        audited_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await db
      .from('state_pattern_audits')
      .insert({
        tenant_id: user.tenantId!,
        route,
        component,
        has_empty_state: hasEmpty,
        has_loading_state: hasLoading,
        has_error_state: hasError,
        has_success_state: hasSuccess,
        score,
      })

    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * List audits, optionally filtered by route and/or minimum score.
 */
export async function getStatePatternAudits(
  route?: string,
  minScore?: number
): Promise<StatePatternAudit[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('state_pattern_audits')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('audited_at', { ascending: false })

  if (route) {
    query = query.eq('route', route)
  }
  if (minScore !== undefined) {
    query = query.gte('score', minScore)
  }

  const { data, error } = await query

  if (error || !data) return []

  return data.map((row: any): StatePatternAudit => ({
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    component: row.component,
    hasEmptyState: row.has_empty_state ?? false,
    hasLoadingState: row.has_loading_state ?? false,
    hasErrorState: row.has_error_state ?? false,
    hasSuccessState: row.has_success_state ?? false,
    score: row.score ?? 0,
    auditedAt: row.audited_at,
  }))
}

/**
 * Aggregate coverage stats across all audited components.
 */
export async function getStatePatternSummary(): Promise<StatePatternSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('state_pattern_audits')
    .select('*')
    .eq('tenant_id', user.tenantId!)

  if (error || !data || data.length === 0) {
    return {
      totalComponents: 0,
      fullyHandled: 0,
      partiallyHandled: 0,
      unhandled: 0,
      byStateType: { empty: 0, loading: 0, error: 0, success: 0, partial: 0 },
      coveragePercent: 0,
    }
  }

  let fullyHandled = 0
  let partiallyHandled = 0
  let unhandled = 0
  const byStateType: Record<UIStateType, number> = {
    empty: 0,
    loading: 0,
    error: 0,
    success: 0,
    partial: 0,
  }

  for (const row of data) {
    const score = row.score ?? 0
    if (score === 4) fullyHandled++
    else if (score > 0) partiallyHandled++
    else unhandled++

    if (row.has_empty_state) byStateType.empty++
    if (row.has_loading_state) byStateType.loading++
    if (row.has_error_state) byStateType.error++
    if (row.has_success_state) byStateType.success++
    if (score > 0 && score < 4) byStateType.partial++
  }

  const totalComponents = data.length
  const coveragePercent = totalComponents > 0
    ? Math.round((fullyHandled / totalComponents) * 100)
    : 0

  return {
    totalComponents,
    fullyHandled,
    partiallyHandled,
    unhandled,
    byStateType,
    coveragePercent,
  }
}

/**
 * Get components missing one or more state handlers (score < 4).
 */
export async function getUnhandledStates(): Promise<StatePatternAudit[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('state_pattern_audits')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .lt('score', 4)
    .order('score', { ascending: true })

  if (error || !data) return []

  return data.map((row: any): StatePatternAudit => ({
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    component: row.component,
    hasEmptyState: row.has_empty_state ?? false,
    hasLoadingState: row.has_loading_state ?? false,
    hasErrorState: row.has_error_state ?? false,
    hasSuccessState: row.has_success_state ?? false,
    score: row.score ?? 0,
    auditedAt: row.audited_at,
  }))
}
