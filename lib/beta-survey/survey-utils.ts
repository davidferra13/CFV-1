// Beta Survey utility types and pure helper functions.
// This file has NO 'use server' directive - pure computation only.
// Imported by both actions.ts and UI components.

// ─── Question Definition Types ─────────────────────────────────────────────────

export type QuestionType =
  | 'single_select'
  | 'multi_select'
  | 'textarea'
  | 'rating_scale'
  | 'nps'
  | 'yes_no'
  | 'number'

export type SurveyQuestion = {
  id: string
  type: QuestionType
  label: string
  options?: string[]
  required: boolean
  order: number
  placeholder?: string
  min?: number
  max?: number
  min_label?: string
  max_label?: string
}

export type SurveyType = 'pre_beta' | 'post_beta'

// ─── Survey Definition ─────────────────────────────────────────────────────────

export type BetaSurveyDefinition = {
  id: string
  slug: string
  title: string
  description: string | null
  survey_type: SurveyType
  questions: SurveyQuestion[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Response Types ────────────────────────────────────────────────────────────

export type BetaSurveyResponse = {
  id: string
  survey_id: string
  auth_user_id: string | null
  token: string
  respondent_role: string | null
  respondent_name: string | null
  respondent_email: string | null
  nps_score: number | null
  overall_satisfaction: number | null
  would_pay: boolean | null
  tech_comfort: number | null
  answers: Record<string, unknown>
  started_at: string
  submitted_at: string | null
  created_at: string
}

export type BetaSurveyInvite = {
  id: string
  survey_id: string
  token: string
  name: string | null
  email: string | null
  role: string
  claimed_at: string | null
  response_id: string | null
  expires_at: string | null
  created_at: string
}

// ─── Survey Stats ──────────────────────────────────────────────────────────────

export type BetaSurveyStats = {
  total: number
  submitted: number
  completionRate: number
  nps: {
    score: number // -100 to +100
    promoters: number // 9-10
    passives: number // 7-8
    detractors: number // 0-6
  } | null
  avgSatisfaction: number | null
  avgTechComfort: number | null
  wouldPayYes: number
  wouldPayNo: number
  roleBreakdown: Record<string, number>
}

// ─── Fixed Column Extraction ───────────────────────────────────────────────────

/**
 * Extract the fixed metric columns from a JSONB answers object.
 * These get stored in dedicated columns for fast SQL aggregation.
 */
export function extractFixedColumns(answers: Record<string, unknown>) {
  const result: {
    nps_score: number | null
    overall_satisfaction: number | null
    would_pay: boolean | null
    tech_comfort: number | null
  } = {
    nps_score: null,
    overall_satisfaction: null,
    would_pay: null,
    tech_comfort: null,
  }

  // NPS score (0-10)
  if (typeof answers.nps_score === 'number' && answers.nps_score >= 0 && answers.nps_score <= 10) {
    result.nps_score = answers.nps_score
  }

  // Overall satisfaction (1-10)
  if (
    typeof answers.overall_satisfaction === 'number' &&
    answers.overall_satisfaction >= 1 &&
    answers.overall_satisfaction <= 10
  ) {
    result.overall_satisfaction = answers.overall_satisfaction
  }

  // Would pay - derive from text answer
  if (typeof answers.would_pay === 'string') {
    const lower = answers.would_pay.toLowerCase()
    if (lower.includes('yes') || lower.includes('definitely')) {
      result.would_pay = true
    } else if (lower.includes('no') || lower.includes('probably not')) {
      result.would_pay = false
    }
    // "Maybe" stays null - neither yes nor no
  } else if (typeof answers.would_pay === 'boolean') {
    result.would_pay = answers.would_pay
  }

  // Tech comfort (1-5)
  if (
    typeof answers.tech_comfort === 'number' &&
    answers.tech_comfort >= 1 &&
    answers.tech_comfort <= 5
  ) {
    result.tech_comfort = answers.tech_comfort
  }

  return result
}

// ─── Stats Computation ─────────────────────────────────────────────────────────

/**
 * Compute aggregated stats across a set of beta survey responses.
 * Pure synchronous function - no DB calls.
 */
export function computeBetaSurveyStats(responses: BetaSurveyResponse[]): BetaSurveyStats {
  const submitted = responses.filter((r) => r.submitted_at !== null)

  function avg(vals: (number | null)[]): number | null {
    const valid = vals.filter((v): v is number => v !== null)
    if (valid.length === 0) return null
    return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10
  }

  // NPS calculation: (% promoters - % detractors) * 100 → range -100 to +100
  const npsScores = submitted.map((r) => r.nps_score).filter((v): v is number => v !== null)
  let nps: BetaSurveyStats['nps'] = null
  if (npsScores.length > 0) {
    const promoters = npsScores.filter((s) => s >= 9).length
    const passives = npsScores.filter((s) => s >= 7 && s <= 8).length
    const detractors = npsScores.filter((s) => s <= 6).length
    const total = npsScores.length
    nps = {
      score: Math.round(((promoters - detractors) / total) * 100),
      promoters,
      passives,
      detractors,
    }
  }

  // Role breakdown
  const roleBreakdown: Record<string, number> = {}
  for (const r of submitted) {
    const role = r.respondent_role || 'unknown'
    roleBreakdown[role] = (roleBreakdown[role] || 0) + 1
  }

  // Would pay counts
  const wouldPayYes = submitted.filter((r) => r.would_pay === true).length
  const wouldPayNo = submitted.filter((r) => r.would_pay === false).length

  return {
    total: responses.length,
    submitted: submitted.length,
    completionRate:
      responses.length > 0 ? Math.round((submitted.length / responses.length) * 100) : 0,
    nps,
    avgSatisfaction: avg(submitted.map((r) => r.overall_satisfaction)),
    avgTechComfort: avg(submitted.map((r) => r.tech_comfort)),
    wouldPayYes,
    wouldPayNo,
    roleBreakdown,
  }
}

// ─── Question Grouping for Multi-Step Forms ────────────────────────────────────

/** Pre-beta survey step groupings */
export const PRE_BETA_STEPS = [
  { label: 'About You', questionIds: ['role', 'heard_about'] },
  { label: 'Current Workflow', questionIds: ['current_workflow', 'pain_points'] },
  { label: 'Expectations', questionIds: ['hopes'] },
  { label: 'Tech & Pricing', questionIds: ['tech_comfort', 'would_pay'] },
]

/** Post-beta survey step groupings */
export const POST_BETA_STEPS = [
  { label: 'Overall Experience', questionIds: ['nps_score', 'overall_satisfaction'] },
  {
    label: 'Feature Feedback',
    questionIds: ['features_used', 'broken_confusing', 'missing_features'],
  },
  { label: 'Pricing', questionIds: ['would_pay', 'price_range', 'worth_paying_for'] },
  {
    label: 'Open Feedback',
    questionIds: ['would_recommend', 'best_thing', 'worst_thing', 'one_wish'],
  },
]

/**
 * Get the step groupings for a survey type.
 * Falls back to one step per question if no predefined grouping exists.
 */
export function getStepsForSurvey(
  surveyType: SurveyType,
  questions: SurveyQuestion[]
): { label: string; questionIds: string[] }[] {
  const predefined = surveyType === 'pre_beta' ? PRE_BETA_STEPS : POST_BETA_STEPS

  // Validate that all question IDs in the grouping actually exist
  const questionIds = new Set(questions.map((q) => q.id))
  const validSteps = predefined
    .map((step) => ({
      ...step,
      questionIds: step.questionIds.filter((id) => questionIds.has(id)),
    }))
    .filter((step) => step.questionIds.length > 0)

  if (validSteps.length > 0) return validSteps

  // Fallback: one step per question
  return questions.map((q) => ({ label: q.label, questionIds: [q.id] }))
}
