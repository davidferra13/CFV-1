'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { DensityMode, DensityPreference, DesignSystemAuditEntry, DesignSystemSummary } from './design-system-types'

/**
 * Get current chef's density preference.
 * Returns null if no preference has been set (defaults to 'comfortable').
 */
export async function getDensityPreference(): Promise<DensityPreference | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('density_preferences')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('chef_id', user.entityId!)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    tenantId: data.tenant_id,
    chefId: data.chef_id,
    mode: data.mode as DensityMode,
    customOverrides: data.custom_overrides ?? {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/**
 * Set density preference for the current chef.
 * Upserts: creates if missing, updates if exists.
 */
export async function setDensityPreference(
  mode: DensityMode,
  customOverrides?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const validModes: DensityMode[] = ['compact', 'comfortable', 'spacious']
  if (!validModes.includes(mode)) {
    return { success: false, error: 'Invalid density mode' }
  }

  // Check if preference exists
  const { data: existing } = await db
    .from('density_preferences')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('chef_id', user.entityId!)
    .single()

  if (existing) {
    const { error } = await db
      .from('density_preferences')
      .update({
        mode,
        custom_overrides: customOverrides ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('tenant_id', user.tenantId!)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await db
      .from('density_preferences')
      .insert({
        tenant_id: user.tenantId!,
        chef_id: user.entityId!,
        mode,
        custom_overrides: customOverrides ?? {},
      })

    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get design tokens, optionally filtered by category.
 * Returns static token definitions (not DB-stored).
 */
export async function getDesignTokens(category?: string) {
  await requireChef()

  // Static token registry; expanded as the design system matures
  const tokens = [
    { name: 'color-primary', category: 'color', value: '#1a1a2e', darkValue: '#e0e0e0', description: 'Primary brand color' },
    { name: 'color-accent', category: 'color', value: '#e94560', darkValue: '#ff6b81', description: 'Accent/action color' },
    { name: 'color-surface', category: 'color', value: '#ffffff', darkValue: '#16213e', description: 'Surface background' },
    { name: 'color-muted', category: 'color', value: '#6b7280', darkValue: '#9ca3af', description: 'Muted/secondary text' },
    { name: 'spacing-unit', category: 'spacing', value: '4px', darkValue: null, description: 'Base spacing unit' },
    { name: 'radius-sm', category: 'radius', value: '4px', darkValue: null, description: 'Small border radius' },
    { name: 'radius-md', category: 'radius', value: '8px', darkValue: null, description: 'Medium border radius' },
    { name: 'radius-lg', category: 'radius', value: '12px', darkValue: null, description: 'Large border radius' },
    { name: 'font-body', category: 'typography', value: 'Inter, sans-serif', darkValue: null, description: 'Body font family' },
    { name: 'font-heading', category: 'typography', value: 'Inter, sans-serif', darkValue: null, description: 'Heading font family' },
    { name: 'shadow-sm', category: 'elevation', value: '0 1px 2px rgba(0,0,0,0.05)', darkValue: '0 1px 2px rgba(0,0,0,0.3)', description: 'Small shadow' },
    { name: 'shadow-md', category: 'elevation', value: '0 4px 6px rgba(0,0,0,0.07)', darkValue: '0 4px 6px rgba(0,0,0,0.4)', description: 'Medium shadow' },
  ]

  if (category) {
    return tokens.filter(t => t.category === category)
  }
  return tokens
}

/**
 * Record a design compliance audit for a route.
 */
export async function auditRouteDesignCompliance(
  route: string,
  violations: Array<{ rule: string; element: string; detail: string }>,
  score: number
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (score < 0 || score > 100) {
    return { success: false, error: 'Score must be between 0 and 100' }
  }

  const { error } = await db
    .from('design_audit_entries')
    .insert({
      tenant_id: user.tenantId!,
      route,
      violations,
      score,
    })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Get recent design audit results for the current tenant.
 */
export async function getDesignAuditResults(
  limit: number = 20
): Promise<DesignSystemAuditEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('design_audit_entries')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('checked_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    violations: row.violations ?? [],
    score: row.score,
    checkedAt: row.checked_at,
  }))
}

/**
 * Aggregate design system stats: token count, audit scores, density distribution.
 */
export async function getDesignSystemSummary(): Promise<DesignSystemSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Token count from static registry
  const tokens = await getDesignTokens()
  const tokenCount = tokens.length

  // Audit stats
  const { data: audits } = await db
    .from('design_audit_entries')
    .select('score')
    .eq('tenant_id', user.tenantId!)

  const auditCount = audits?.length ?? 0
  const avgAuditScore = auditCount > 0
    ? Math.round((audits as any[]).reduce((sum: number, a: any) => sum + (a.score ?? 0), 0) / auditCount)
    : null

  // Density distribution across all chefs in tenant
  const { data: prefs } = await db
    .from('density_preferences')
    .select('mode')
    .eq('tenant_id', user.tenantId!)

  const densityDistribution: Record<DensityMode, number> = {
    compact: 0,
    comfortable: 0,
    spacious: 0,
  }
  if (prefs) {
    for (const p of prefs as any[]) {
      const m = p.mode as DensityMode
      if (m in densityDistribution) {
        densityDistribution[m]++
      }
    }
  }

  return { tokenCount, avgAuditScore, auditCount, densityDistribution }
}
