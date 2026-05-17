'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  PortalRole,
  VisualMode,
  RolePermission,
  PortalModeSummary,
} from './portal-modes-types'

export async function getVisualMode(role: PortalRole): Promise<VisualMode | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const rows = await db
    .from('portal_visual_modes')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('role', role)
    .limit(1)

  if (!rows || rows.length === 0) return null

  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    role: r.role as PortalRole,
    name: r.name,
    theme: r.theme,
    colorOverrides: r.color_overrides ?? null,
    layoutOverrides: r.layout_overrides ?? null,
    logoUrl: r.logo_url ?? null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }
}

export async function upsertVisualMode(
  role: PortalRole,
  name: string,
  theme: string,
  colorOverrides?: Record<string, string> | null,
  layoutOverrides?: Record<string, unknown> | null,
  logoUrl?: string | null
): Promise<VisualMode> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date().toISOString()
  const payload = {
    tenant_id: user.tenantId,
    role,
    name,
    theme,
    color_overrides: colorOverrides ?? null,
    layout_overrides: layoutOverrides ?? null,
    logo_url: logoUrl ?? null,
    updated_at: now,
  }

  const existing = await db
    .from('portal_visual_modes')
    .select('id')
    .eq('tenant_id', user.tenantId)
    .eq('role', role)
    .limit(1)

  let rows: any[]
  if (existing && existing.length > 0) {
    rows = await db.from('portal_visual_modes').update(payload).eq('id', existing[0].id).select('*')
  } else {
    rows = await db
      .from('portal_visual_modes')
      .insert({ ...payload, created_at: now })
      .select('*')
  }

  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    role: r.role as PortalRole,
    name: r.name,
    theme: r.theme,
    colorOverrides: r.color_overrides ?? null,
    layoutOverrides: r.layout_overrides ?? null,
    logoUrl: r.logo_url ?? null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }
}

export async function getVisualModes(): Promise<VisualMode[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const rows = await db
    .from('portal_visual_modes')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('role', { ascending: true })

  if (!rows || rows.length === 0) return []

  return rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    role: r.role as PortalRole,
    name: r.name,
    theme: r.theme,
    colorOverrides: r.color_overrides ?? null,
    layoutOverrides: r.layout_overrides ?? null,
    logoUrl: r.logo_url ?? null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }))
}

export async function getRolePermissions(role: PortalRole): Promise<RolePermission | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const rows = await db
    .from('portal_role_permissions')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('role', role)
    .limit(1)

  if (!rows || rows.length === 0) return null

  const r = rows[0]
  return {
    role: r.role as PortalRole,
    canView: Array.isArray(r.can_view) ? r.can_view : [],
    canEdit: Array.isArray(r.can_edit) ? r.can_edit : [],
    canDelete: Array.isArray(r.can_delete) ? r.can_delete : [],
  }
}

export async function upsertRolePermissions(
  role: PortalRole,
  canView: string[],
  canEdit: string[],
  canDelete: string[]
): Promise<RolePermission> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload = {
    tenant_id: user.tenantId,
    role,
    can_view: canView,
    can_edit: canEdit,
    can_delete: canDelete,
  }

  const existing = await db
    .from('portal_role_permissions')
    .select('id')
    .eq('tenant_id', user.tenantId)
    .eq('role', role)
    .limit(1)

  let rows: any[]
  if (existing && existing.length > 0) {
    rows = await db
      .from('portal_role_permissions')
      .update(payload)
      .eq('id', existing[0].id)
      .select('*')
  } else {
    rows = await db
      .from('portal_role_permissions')
      .insert({ ...payload, created_at: new Date().toISOString() })
      .select('*')
  }

  const r = rows[0]
  return {
    role: r.role as PortalRole,
    canView: Array.isArray(r.can_view) ? r.can_view : [],
    canEdit: Array.isArray(r.can_edit) ? r.can_edit : [],
    canDelete: Array.isArray(r.can_delete) ? r.can_delete : [],
  }
}

export async function getPortalModeSummary(): Promise<PortalModeSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const rows = await db.from('portal_visual_modes').select('*').eq('tenant_id', user.tenantId)

  const modes: VisualMode[] = (rows ?? []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    role: r.role as PortalRole,
    name: r.name,
    theme: r.theme,
    colorOverrides: r.color_overrides ?? null,
    layoutOverrides: r.layout_overrides ?? null,
    logoUrl: r.logo_url ?? null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }))

  const byRole: Record<PortalRole, number> = {
    chef: 0,
    client: 0,
    crew: 0,
    vendor: 0,
    admin: 0,
  }
  for (const m of modes) {
    if (m.role in byRole) {
      byRole[m.role]++
    }
  }

  const activeMode =
    modes.length > 0
      ? modes.reduce((latest, m) => (m.updatedAt > latest.updatedAt ? m : latest), modes[0])
      : null

  return {
    totalModes: modes.length,
    byRole,
    activeMode,
  }
}
