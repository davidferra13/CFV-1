'use server'

// Remy Survey - Server actions for managing the "Get to Know You" conversational survey.
// Reads/writes the survey_state JSONB column on ai_preferences.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { addRemyMemoryManual } from '@/lib/ai/remy-memory-actions'
import { saveCulinaryProfileAnswer } from '@/lib/ai/chef-profile-actions'
import {
  createInitialSurveyState,
  getSurveyQuestion,
  getNextSurveyQuestion,
  SURVEY_TOTAL_QUESTIONS,
} from '@/lib/ai/remy-survey-constants'
import type { SurveyState } from '@/lib/ai/remy-survey-constants'

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getSurveyState(): Promise<SurveyState | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('ai_preferences')
    .select('survey_state')
    .eq('tenant_id', user.tenantId!)
    .single()

  return (data?.survey_state as SurveyState) ?? null
}

// ─── Start ───────────────────────────────────────────────────────────────────

export async function startSurvey(): Promise<{ success: boolean; state: SurveyState }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const state = createInitialSurveyState()

  const { error } = await db.from('ai_preferences').upsert(
    {
      tenant_id: tenantId,
      survey_state: state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' }
  )

  if (error) {
    console.error('[remy-survey] Failed to start survey:', error)
    return { success: false, state }
  }

  return { success: true, state }
}

// ─── Mark Intro Complete ─────────────────────────────────────────────────────

export async function completeIntro(): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Load current state
  const { data } = await db
    .from('ai_preferences')
    .select('survey_state')
    .eq('tenant_id', tenantId)
    .single()

  const state = (data?.survey_state as SurveyState) ?? createInitialSurveyState()
  state.introCompleted = true

  const { error } = await db.from('ai_preferences').upsert(
    {
      tenant_id: tenantId,
      survey_state: state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' }
  )

  if (error) {
    console.error('[remy-survey] Failed to complete intro:', error)
    return { success: false }
  }

  return { success: true }
}

// ─── Save Answer ─────────────────────────────────────────────────────────────

export async function saveSurveyAnswer(
  questionKey: string,
  extractedAnswer: string
): Promise<{ success: boolean; isComplete: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Load current state
  const { data } = await db
    .from('ai_preferences')
    .select('survey_state')
    .eq('tenant_id', tenantId)
    .single()

  const state = (data?.survey_state as SurveyState) ?? createInitialSurveyState()

  // Mark as answered
  if (!state.answered.includes(questionKey)) {
    state.answered.push(questionKey)
  }

  // Find the question definition for memory category + culinary mapping
  const [groupId, qIdx] = questionKey.split('_')
  const groupIndex = ['kitchen', 'business', 'workflow', 'communication', 'personal'].indexOf(
    groupId
  )
  const question = groupIndex >= 0 ? getSurveyQuestion(groupIndex, parseInt(qIdx, 10)) : null

  // Save as high-importance memory (non-blocking)
  if (question) {
    try {
      await addRemyMemoryManual({
        content: extractedAnswer,
        category: question.memoryCategory,
        importance: 8,
      })
    } catch (err) {
      console.error('[remy-survey] Memory save failed (non-blocking):', err)
    }

    // Backfill culinary profile if mapped
    if (question.culinaryProfileKey) {
      try {
        await saveCulinaryProfileAnswer(question.culinaryProfileKey, extractedAnswer)
      } catch (err) {
        console.error('[remy-survey] Culinary profile backfill failed (non-blocking):', err)
      }
    }
  }

  // Advance to next unanswered question
  const next = getNextSurveyQuestion(state)
  if (next) {
    state.currentGroup = next.groupIndex
    state.currentQuestion = next.questionIndex
  }

  const isComplete = state.answered.length + state.skipped.length >= SURVEY_TOTAL_QUESTIONS || !next
  if (isComplete) {
    state.status = 'completed'
    state.completedAt = new Date().toISOString()
  }

  // Persist
  const { error } = await db.from('ai_preferences').upsert(
    {
      tenant_id: tenantId,
      survey_state: state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' }
  )

  if (error) {
    console.error('[remy-survey] Failed to save answer:', error)
    return { success: false, isComplete: false }
  }

  return { success: true, isComplete }
}

// ─── Skip Question ───────────────────────────────────────────────────────────

export async function skipSurveyQuestion(
  questionKey: string
): Promise<{ success: boolean; isComplete: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data } = await db
    .from('ai_preferences')
    .select('survey_state')
    .eq('tenant_id', tenantId)
    .single()

  const state = (data?.survey_state as SurveyState) ?? createInitialSurveyState()

  if (!state.skipped.includes(questionKey)) {
    state.skipped.push(questionKey)
  }

  // Advance to next
  const next = getNextSurveyQuestion(state)
  if (next) {
    state.currentGroup = next.groupIndex
    state.currentQuestion = next.questionIndex
  }

  const isComplete = state.answered.length + state.skipped.length >= SURVEY_TOTAL_QUESTIONS || !next
  if (isComplete) {
    state.status = 'completed'
    state.completedAt = new Date().toISOString()
  }

  const { error } = await db.from('ai_preferences').upsert(
    {
      tenant_id: tenantId,
      survey_state: state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' }
  )

  if (error) {
    console.error('[remy-survey] Failed to skip question:', error)
    return { success: false, isComplete: false }
  }

  return { success: true, isComplete }
}
