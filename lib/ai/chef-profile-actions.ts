'use server'

// Chef Culinary Profile - Server Actions
// 12 structured Q&A questions that Remy reads to understand the chef deeply.
// Injected into Remy's system prompt as the CULINARY PROFILE section.

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { CULINARY_QUESTIONS } from '@/lib/ai/chef-profile-constants'
import type { CulinaryQuestionKey, CulinaryProfileAnswer } from '@/lib/ai/chef-profile-constants'

// Row shape from the new table (not yet in generated types)
interface CulinaryProfileRow {
  id: string
  chef_id: string
  question_key: string
  answer: string
  created_at: string
  updated_at: string
}

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Get the chef's full culinary profile (all 12 answers).
 * Returns all questions with their answers (empty string if unanswered).
 */
export async function getCulinaryProfile(): Promise<CulinaryProfileAnswer[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await (db
    .from('chef_culinary_profiles' as any)
    .select('question_key, answer')
    .eq('chef_id', user.entityId) as any)

  const rows = (data ?? []) as Array<{ question_key: string; answer: string }>
  const answerMap = new Map<string, string>()
  for (const row of rows) {
    answerMap.set(row.question_key, row.answer)
  }

  return CULINARY_QUESTIONS.map((q) => ({
    questionKey: q.key,
    question: q.question,
    answer: answerMap.get(q.key) ?? '',
  }))
}

/**
 * Save a single culinary profile answer (upsert).
 */
export async function saveCulinaryProfileAnswer(
  questionKey: string,
  answer: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Validate question key
  const valid = CULINARY_QUESTIONS.some((q) => q.key === questionKey)
  if (!valid) {
    return { success: false, error: `Invalid question key: ${questionKey}` }
  }

  const { error } = await (db.from('chef_culinary_profiles' as any).upsert(
    {
      chef_id: user.entityId,
      question_key: questionKey,
      answer: answer.trim(),
    },
    { onConflict: 'chef_id,question_key' }
  ) as any)

  if (error) {
    console.error('[culinary-profile] Save error:', error)
    return { success: false, error: (error as any).message }
  }

  return { success: true }
}

/**
 * Save all culinary profile answers at once (bulk upsert).
 */
export async function saveCulinaryProfileBulk(
  answers: Record<string, string>
): Promise<{ success: boolean; saved: number; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const rows = Object.entries(answers)
    .filter(([key]) => CULINARY_QUESTIONS.some((q) => q.key === key))
    .filter(([, value]) => value.trim().length > 0)
    .map(([key, value]) => ({
      chef_id: user.entityId,
      question_key: key,
      answer: value.trim(),
    }))

  if (rows.length === 0) {
    return { success: true, saved: 0 }
  }

  const { error } = await (db
    .from('chef_culinary_profiles' as any)
    .upsert(rows, { onConflict: 'chef_id,question_key' }) as any)

  if (error) {
    console.error('[culinary-profile] Bulk save error:', error)
    return { success: false, saved: 0, error: (error as any).message }
  }

  return { success: true, saved: rows.length }
}

/**
 * Get the culinary profile formatted for Remy's system prompt.
 * Returns null if no answers exist yet.
 */
export async function getCulinaryProfileForPrompt(chefId: string): Promise<string | null> {
  const db: any = createServerClient()

  const { data } = await (db
    .from('chef_culinary_profiles' as any)
    .select('question_key, answer')
    .eq('chef_id', chefId)
    .neq('answer', '') as any)

  const rows = (data ?? []) as Array<{ question_key: string; answer: string }>
  if (rows.length === 0) return null

  const questionMap = new Map<string, string>(CULINARY_QUESTIONS.map((q) => [q.key, q.question]))

  const lines = rows.map((row) => {
    const question = questionMap.get(row.question_key) ?? row.question_key
    return `Q: ${question}\nA: ${row.answer}`
  })

  return `## CULINARY PROFILE\n\nYou know the following about this chef's food identity:\n\n${lines.join('\n\n')}`
}
