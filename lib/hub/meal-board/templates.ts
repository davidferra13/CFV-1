'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import { upsertMealEntry } from './board-crud'
import type { MealTemplate } from './contracts'
import type { GroupAccessInput } from './shared'
import {
  hasManagerAccess,
  liso as _liso,
  normalizeGroupAccessInput,
  parseDateLocal as _parseDateLocal,
  requireChefOrAdmin,
  resolveProfile,
} from './shared'

const SaveTemplateSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  weekStart: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
})

export async function saveWeekAsTemplate(
  input: z.infer<typeof SaveTemplateSchema>
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    const validated = SaveTemplateSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const profile = await resolveProfile(db, validated.profileToken)
    await requireChefOrAdmin(db, validated.groupId, profile.id)

    // Get week entries
    const _wk = _parseDateLocal(validated.weekStart as string)
    const weekEndStr = _liso(new Date(_wk.getFullYear(), _wk.getMonth(), _wk.getDate() + 6))

    const { data: entries } = await db
      .from('hub_meal_board')
      .select('*')
      .eq('group_id', validated.groupId)
      .gte('meal_date', validated.weekStart)
      .lte('meal_date', weekEndStr)
      .neq('status', 'cancelled')

    if (!entries || entries.length === 0) {
      return { success: false, error: 'No meals to save as template' }
    }

    // Convert to template format (day offsets from Monday)
    const mondayDate = new Date(validated.weekStart)
    const templateEntries = entries.map((e: any) => {
      const entryDate = new Date(e.meal_date)
      const dayOffset = Math.round(
        (entryDate.getTime() - mondayDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        dayOffset,
        mealType: e.meal_type,
        title: e.title,
        description: e.description,
        dietaryTags: e.dietary_tags,
        allergenFlags: e.allergen_flags,
        headCount: e.head_count,
        prepNotes: e.prep_notes,
        servingTime: e.serving_time,
      }
    })

    const { data, error } = await db
      .from('hub_meal_templates')
      .insert({
        group_id: validated.groupId,
        created_by_profile_id: profile.id,
        name: validated.name,
        description: validated.description ?? null,
        entries: templateEntries,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    return { success: true, templateId: data.id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Get templates for a group
// ---------------------------------------------------------------------------

export async function getTemplates(input: string | GroupAccessInput): Promise<MealTemplate[]> {
  const { groupId, profileToken } = normalizeGroupAccessInput(input)
  const db: any = createServerClient({ admin: true })
  if (!(await hasManagerAccess(db, groupId, profileToken))) return []

  const { data, error } = await db
    .from('hub_meal_templates')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load templates: ${error.message}`)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Load template onto a target week
// ---------------------------------------------------------------------------

const LoadTemplateSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  templateId: z.string().uuid(),
  targetWeekStart: z.string(),
})

export async function loadTemplate(
  input: z.infer<typeof LoadTemplateSchema>
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const validated = LoadTemplateSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const profile = await resolveProfile(db, validated.profileToken)
    await requireChefOrAdmin(db, validated.groupId, profile.id)

    // Get template
    const { data: template } = await db
      .from('hub_meal_templates')
      .select('*')
      .eq('id', validated.templateId)
      .eq('group_id', validated.groupId)
      .single()

    if (!template) throw new Error('Template not found')

    const entries = template.entries as any[]
    if (!entries || entries.length === 0) {
      return { success: false, error: 'Template has no entries' }
    }

    // Map day offsets to actual dates and upsert individually (preserves all fields)
    const _tm = _parseDateLocal(validated.targetWeekStart as string)
    let loadedCount = 0
    for (const e of entries) {
      const result = await upsertMealEntry({
        groupId: validated.groupId,
        profileToken: validated.profileToken,
        mealDate: _liso(
          new Date(_tm.getFullYear(), _tm.getMonth(), _tm.getDate() + (e.dayOffset ?? 0))
        ),
        mealType: e.mealType,
        title: e.title,
        description: e.description,
        dietaryTags: e.dietaryTags,
        allergenFlags: e.allergenFlags,
        headCount: e.headCount ?? undefined,
        prepNotes: e.prepNotes ?? undefined,
        servingTime: e.servingTime ?? undefined,
      })
      if (result.success) loadedCount++
    }
    return { success: true, count: loadedCount }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Delete a template
// ---------------------------------------------------------------------------

const DeleteTemplateSchema = z.object({
  templateId: z.string().uuid(),
  profileToken: z.string().uuid(),
})

export async function deleteTemplate(
  input: z.infer<typeof DeleteTemplateSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = DeleteTemplateSchema.parse(input)
    const db: any = createServerClient({ admin: true })

    const profile = await resolveProfile(db, validated.profileToken)

    // Verify the template exists and belongs to this user
    const { data: template } = await db
      .from('hub_meal_templates')
      .select('created_by_profile_id')
      .eq('id', validated.templateId)
      .single()

    if (!template) throw new Error('Template not found')
    if (template.created_by_profile_id !== profile.id) {
      throw new Error('Not your template')
    }

    const { error } = await db.from('hub_meal_templates').delete().eq('id', validated.templateId)

    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
