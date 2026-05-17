'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  CulinaryIcon,
  CulinaryColorPalette,
  CulinaryVisualToken,
  CulinaryVisualCategory,
} from './culinary-visual-types'

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

export async function getCulinaryIcons(
  category?: CulinaryVisualCategory,
): Promise<CulinaryIcon[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('culinary_icons')
    .select('id, name, category, svg_path, emoji, description')
    .eq('tenant_id', user.tenantId)
    .order('name')

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message ?? 'Failed to load culinary icons')

  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    svgPath: r.svg_path,
    emoji: r.emoji,
    description: r.description,
  }))
}

export async function upsertCulinaryIcon(
  name: string,
  category: CulinaryVisualCategory,
  svgPath?: string,
  emoji?: string,
  description?: string,
): Promise<CulinaryIcon> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check for existing icon with same name + category for this tenant
  const { data: existing } = await db
    .from('culinary_icons')
    .select('id')
    .eq('tenant_id', user.tenantId)
    .eq('name', name)
    .eq('category', category)
    .limit(1)

  const row = {
    tenant_id: user.tenantId,
    name,
    category,
    svg_path: svgPath ?? null,
    emoji: emoji ?? null,
    description: description ?? null,
  }

  let result: any
  if (existing && existing.length > 0) {
    const { data, error } = await db
      .from('culinary_icons')
      .update(row)
      .eq('id', existing[0].id)
      .select('id, name, category, svg_path, emoji, description')
    if (error) throw new Error(error.message ?? 'Failed to update culinary icon')
    result = data?.[0]
  } else {
    const { data, error } = await db
      .from('culinary_icons')
      .insert(row)
      .select('id, name, category, svg_path, emoji, description')
    if (error) throw new Error(error.message ?? 'Failed to create culinary icon')
    result = data?.[0]
  }

  if (!result) throw new Error('No icon returned after upsert')

  return {
    id: result.id,
    name: result.name,
    category: result.category,
    svgPath: result.svg_path,
    emoji: result.emoji,
    description: result.description,
  }
}

// ---------------------------------------------------------------------------
// Color Palettes
// ---------------------------------------------------------------------------

export async function getCulinaryPalettes(): Promise<CulinaryColorPalette[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('culinary_color_palettes')
    .select(
      'id, tenant_id, name, cuisine, primary_color, secondary_color, accent_color, text_color, bg_color',
    )
    .eq('tenant_id', user.tenantId)
    .order('name')

  if (error) throw new Error(error.message ?? 'Failed to load culinary palettes')

  return (data ?? []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    cuisine: r.cuisine,
    primaryColor: r.primary_color,
    secondaryColor: r.secondary_color,
    accentColor: r.accent_color,
    textColor: r.text_color,
    bgColor: r.bg_color,
  }))
}

export async function upsertCulinaryPalette(
  name: string,
  cuisine: string | undefined,
  primaryColor: string,
  secondaryColor?: string,
  accentColor?: string,
  textColor?: string,
  bgColor?: string,
): Promise<CulinaryColorPalette> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check for existing palette with same name for this tenant
  const { data: existing } = await db
    .from('culinary_color_palettes')
    .select('id')
    .eq('tenant_id', user.tenantId)
    .eq('name', name)
    .limit(1)

  const row = {
    tenant_id: user.tenantId,
    name,
    cuisine: cuisine ?? null,
    primary_color: primaryColor,
    secondary_color: secondaryColor ?? null,
    accent_color: accentColor ?? null,
    text_color: textColor ?? null,
    bg_color: bgColor ?? null,
  }

  let result: any
  if (existing && existing.length > 0) {
    const { data, error } = await db
      .from('culinary_color_palettes')
      .update(row)
      .eq('id', existing[0].id)
      .select(
        'id, tenant_id, name, cuisine, primary_color, secondary_color, accent_color, text_color, bg_color',
      )
    if (error) throw new Error(error.message ?? 'Failed to update culinary palette')
    result = data?.[0]
  } else {
    const { data, error } = await db
      .from('culinary_color_palettes')
      .insert(row)
      .select(
        'id, tenant_id, name, cuisine, primary_color, secondary_color, accent_color, text_color, bg_color',
      )
    if (error) throw new Error(error.message ?? 'Failed to create culinary palette')
    result = data?.[0]
  }

  if (!result) throw new Error('No palette returned after upsert')

  return {
    id: result.id,
    tenantId: result.tenant_id,
    name: result.name,
    cuisine: result.cuisine,
    primaryColor: result.primary_color,
    secondaryColor: result.secondary_color,
    accentColor: result.accent_color,
    textColor: result.text_color,
    bgColor: result.bg_color,
  }
}

// ---------------------------------------------------------------------------
// Visual Tokens
// ---------------------------------------------------------------------------

export async function getCulinaryVisualTokens(
  category?: CulinaryVisualCategory,
): Promise<CulinaryVisualToken[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('culinary_visual_tokens')
    .select('id, tenant_id, category, key, value, description, created_at')
    .eq('tenant_id', user.tenantId)
    .order('category')
    .order('key')

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message ?? 'Failed to load culinary visual tokens')

  return (data ?? []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    category: r.category,
    key: r.key,
    value: r.value,
    description: r.description,
    createdAt: new Date(r.created_at),
  }))
}

export async function upsertCulinaryToken(
  category: CulinaryVisualCategory,
  key: string,
  value: string,
  description?: string,
): Promise<CulinaryVisualToken> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Unique index on (tenant_id, category, key), so check for existing
  const { data: existing } = await db
    .from('culinary_visual_tokens')
    .select('id')
    .eq('tenant_id', user.tenantId)
    .eq('category', category)
    .eq('key', key)
    .limit(1)

  const row = {
    tenant_id: user.tenantId,
    category,
    key,
    value,
    description: description ?? null,
  }

  let result: any
  if (existing && existing.length > 0) {
    const { data, error } = await db
      .from('culinary_visual_tokens')
      .update(row)
      .eq('id', existing[0].id)
      .select('id, tenant_id, category, key, value, description, created_at')
    if (error) throw new Error(error.message ?? 'Failed to update culinary visual token')
    result = data?.[0]
  } else {
    const { data, error } = await db
      .from('culinary_visual_tokens')
      .insert(row)
      .select('id, tenant_id, category, key, value, description, created_at')
    if (error) throw new Error(error.message ?? 'Failed to create culinary visual token')
    result = data?.[0]
  }

  if (!result) throw new Error('No token returned after upsert')

  return {
    id: result.id,
    tenantId: result.tenant_id,
    category: result.category,
    key: result.key,
    value: result.value,
    description: result.description,
    createdAt: new Date(result.created_at),
  }
}
