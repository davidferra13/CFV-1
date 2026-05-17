'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ReadabilityMode,
  ReadabilityProfile,
  ReadabilityPreference,
  ReadabilitySummary,
} from './high-contrast-types'

function mapProfile(r: any): ReadabilityProfile {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    mode: r.mode as ReadabilityMode,
    label: r.label,
    bgColor: r.bg_color,
    textColor: r.text_color,
    accentColor: r.accent_color,
    contrastRatio: r.contrast_ratio ?? 0,
    fontSize: r.font_size,
    fontWeight: r.font_weight,
    reducedMotion: r.reduced_motion ?? false,
    increasedSpacing: r.increased_spacing ?? false,
    autoActivateCondition: r.auto_activate_condition
      ? (typeof r.auto_activate_condition === 'string'
          ? JSON.parse(r.auto_activate_condition)
          : r.auto_activate_condition)
      : null,
    createdAt: new Date(r.created_at),
  }
}

function mapPreference(r: any): ReadabilityPreference {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    activeMode: r.active_mode as ReadabilityMode,
    autoSwitch: r.auto_switch ?? false,
    scheduledModes: r.scheduled_modes
      ? (typeof r.scheduled_modes === 'string'
          ? JSON.parse(r.scheduled_modes)
          : r.scheduled_modes)
      : null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }
}

export async function getReadabilityProfiles(mode?: ReadabilityMode): Promise<ReadabilityProfile[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM readability_profiles WHERE tenant_id = $1'
  if (mode) {
    query += ' AND mode = $2'
    params.push(mode)
  }
  query += ' ORDER BY mode, label'
  const rows = await db.query(query, params)
  return rows.map(mapProfile)
}

export async function upsertReadabilityProfile(params: {
  mode: ReadabilityMode
  label: string
  bgColor: string
  textColor: string
  accentColor: string
  contrastRatio: number
  fontSize: string
  fontWeight: string
  reducedMotion?: boolean
  increasedSpacing?: boolean
  autoActivateCondition?: Record<string, unknown> | null
}): Promise<ReadabilityProfile> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO readability_profiles
       (tenant_id, mode, label, bg_color, text_color, accent_color, contrast_ratio,
        font_size, font_weight, reduced_motion, increased_spacing, auto_activate_condition)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (tenant_id, mode)
     DO UPDATE SET label = $3, bg_color = $4, text_color = $5, accent_color = $6,
       contrast_ratio = $7, font_size = $8, font_weight = $9, reduced_motion = $10,
       increased_spacing = $11, auto_activate_condition = $12
     RETURNING *`,
    [
      user.tenantId,
      params.mode,
      params.label,
      params.bgColor,
      params.textColor,
      params.accentColor,
      params.contrastRatio,
      params.fontSize,
      params.fontWeight,
      params.reducedMotion ?? false,
      params.increasedSpacing ?? false,
      params.autoActivateCondition ? JSON.stringify(params.autoActivateCondition) : null,
    ],
  )
  return mapProfile(rows[0])
}

export async function getReadabilityPreference(): Promise<ReadabilityPreference | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'SELECT * FROM readability_preferences WHERE tenant_id = $1',
    [user.tenantId],
  )
  if (!rows.length) return null
  return mapPreference(rows[0])
}

export async function updateReadabilityPreference(params: {
  activeMode: ReadabilityMode
  autoSwitch?: boolean
  scheduledModes?: Array<{ mode: ReadabilityMode; startTime: string; endTime: string }> | null
}): Promise<ReadabilityPreference> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO readability_preferences (tenant_id, active_mode, auto_switch, scheduled_modes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id)
     DO UPDATE SET active_mode = $2, auto_switch = $3, scheduled_modes = $4, updated_at = NOW()
     RETURNING *`,
    [
      user.tenantId,
      params.activeMode,
      params.autoSwitch ?? false,
      params.scheduledModes ? JSON.stringify(params.scheduledModes) : null,
    ],
  )
  return mapPreference(rows[0])
}

export async function deleteReadabilityProfile(id: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'DELETE FROM readability_profiles WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [id, user.tenantId],
  )
  return { success: rows.length > 0 }
}

export async function getReadabilitySummary(): Promise<ReadabilitySummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const profileRows = await db.query(
    'SELECT COUNT(*)::int as total FROM readability_profiles WHERE tenant_id = $1',
    [user.tenantId],
  )
  const prefRows = await db.query(
    'SELECT active_mode, auto_switch, scheduled_modes FROM readability_preferences WHERE tenant_id = $1',
    [user.tenantId],
  )
  const pref = prefRows[0] ?? null
  let scheduledCount = 0
  if (pref?.scheduled_modes) {
    const modes = typeof pref.scheduled_modes === 'string'
      ? JSON.parse(pref.scheduled_modes)
      : pref.scheduled_modes
    scheduledCount = Array.isArray(modes) ? modes.length : 0
  }
  return {
    totalProfiles: profileRows[0]?.total ?? 0,
    activeMode: pref ? (pref.active_mode as ReadabilityMode) : null,
    autoSwitchEnabled: pref?.auto_switch ?? false,
    scheduledCount,
  }
}
