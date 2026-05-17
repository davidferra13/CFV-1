'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  MagicComponent,
  ComponentCategory,
  ComponentVariant,
  ComponentUsage,
  MagicComponentSummary,
} from './magic-components-types'

// ---------------------------------------------------------------------------
// 1. getMagicComponents
// ---------------------------------------------------------------------------

export async function getMagicComponents(
  category?: ComponentCategory,
): Promise<MagicComponent[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('magic_components')
    .select('id, tenant_id, name, category, variant, props, preview_route, score, created_at')
    .eq('tenant_id', user.tenantId)
    .order('name')

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    category: r.category,
    variant: r.variant,
    props: r.props ?? {},
    previewRoute: r.preview_route,
    score: r.score,
    createdAt: r.created_at,
  }))
}

// ---------------------------------------------------------------------------
// 2. upsertMagicComponent
// ---------------------------------------------------------------------------

export async function upsertMagicComponent(
  name: string,
  category: ComponentCategory,
  variant: string | null,
  props: Record<string, unknown>,
  previewRoute?: string,
  score?: number,
): Promise<MagicComponent> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('magic_components')
    .select('id')
    .eq('tenant_id', user.tenantId)
    .eq('name', name)
    .maybeSingle()

  const row: Record<string, unknown> = {
    tenant_id: user.tenantId,
    name,
    category,
    variant: variant ?? null,
    props,
    preview_route: previewRoute ?? null,
    score: score ?? null,
  }

  let result: any
  if (existing?.id) {
    const { data, error } = await db
      .from('magic_components')
      .update(row)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    result = data
  } else {
    const { data, error } = await db
      .from('magic_components')
      .insert(row)
      .select()
      .single()
    if (error) throw new Error(error.message)
    result = data
  }

  return {
    id: result.id,
    tenantId: result.tenant_id,
    name: result.name,
    category: result.category,
    variant: result.variant,
    props: result.props ?? {},
    previewRoute: result.preview_route,
    score: result.score,
    createdAt: result.created_at,
  }
}

// ---------------------------------------------------------------------------
// 3. getComponentVariants
// ---------------------------------------------------------------------------

export async function getComponentVariants(
  componentId: string,
): Promise<ComponentVariant[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('component_variants')
    .select('id, tenant_id, component_id, name, props_overrides, is_default, created_at')
    .eq('tenant_id', user.tenantId)
    .eq('component_id', componentId)
    .order('name')

  if (error) throw new Error(error.message)

  return (data ?? []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    componentId: r.component_id,
    name: r.name,
    propsOverrides: r.props_overrides ?? {},
    isDefault: r.is_default ?? false,
    createdAt: r.created_at,
  }))
}

// ---------------------------------------------------------------------------
// 4. upsertComponentVariant
// ---------------------------------------------------------------------------

export async function upsertComponentVariant(
  componentId: string,
  name: string,
  propsOverrides: Record<string, unknown>,
  isDefault?: boolean,
): Promise<ComponentVariant> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('component_variants')
    .select('id')
    .eq('tenant_id', user.tenantId)
    .eq('component_id', componentId)
    .eq('name', name)
    .maybeSingle()

  const row: Record<string, unknown> = {
    tenant_id: user.tenantId,
    component_id: componentId,
    name,
    props_overrides: propsOverrides,
    is_default: isDefault ?? false,
  }

  let result: any
  if (existing?.id) {
    const { data, error } = await db
      .from('component_variants')
      .update(row)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    result = data
  } else {
    const { data, error } = await db
      .from('component_variants')
      .insert(row)
      .select()
      .single()
    if (error) throw new Error(error.message)
    result = data
  }

  return {
    id: result.id,
    tenantId: result.tenant_id,
    componentId: result.component_id,
    name: result.name,
    propsOverrides: result.props_overrides ?? {},
    isDefault: result.is_default ?? false,
    createdAt: result.created_at,
  }
}

// ---------------------------------------------------------------------------
// 5. logComponentUsage
// ---------------------------------------------------------------------------

export async function logComponentUsage(
  componentName: string,
  route: string,
): Promise<ComponentUsage> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('component_usage_logs')
    .insert({
      tenant_id: user.tenantId,
      component_name: componentName,
      route,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return {
    id: data.id,
    tenantId: data.tenant_id,
    componentName: data.component_name,
    route: data.route,
    usedAt: data.used_at,
  }
}

// ---------------------------------------------------------------------------
// 6. getMagicComponentSummary
// ---------------------------------------------------------------------------

export async function getMagicComponentSummary(): Promise<MagicComponentSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: components, error: compErr } = await db
    .from('magic_components')
    .select('id, category')
    .eq('tenant_id', user.tenantId)

  if (compErr) throw new Error(compErr.message)

  const { data: variants, error: varErr } = await db
    .from('component_variants')
    .select('id')
    .eq('tenant_id', user.tenantId)

  if (varErr) throw new Error(varErr.message)

  const { data: usageLogs, error: useErr } = await db
    .from('component_usage_logs')
    .select('component_name')
    .eq('tenant_id', user.tenantId)

  if (useErr) throw new Error(useErr.message)

  const byCategory: Record<string, number> = {}
  for (const c of components ?? []) {
    byCategory[c.category] = (byCategory[c.category] ?? 0) + 1
  }

  const usageCounts: Record<string, number> = {}
  for (const u of usageLogs ?? []) {
    usageCounts[u.component_name] = (usageCounts[u.component_name] ?? 0) + 1
  }

  const entries = Object.entries(usageCounts)
  entries.sort((a, b) => b[1] - a[1])

  return {
    totalComponents: (components ?? []).length,
    byCategory: byCategory as Record<string, number>,
    totalVariants: (variants ?? []).length,
    mostUsed: entries.length > 0 ? entries[0][0] : null,
    leastUsed: entries.length > 0 ? entries[entries.length - 1][0] : null,
  }
}
