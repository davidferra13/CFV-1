'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// PROFESSIONAL ACHIEVEMENTS
// ============================================

const ACHIEVE_TYPES = [
  'competition',
  'stage',
  'trail',
  'press_feature',
  'award',
  'speaking',
  'certification',
  'course',
  'book',
  'podcast',
  'other',
] as const

// NOTE: ACHIEVE_TYPE_LABELS has been moved to './constants' — import from there instead.

const AchievementSchema = z.object({
  achieve_type: z.enum(ACHIEVE_TYPES).default('other'),
  title: z.string().min(1, 'Title is required'),
  organization: z.string().optional(),
  achieve_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  description: z.string().optional(),
  outcome: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  image_url: z.string().url().optional().or(z.literal('')),
  is_public: z.boolean().default(false),
})

export type AchievementInput = z.infer<typeof AchievementSchema>

export async function createAchievement(input: AchievementInput) {
  const chef = await requireChef()
  await requirePro('professional')
  const supabase = await createServerClient()
  const data = AchievementSchema.parse(input)

  const { error } = await supabase.from('professional_achievements').insert({
    ...data,
    chef_id: chef.id,
    achieve_date: data.achieve_date ?? null,
    url: data.url || null,
    image_url: data.image_url || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/settings/professional')
}

export async function updateAchievement(id: string, input: AchievementInput) {
  const chef = await requireChef()
  await requirePro('professional')
  const supabase = await createServerClient()
  const data = AchievementSchema.parse(input)

  const { error } = await supabase
    .from('professional_achievements')
    .update({
      ...data,
      achieve_date: data.achieve_date ?? null,
      url: data.url || null,
      image_url: data.image_url || null,
    })
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/professional')
}

export async function deleteAchievement(id: string) {
  const chef = await requireChef()
  await requirePro('professional')
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('professional_achievements')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/professional')
}

export async function listAchievements(publicOnly = false) {
  const chef = await requireChef()
  await requirePro('professional')
  const supabase = await createServerClient()

  let q = supabase
    .from('professional_achievements')
    .select('*')
    .eq('chef_id', chef.id)
    .order('achieve_date', { ascending: false, nullsFirst: false })

  if (publicOnly) q = q.eq('is_public', true)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

// ============================================
// LEARNING GOALS
// ============================================

const GOAL_CATEGORIES = [
  'technique',
  'cuisine',
  'business',
  'sustainability',
  'pastry',
  'beverage',
  'nutrition',
  'other',
] as const

// NOTE: GOAL_CATEGORY_LABELS has been moved to './constants' — import from there instead.

const LearningGoalSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  target_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  category: z.enum(GOAL_CATEGORIES).default('technique'),
  status: z.enum(['active', 'completed', 'abandoned']).default('active'),
  notes: z.string().optional(),
})

export type LearningGoalInput = z.infer<typeof LearningGoalSchema>

export async function createLearningGoal(input: LearningGoalInput) {
  const chef = await requireChef()
  await requirePro('professional')
  const supabase = await createServerClient()
  const data = LearningGoalSchema.parse(input)

  const { error } = await supabase.from('learning_goals').insert({
    ...data,
    chef_id: chef.id,
    target_date: data.target_date ?? null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/settings/professional')
}

export async function completeLearningGoal(id: string, notes?: string) {
  const chef = await requireChef()
  await requirePro('professional')
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('learning_goals')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/professional')
}

export async function updateLearningGoal(id: string, input: Partial<LearningGoalInput>) {
  const chef = await requireChef()
  await requirePro('professional')
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('learning_goals')
    .update(input)
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/professional')
}

export async function deleteLearningGoal(id: string) {
  const chef = await requireChef()
  await requirePro('professional')
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('learning_goals')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/professional')
}

export async function listLearningGoals(status?: 'active' | 'completed' | 'abandoned') {
  const chef = await requireChef()
  await requirePro('professional')
  const supabase = await createServerClient()

  let q = supabase
    .from('learning_goals')
    .select('*')
    .eq('chef_id', chef.id)
    .order('target_date', { ascending: true, nullsFirst: false })

  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}
