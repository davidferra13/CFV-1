'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  NavSection,
  NavPreference,
  NavAuditEntry,
  RecentPage,
} from './nav-config-types'

// ---------------------------------------------------------------------------
// 1. getNavPreferences
// ---------------------------------------------------------------------------

export async function getNavPreferences(): Promise<NavPreference | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('nav_preferences')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('chef_id', user.entityId)
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null

  return {
    id: data.id,
    tenantId: data.tenant_id,
    chefId: data.chef_id,
    pinnedItems: (data.pinned_items ?? []) as string[],
    collapsedSections: (data.collapsed_sections ?? []) as NavSection[],
    recentPages: (data.recent_pages ?? []) as RecentPage[],
    updatedAt: data.updated_at,
  }
}

// ---------------------------------------------------------------------------
// 2. updateNavPreferences
// ---------------------------------------------------------------------------

export async function updateNavPreferences(
  pinnedItems?: string[],
  collapsedSections?: NavSection[]
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const existing = await getNavPreferences()

  if (existing) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (pinnedItems !== undefined) updates.pinned_items = pinnedItems
    if (collapsedSections !== undefined) updates.collapsed_sections = collapsedSections

    const { error } = await db
      .from('nav_preferences')
      .update(updates)
      .eq('id', existing.id)

    if (error) throw error
  } else {
    const { error } = await db.from('nav_preferences').insert({
      tenant_id: user.tenantId!,
      chef_id: user.entityId,
      pinned_items: pinnedItems ?? [],
      collapsed_sections: collapsedSections ?? [],
      recent_pages: [],
    })

    if (error) throw error
  }
}

// ---------------------------------------------------------------------------
// 3. recordRecentPage
// ---------------------------------------------------------------------------

const MAX_RECENT_PAGES = 20

export async function recordRecentPage(
  route: string,
  title: string
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const prefs = await getNavPreferences()
  const now = new Date().toISOString()
  const entry: RecentPage = { route, title, visitedAt: now }

  if (prefs) {
    const pages = (prefs.recentPages ?? []).filter(
      (p: RecentPage) => p.route !== route
    )
    pages.unshift(entry)
    const trimmed = pages.slice(0, MAX_RECENT_PAGES)

    const { error } = await db
      .from('nav_preferences')
      .update({ recent_pages: trimmed, updated_at: now })
      .eq('id', prefs.id)

    if (error) throw error
  } else {
    const { error } = await db.from('nav_preferences').insert({
      tenant_id: user.tenantId!,
      chef_id: user.entityId,
      pinned_items: [],
      collapsed_sections: [],
      recent_pages: [entry],
    })

    if (error) throw error
  }
}

// ---------------------------------------------------------------------------
// 4. getRecentPages
// ---------------------------------------------------------------------------

export async function getRecentPages(limit = 10): Promise<RecentPage[]> {
  const prefs = await getNavPreferences()
  if (!prefs) return []
  return prefs.recentPages.slice(0, limit)
}

// ---------------------------------------------------------------------------
// 5. auditPageHeader
// ---------------------------------------------------------------------------

export async function auditPageHeader(
  route: string,
  hasHeader: boolean,
  headerComplete: boolean,
  missingFields: string[]
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Upsert: delete existing entry for this route, then insert fresh
  await db
    .from('nav_audit_entries')
    .delete()
    .eq('tenant_id', user.tenantId!)
    .eq('route', route)

  const { error } = await db.from('nav_audit_entries').insert({
    tenant_id: user.tenantId!,
    route,
    has_header: hasHeader,
    header_complete: headerComplete,
    missing_fields: missingFields,
  })

  if (error) throw error
}

// ---------------------------------------------------------------------------
// 6. getHeaderAuditResults
// ---------------------------------------------------------------------------

export async function getHeaderAuditResults(
  limit = 100
): Promise<NavAuditEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('nav_audit_entries')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('checked_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return ((data ?? []) as any[]).map((row: any) => ({
    route: row.route,
    hasHeader: row.has_header,
    headerComplete: row.header_complete,
    missingFields: (row.missing_fields ?? []) as string[],
    checkedAt: row.checked_at,
  }))
}

// ---------------------------------------------------------------------------
// 7. getNavSummary
// ---------------------------------------------------------------------------

export async function getNavSummary(): Promise<{
  totalRoutes: number
  routesWithHeaders: number
  missingHeaders: number
  pinnedItems: string[]
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: auditRows, error: auditErr } = await db
    .from('nav_audit_entries')
    .select('has_header')
    .eq('tenant_id', user.tenantId!)

  if (auditErr) throw auditErr

  const rows = (auditRows ?? []) as { has_header: boolean }[]
  const totalRoutes = rows.length
  const routesWithHeaders = rows.filter((r) => r.has_header).length
  const missingHeaders = totalRoutes - routesWithHeaders

  const prefs = await getNavPreferences()
  const pinnedItems = prefs?.pinnedItems ?? []

  return { totalRoutes, routesWithHeaders, missingHeaders, pinnedItems }
}
