'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { SessionState, ResumePoint, NavigationBreadcrumb } from './continuity-types'

// ---------------------------------------------------------------------------
// 1. Save session state (upsert current position)
// ---------------------------------------------------------------------------

export async function saveSessionState(
  route: string,
  entityType?: string,
  entityId?: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!route || typeof route !== 'string') {
    throw new Error('Route is required')
  }

  // Upsert by tenant_id (one row per tenant)
  const { data: existing } = await db
    .from('session_states')
    .select('id')
    .eq('tenant_id', user.tenantId)
    .maybeSingle()

  if (existing) {
    const { error } = await db
      .from('session_states')
      .update({
        last_route: route,
        last_entity_type: entityType ?? null,
        last_entity_id: entityId ?? null,
        scroll_position: extra?.scrollPosition ?? 0,
        tab_index: extra?.tabIndex ?? null,
        filter_state: extra?.filterState ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', user.tenantId)

    if (error) throw new Error(`Failed to update session state: ${error.message}`)
  } else {
    const { error } = await db
      .from('session_states')
      .insert({
        tenant_id: user.tenantId,
        last_route: route,
        last_entity_type: entityType ?? null,
        last_entity_id: entityId ?? null,
        scroll_position: extra?.scrollPosition ?? 0,
        tab_index: extra?.tabIndex ?? null,
        filter_state: extra?.filterState ?? null,
      })

    if (error) throw new Error(`Failed to create session state: ${error.message}`)
  }

  // Also record breadcrumb
  const label = route.split('/').filter(Boolean).pop() || 'home'
  const { error: crumbErr } = await db
    .from('session_breadcrumbs')
    .insert({
      tenant_id: user.tenantId,
      route,
      label,
    })

  if (crumbErr) throw new Error(`Failed to save breadcrumb: ${crumbErr.message}`)
}

// ---------------------------------------------------------------------------
// 2. Get last session state (where user left off)
// ---------------------------------------------------------------------------

export async function getLastSessionState(): Promise<SessionState | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('session_states')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .maybeSingle()

  if (error) throw new Error(`Failed to load session state: ${error.message}`)
  if (!data) return null

  return {
    id: data.id,
    tenantId: data.tenant_id,
    lastRoute: data.last_route,
    lastEntityType: data.last_entity_type ?? null,
    lastEntityId: data.last_entity_id ?? null,
    scrollPosition: data.scroll_position ?? 0,
    tabIndex: data.tab_index ?? null,
    filterState: data.filter_state ?? null,
    updatedAt: data.updated_at,
  }
}

// ---------------------------------------------------------------------------
// 3. Get recent routes (breadcrumbs)
// ---------------------------------------------------------------------------

export async function getRecentRoutes(limit: number = 10): Promise<NavigationBreadcrumb[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const safeLimit = Math.min(Math.max(1, limit), 50)

  const { data, error } = await db
    .from('session_breadcrumbs')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('visited_at', { ascending: false })
    .limit(safeLimit)

  if (error) throw new Error(`Failed to load recent routes: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    route: row.route,
    label: row.label,
    visitedAt: row.visited_at,
  }))
}

// ---------------------------------------------------------------------------
// 4. Save resume point (bookmark a point to return to)
// ---------------------------------------------------------------------------

export async function saveResumePoint(
  route: string,
  label: string,
  context: Record<string, unknown> = {},
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!route || typeof route !== 'string') {
    throw new Error('Route is required')
  }
  if (!label || typeof label !== 'string') {
    throw new Error('Label is required')
  }

  const { error } = await db
    .from('resume_points')
    .insert({
      tenant_id: user.tenantId,
      route,
      label,
      context,
    })

  if (error) throw new Error(`Failed to save resume point: ${error.message}`)
}

// ---------------------------------------------------------------------------
// 5. Get all resume points
// ---------------------------------------------------------------------------

export async function getResumePoints(): Promise<ResumePoint[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('resume_points')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load resume points: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    route: row.route,
    label: row.label,
    entityType: row.context?.entityType ?? null,
    entityId: row.context?.entityId ?? null,
    timestamp: row.created_at,
    context: row.context ?? {},
  }))
}

// ---------------------------------------------------------------------------
// 6. Clear a resume point
// ---------------------------------------------------------------------------

export async function clearResumePoint(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!id || typeof id !== 'string') {
    throw new Error('Resume point ID is required')
  }

  const { error } = await db
    .from('resume_points')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to clear resume point: ${error.message}`)
}
