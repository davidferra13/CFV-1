// Seasonal Palette Server Actions
// CRUD for seasonal palettes — creative thesis, micro-windows, context profiles.
// Table added in migration 20260217000002_seasonal_palettes.sql.
// Type assertions used until types/database.ts is regenerated.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { SeasonalPalette } from './types'
import { DEFAULT_SEASONS } from './types'
import { getCurrentSeason } from './helpers'

// Type assertion helper — seasonal_palettes not in generated types until migration applied
function fromSeasonalPalettes(supabase: ReturnType<typeof createServerClient>): any {
  return (supabase as any).from('seasonal_palettes')
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const MicroWindowSchema = z.object({
  name: z.string().min(1, 'Name required'),
  ingredient: z.string().min(1, 'Ingredient required'),
  start_date: z.string().regex(/^\d{2}-\d{2}$/, 'Must be MM-DD format'),
  end_date: z.string().regex(/^\d{2}-\d{2}$/, 'Must be MM-DD format'),
  urgency: z.enum(['high', 'normal']),
  notes: z.string().default(''),
})

const ContextProfileSchema = z.object({
  name: z.string().min(1, 'Name required'),
  kitchen_reality: z.string().min(1, 'Kitchen reality required'),
  menu_guardrails: z.string().default(''),
  notes: z.string().default(''),
})

const ProvenWinSchema = z.object({
  dish_name: z.string().min(1, 'Dish name required'),
  notes: z.string().default(''),
  recipe_id: z.string().uuid().nullable().default(null),
})

const UpdatePaletteSchema = z.object({
  season_name: z.string().min(1).max(50),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  start_month_day: z.string().regex(/^\d{2}-\d{2}$/, 'Must be MM-DD format'),
  end_month_day: z.string().regex(/^\d{2}-\d{2}$/, 'Must be MM-DD format'),
  sensory_anchor: z.string().nullable().optional(),
  micro_windows: z.array(MicroWindowSchema).optional(),
  context_profiles: z.array(ContextProfileSchema).optional(),
  pantry_and_preserve: z.string().nullable().optional(),
  chef_energy_reality: z.string().nullable().optional(),
  proven_wins: z.array(ProvenWinSchema).optional(),
})

export type UpdatePaletteInput = z.infer<typeof UpdatePaletteSchema>

const CreatePaletteSchema = UpdatePaletteSchema

export type CreatePaletteInput = z.infer<typeof CreatePaletteSchema>

// ============================================
// QUERIES
// ============================================

/**
 * Get all seasonal palettes for the current chef.
 * Seeds default 4 seasons if none exist.
 */
export async function getSeasonalPalettes(): Promise<SeasonalPalette[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await fromSeasonalPalettes(supabase)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[getSeasonalPalettes] Error:', error)
    return []
  }

  if (!data || data.length === 0) {
    return await seedDefaultPalettes(user.tenantId!, user.id)
  }

  return (data as any[]).map(mapRowToPalette)
}

/**
 * Get a single palette by ID.
 */
export async function getSeasonalPaletteById(paletteId: string): Promise<SeasonalPalette | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await fromSeasonalPalettes(supabase)
    .select('*')
    .eq('id', paletteId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (error || !data) return null
  return mapRowToPalette(data as any)
}

/**
 * Get the currently active palette (for Recipe Library banner and Schedule sidebar).
 * Seeds defaults if no palettes exist, then resolves by:
 *   1. Explicit is_active flag
 *   2. Date-range auto-detection from current date
 */
export async function getActivePalette(): Promise<SeasonalPalette | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Try explicit is_active flag first
  const { data } = await fromSeasonalPalettes(supabase)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (data) return mapRowToPalette(data as any)

  // No explicit active — load all palettes
  const { data: all } = await fromSeasonalPalettes(supabase)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('sort_order', { ascending: true })

  let palettes: SeasonalPalette[]

  if (!all || all.length === 0) {
    // Seed defaults so the palette always shows on schedule/recipes
    palettes = await seedDefaultPalettes(user.tenantId!, user.id)
    if (palettes.length === 0) return null
  } else {
    palettes = (all as any[]).map(mapRowToPalette)
  }

  // Auto-detect current season from date ranges
  return getCurrentSeason(palettes)
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Update a seasonal palette.
 */
export async function updateSeasonalPalette(paletteId: string, input: UpdatePaletteInput) {
  const user = await requireChef()
  const validated = UpdatePaletteSchema.parse(input)
  const supabase = createServerClient()

  // If setting this palette as active, deactivate others first
  if (validated.is_active) {
    await fromSeasonalPalettes(supabase)
      .update({ is_active: false, updated_by: user.id })
      .eq('tenant_id', user.tenantId)
      .neq('id', paletteId)
  }

  const { error } = await fromSeasonalPalettes(supabase)
    .update({
      ...validated,
      updated_by: user.id,
    })
    .eq('id', paletteId)
    .eq('tenant_id', user.tenantId)

  if (error) {
    console.error('[updateSeasonalPalette] Error:', error)
    throw new Error('Failed to update seasonal palette')
  }

  revalidatePath('/settings/repertoire')
  revalidatePath('/recipes')
  revalidatePath('/schedule')
  return { success: true }
}

/**
 * Create a new seasonal palette (for custom seasons beyond default 4).
 */
export async function createSeasonalPalette(input: CreatePaletteInput) {
  const user = await requireChef()
  const validated = CreatePaletteSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await fromSeasonalPalettes(supabase)
    .insert({
      tenant_id: user.tenantId!,
      ...validated,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[createSeasonalPalette] Error:', error)
    throw new Error('Failed to create seasonal palette')
  }

  revalidatePath('/settings/repertoire')
  return { success: true, palette: mapRowToPalette(data as any) }
}

/**
 * Delete a seasonal palette.
 */
export async function deleteSeasonalPalette(paletteId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await fromSeasonalPalettes(supabase)
    .delete()
    .eq('id', paletteId)
    .eq('tenant_id', user.tenantId)

  if (error) {
    console.error('[deleteSeasonalPalette] Error:', error)
    throw new Error('Failed to delete seasonal palette')
  }

  revalidatePath('/settings/repertoire')
  return { success: true }
}

/**
 * Set a specific palette as the active season (deactivates all others).
 */
export async function setActiveSeason(paletteId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Deactivate all
  await fromSeasonalPalettes(supabase)
    .update({ is_active: false, updated_by: user.id })
    .eq('tenant_id', user.tenantId)

  // Activate selected
  const { error } = await fromSeasonalPalettes(supabase)
    .update({ is_active: true, updated_by: user.id })
    .eq('id', paletteId)
    .eq('tenant_id', user.tenantId)

  if (error) {
    console.error('[setActiveSeason] Error:', error)
    throw new Error('Failed to set active season')
  }

  revalidatePath('/settings/repertoire')
  revalidatePath('/recipes')
  revalidatePath('/schedule')
  return { success: true }
}

// ============================================
// INTERNAL HELPERS
// ============================================

async function seedDefaultPalettes(tenantId: string, userId: string): Promise<SeasonalPalette[]> {
  const supabase = createServerClient()

  const rows = DEFAULT_SEASONS.map(s => ({
    tenant_id: tenantId,
    ...s,
    created_by: userId,
    updated_by: userId,
  }))

  const { data, error } = await fromSeasonalPalettes(supabase)
    .insert(rows)
    .select()

  if (error) {
    console.error('[seedDefaultPalettes] Error:', error)
    return []
  }

  return (data as any[]).map(mapRowToPalette)
}

function mapRowToPalette(row: Record<string, unknown>): SeasonalPalette {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    season_name: row.season_name as string,
    sort_order: (row.sort_order as number) ?? 0,
    is_active: (row.is_active as boolean) ?? false,
    start_month_day: row.start_month_day as string,
    end_month_day: row.end_month_day as string,
    sensory_anchor: (row.sensory_anchor as string) ?? null,
    micro_windows: (row.micro_windows as any[]) ?? [],
    context_profiles: (row.context_profiles as any[]) ?? [],
    pantry_and_preserve: (row.pantry_and_preserve as string) ?? null,
    chef_energy_reality: (row.chef_energy_reality as string) ?? null,
    proven_wins: (row.proven_wins as any[]) ?? [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}
