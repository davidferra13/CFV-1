'use server'

// Beta Survey Actions
// Handles public (token-based) and authenticated survey submission,
// admin results, invite management, and CSV export.
// Tables: beta_survey_definitions, beta_survey_responses, beta_survey_invites

import { createAdminClient } from '@/lib/db/admin'
import { revalidateTag } from 'next/cache'
import { requireAuth } from '@/lib/auth/get-user'
import { requireAdmin } from '@/lib/auth/admin'
import { checkRateLimit } from '@/lib/rateLimit'
import { verifyTurnstileToken } from '@/lib/security/turnstile'
import { cookies, headers } from 'next/headers'
import { sendEmail } from '@/lib/email/send'
import { BetaSurveyInviteEmail } from '@/lib/email/templates/beta-survey-invite'
import type {
  BetaSurveyDefinition,
  BetaSurveyResponse,
  SurveyType,
  SurveyQuestion,
} from './survey-utils'
import { getBetaSurveyCompletionKey } from './survey-presence'
import { BETA_SURVEY_CACHE_TAG } from './survey-cache'
import {
  buildBetaSurveyAnswersWithMeta,
  computeBetaSurveyStats,
  extractFixedColumns,
  getDefaultRespondentRoleForSurveyType,
  getBetaSurveyResponseMeta,
} from './survey-utils'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

// ── In-memory IP rate limiting (same pattern as beta signups) ──
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60_000 * 5 // 5 minutes
const COMPLETION_MARKER_MAX_AGE_SECONDS = 60 * 60 * 24 * 180

type DbErrorLike = { code?: string; message?: string } | null | undefined
type PublicSubmissionMeta = {
  websiteUrl?: string
  captchaToken?: string
}

function isMissingBetaSurveyTableError(error: DbErrorLike): boolean {
  return error?.code === 'PGRST205' && /beta_survey_/i.test(error?.message ?? '')
}

function shouldLogBetaSurveyError(error: DbErrorLike): boolean {
  return !!error && !isMissingBetaSurveyTableError(error)
}

async function guardPublicSurveySubmission(
  meta?: PublicSubmissionMeta
): Promise<{ success: boolean; error?: string } | null> {
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  try {
    await checkRateLimit(`beta-survey-public:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)
  } catch {
    return { success: false, error: 'Too many submissions. Please try again later.' }
  }

  if (meta?.websiteUrl?.trim()) {
    return { success: true }
  }

  const turnstileResult = await verifyTurnstileToken(meta?.captchaToken || '', {
    ip,
    host: hdrs.get('host') || undefined,
  })
  if (!turnstileResult.success) {
    return { success: false, error: turnstileResult.error || 'CAPTCHA verification failed.' }
  }

  return null
}

function markSurveyCompletionInBrowser(surveySlug: string) {
  const cookieStore = cookies()
  cookieStore.set(getBetaSurveyCompletionKey(surveySlug), new Date().toISOString(), {
    path: '/',
    maxAge: COMPLETION_MARKER_MAX_AGE_SECONDS,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

// ─── Get Active Survey ──────────────────────────────────────────────────────

/**
 * Fetch the active survey definition for a given type.
 * Returns null if no active survey exists.
 */
export async function getActiveSurvey(type: SurveyType): Promise<BetaSurveyDefinition | null> {
  const db: any = createAdminClient()

  const { data, error } = await db
    .from('beta_survey_definitions')
    .select('*')
    .eq('survey_type', type)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    if (shouldLogBetaSurveyError(error)) {
      console.error('[getActiveSurvey]', error)
    }
    return null
  }

  if (!data) return null

  return {
    ...data,
    questions: (data.questions as unknown as SurveyQuestion[]) || [],
  } as BetaSurveyDefinition
}

/**
 * Fetch a survey definition by slug.
 */
export async function getSurveyBySlug(slug: string): Promise<BetaSurveyDefinition | null> {
  const db: any = createAdminClient()

  const { data, error } = await db
    .from('beta_survey_definitions')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    if (shouldLogBetaSurveyError(error)) {
      console.error('[getSurveyBySlug]', error)
    }
    return null
  }

  if (!data) return null

  return {
    ...data,
    questions: (data.questions as unknown as SurveyQuestion[]) || [],
  } as BetaSurveyDefinition
}

/**
 * Fetch a survey definition by slug for public share-link delivery.
 * Only active surveys are returned.
 */
export async function getPublicSurveyBySlug(slug: string): Promise<BetaSurveyDefinition | null> {
  const db: any = createAdminClient()

  const { data, error } = await db
    .from('beta_survey_definitions')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    if (shouldLogBetaSurveyError(error)) {
      console.error('[getPublicSurveyBySlug]', error)
    }
    return null
  }

  if (!data) return null

  return {
    ...data,
    questions: (data.questions as unknown as SurveyQuestion[]) || [],
  } as BetaSurveyDefinition
}

// ─── Get Survey by Invite Token ─────────────────────────────────────────────

/**
 * Validate an invite token and return the survey definition + invite info.
 * Used for external testers accessing /beta-survey/[token].
 */
export async function getSurveyByInviteToken(token: string): Promise<{
  survey: BetaSurveyDefinition
  invite: { id: string; name: string | null; email: string | null; role: string }
  alreadySubmitted: boolean
} | null> {
  const db: any = createAdminClient()

  const { data: invite, error } = await db
    .from('beta_survey_invites')
    .select('*, beta_survey_definitions(*)')
    .eq('token', token)
    .maybeSingle()

  if (error || !invite) {
    if (shouldLogBetaSurveyError(error)) {
      console.error('[getSurveyByInviteToken]', error)
    }
    return null
  }

  // Check expiry
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return null
  }

  const surveyDef = invite.beta_survey_definitions as any
  if (!surveyDef) return null

  // Mark as claimed if not already
  if (!invite.claimed_at) {
    await db
      .from('beta_survey_invites')
      .update({ claimed_at: new Date().toISOString() })
      .eq('id', invite.id)
  }

  // Check if already submitted
  const alreadySubmitted = invite.response_id !== null

  return {
    survey: {
      ...surveyDef,
      questions: (surveyDef.questions as SurveyQuestion[]) || [],
    },
    invite: {
      id: invite.id,
      name: invite.name,
      email: invite.email,
      role: invite.role,
    },
    alreadySubmitted,
  }
}

// ─── Submit (Authenticated) ─────────────────────────────────────────────────

/**
 * Submit a beta survey response for a logged-in user.
 * Idempotent - updates existing response if one exists.
 */
export async function submitBetaSurveyAuthenticated(
  surveySlug: string,
  answers: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  const db: any = createAdminClient()

  // Look up the survey
  const { data: survey } = await db
    .from('beta_survey_definitions')
    .select('id, slug, survey_type')
    .eq('slug', surveySlug)
    .maybeSingle()

  if (!survey) {
    return { success: false, error: 'Survey not found.' }
  }

  // Extract fixed columns from answers
  const fixed = extractFixedColumns(answers)

  // Derive respondent role from user_roles
  const { data: roleRow } = await db
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const respondentRole = roleRow?.role || 'tester'

  // Upsert - if the user already started a response, update it
  const { data: existing } = await db
    .from('beta_survey_responses')
    .select('id')
    .eq('survey_id', survey.id)
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await db
      .from('beta_survey_responses')
      .update({
        answers,
        ...fixed,
        respondent_role: respondentRole,
        respondent_name: null,
        respondent_email: user.email,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) {
      console.error('[submitBetaSurveyAuthenticated] update error', error)
      return { success: false, error: 'Failed to submit survey.' }
    }
  } else {
    const { error } = await db.from('beta_survey_responses').insert({
      survey_id: survey.id,
      auth_user_id: user.id,
      respondent_role: respondentRole,
      respondent_email: user.email,
      answers,
      ...fixed,
      submitted_at: new Date().toISOString(),
    })

    if (error) {
      console.error('[submitBetaSurveyAuthenticated] insert error', error)
      return { success: false, error: 'Failed to submit survey.' }
    }
  }

  markSurveyCompletionInBrowser(survey.slug)
  return { success: true }
}

// ─── Submit (Public / Token-Based) ──────────────────────────────────────────

/**
 * Submit a beta survey response from an external tester using an invite token.
 * IP rate-limited. Links the response to the invite.
 */
export async function submitBetaSurveyPublic(
  inviteToken: string,
  answers: Record<string, unknown>,
  meta: {
    name?: string
    email?: string
    source?: string
    channel?: string
    campaign?: string
    wave?: string
    launch?: string
    websiteUrl?: string
    captchaToken?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const guard = await guardPublicSurveySubmission(meta)
  if (guard) {
    return guard
  }

  const db: any = createAdminClient()

  // Validate invite
  const { data: invite } = await db
    .from('beta_survey_invites')
    .select('id, survey_id, role, response_id, expires_at')
    .eq('token', inviteToken)
    .maybeSingle()

  if (!invite) {
    return { success: false, error: 'Invalid survey link.' }
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { success: false, error: 'This survey link has expired.' }
  }

  if (invite.response_id) {
    return { success: false, error: 'This survey has already been submitted.' }
  }

  const enrichedAnswers = buildBetaSurveyAnswersWithMeta(answers, {
    source: meta.source,
    channel: meta.channel,
    campaign: meta.campaign,
    wave: meta.wave,
    launch: meta.launch,
  })
  const fixed = extractFixedColumns(enrichedAnswers)

  // Create the response
  const { data: response, error: insertError } = await db
    .from('beta_survey_responses')
    .insert({
      survey_id: invite.survey_id,
      respondent_role: invite.role,
      respondent_name: meta.name?.trim() || null,
      respondent_email: meta.email?.trim().toLowerCase() || null,
      answers: enrichedAnswers,
      ...fixed,
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !response) {
    console.error('[submitBetaSurveyPublic]', insertError)
    return { success: false, error: 'Failed to submit survey.' }
  }

  // Link response to invite
  await db
    .from('beta_survey_invites')
    .update({
      response_id: response.id,
      claimed_at: invite.response_id ? undefined : new Date().toISOString(),
    })
    .eq('id', invite.id)

  return { success: true }
}

/**
 * Submit a publicly shared anonymous survey by definition slug.
 * Used for shareable research links that do not require invite tokens.
 */
export async function submitBetaSurveyAnonymous(
  surveySlug: string,
  answers: Record<string, unknown>,
  meta?: {
    source?: string
    channel?: string
    campaign?: string
    wave?: string
    launch?: string
    respondentRole?: string
    websiteUrl?: string
    captchaToken?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const guard = await guardPublicSurveySubmission(meta)
  if (guard) {
    return guard
  }

  const db: any = createAdminClient()

  const { data: survey } = await db
    .from('beta_survey_definitions')
    .select('id, slug, survey_type')
    .eq('slug', surveySlug)
    .eq('is_active', true)
    .maybeSingle()

  if (!survey) {
    return { success: false, error: 'Survey not found.' }
  }

  const enrichedAnswers = buildBetaSurveyAnswersWithMeta(answers, {
    source: meta?.source,
    channel: meta?.channel,
    campaign: meta?.campaign,
    wave: meta?.wave,
    launch: meta?.launch,
    surveySlug: survey.slug,
    respondentRole: meta?.respondentRole,
  })
  const fixed = extractFixedColumns(enrichedAnswers)

  const { error } = await db.from('beta_survey_responses').insert({
    survey_id: survey.id,
    respondent_role:
      meta?.respondentRole || getDefaultRespondentRoleForSurveyType(survey.survey_type),
    answers: enrichedAnswers,
    ...fixed,
    submitted_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[submitBetaSurveyAnonymous]', error)
    return { success: false, error: 'Failed to submit survey.' }
  }

  markSurveyCompletionInBrowser(survey.slug)
  return { success: true }
}

// ─── Check My Status ────────────────────────────────────────────────────────

/**
 * Check if the current authenticated user has already submitted a response
 * for the active survey of the given type.
 */
export async function getMyBetaSurveyStatus(
  type: SurveyType
): Promise<{ hasSubmitted: boolean; surveySlug: string | null }> {
  try {
    const user = await requireAuth()
    const db: any = createAdminClient()

    // Get active survey for this type
    const { data: survey } = await db
      .from('beta_survey_definitions')
      .select('id, slug')
      .eq('survey_type', type)
      .eq('is_active', true)
      .maybeSingle()

    if (!survey) {
      return { hasSubmitted: false, surveySlug: null }
    }

    // Check if user has a submitted response
    const { data: response } = await db
      .from('beta_survey_responses')
      .select('submitted_at')
      .eq('survey_id', survey.id)
      .eq('auth_user_id', user.id)
      .maybeSingle()

    return {
      hasSubmitted: response?.submitted_at !== null && response?.submitted_at !== undefined,
      surveySlug: survey.slug,
    }
  } catch {
    return { hasSubmitted: false, surveySlug: null }
  }
}

// ─── Admin: Get Results ─────────────────────────────────────────────────────

/**
 * Get all responses for a survey with aggregated stats.
 * Admin only.
 */
export async function getBetaSurveyResults(surveyId: string) {
  await requireAdmin()
  const db: any = createAdminClient()

  const { data: responses, error } = await db
    .from('beta_survey_responses')
    .select('*')
    .eq('survey_id', surveyId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getBetaSurveyResults]', error)
    return { responses: [], stats: null }
  }

  const typed = (responses || []) as BetaSurveyResponse[]
  const stats = computeBetaSurveyStats(typed)

  return { responses: typed, stats }
}

/**
 * Get all survey definitions with response counts.
 * Admin only.
 */
export async function getAllBetaSurveys() {
  await requireAdmin()
  const db: any = createAdminClient()

  const { data: surveys, error } = await db
    .from('beta_survey_definitions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getAllBetaSurveys]', error)
    return []
  }

  // Get response counts per survey
  const result = await Promise.all(
    (surveys || []).map(async (s: any) => {
      const { count: totalCount } = await db
        .from('beta_survey_responses')
        .select('*', { count: 'exact', head: true })
        .eq('survey_id', s.id)

      const { count: submittedCount } = await db
        .from('beta_survey_responses')
        .select('*', { count: 'exact', head: true })
        .eq('survey_id', s.id)
        .not('submitted_at', 'is', null)

      return {
        ...s,
        questions: (s.questions as unknown as SurveyQuestion[]) || [],
        totalResponses: totalCount || 0,
        submittedResponses: submittedCount || 0,
      }
    })
  )

  return result
}

// ─── Admin: Create Invites ──────────────────────────────────────────────────

type InviteInput = {
  name?: string
  email?: string
  role?: 'chef' | 'client' | 'tester'
}

/**
 * Create invite tokens for external testers.
 * Optionally sends email with the survey link.
 * Admin only.
 */
export async function createBetaSurveyInvites(
  surveyId: string,
  invites: InviteInput[],
  sendEmails = false
): Promise<{ success: boolean; tokens: string[]; error?: string }> {
  await requireAdmin()
  const db: any = createAdminClient()

  // Get survey for context
  const { data: survey } = await db
    .from('beta_survey_definitions')
    .select('title, slug')
    .eq('id', surveyId)
    .single()

  if (!survey) {
    return { success: false, tokens: [], error: 'Survey not found.' }
  }

  const tokens: string[] = []

  for (const invite of invites) {
    const { data, error } = await db
      .from('beta_survey_invites')
      .insert({
        survey_id: surveyId,
        name: invite.name?.trim() || null,
        email: invite.email?.trim().toLowerCase() || null,
        role: invite.role || 'tester',
      })
      .select('token')
      .single()

    if (error) {
      console.error('[createBetaSurveyInvites]', error)
      continue
    }

    tokens.push(data.token)

    // Send email (non-blocking)
    if (sendEmails && invite.email) {
      try {
        const surveyUrl = `${APP_URL}/beta-survey/${data.token}`
        await sendEmail({
          to: invite.email,
          subject: `${survey.title} - We'd love your feedback`,
          react: BetaSurveyInviteEmail({
            name: invite.name || 'there',
            surveyTitle: survey.title,
            surveyUrl,
          }),
        })
      } catch (err) {
        console.error('[non-blocking] Survey invite email failed', err)
      }
    }
  }

  return { success: true, tokens }
}

// ─── Admin: Toggle Survey Active ────────────────────────────────────────────

/**
 * Toggle a survey definition's active status.
 * Deactivates other surveys of the same type when activating.
 * Admin only.
 */
export async function toggleBetaSurveyActive(
  surveyId: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const db: any = createAdminClient()
  let activeSurveyType: string | null = null
  let activeSurveySlug: string | null = null

  if (active) {
    // Get the survey type to deactivate others
    const { data: survey } = await db
      .from('beta_survey_definitions')
      .select('survey_type, slug')
      .eq('id', surveyId)
      .single()

    if (!survey) return { success: false, error: 'Survey not found.' }
    activeSurveyType = survey.survey_type
    activeSurveySlug = survey.slug

    // Deactivate other surveys of the same type
    await db
      .from('beta_survey_definitions')
      .update({ is_active: false })
      .eq('survey_type', survey.survey_type)
      .neq('id', surveyId)
  }

  const { error } = await db
    .from('beta_survey_definitions')
    .update({ is_active: active })
    .eq('id', surveyId)

  if (error) {
    console.error('[toggleBetaSurveyActive]', error)
    return { success: false, error: 'Failed to update survey.' }
  }

  if (!activeSurveyType || !activeSurveySlug) {
    const { data: survey } = await db
      .from('beta_survey_definitions')
      .select('survey_type, slug')
      .eq('id', surveyId)
      .single()

    activeSurveyType = survey?.survey_type ?? null
    activeSurveySlug = survey?.slug ?? null
  }

  revalidateTag(BETA_SURVEY_CACHE_TAG)
  revalidateTag(`${BETA_SURVEY_CACHE_TAG}-active`)

  if (activeSurveyType) {
    revalidateTag(`${BETA_SURVEY_CACHE_TAG}-active-${activeSurveyType}`)
  }

  revalidateTag(`${BETA_SURVEY_CACHE_TAG}-public`)

  if (activeSurveySlug) {
    revalidateTag(`${BETA_SURVEY_CACHE_TAG}-public-${activeSurveySlug}`)
  }

  return { success: true }
}

// ─── Admin: Export CSV ──────────────────────────────────────────────────────

/**
 * Export all responses for a survey as CSV.
 * Admin only.
 */
export async function exportBetaSurveyResultsCsv(
  surveyId: string
): Promise<{ success: boolean; csv?: string; error?: string }> {
  await requireAdmin()
  const db: any = createAdminClient()

  // Get survey definition for question labels
  const { data: survey } = await db
    .from('beta_survey_definitions')
    .select('questions')
    .eq('id', surveyId)
    .single()

  const questions = ((survey?.questions as unknown as SurveyQuestion[]) || []).sort(
    (a, b) => a.order - b.order
  )

  // Get all responses
  const { data: responses, error } = await db
    .from('beta_survey_responses')
    .select('*')
    .eq('survey_id', surveyId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[exportBetaSurveyResultsCsv]', error)
    return { success: false, error: 'Failed to export.' }
  }

  // Build CSV
  const headers = [
    'Submitted At',
    'Role',
    'Name',
    'Email',
    'Source',
    'Channel',
    'Campaign',
    'Wave',
    'Launch',
    'NPS Score',
    'Satisfaction',
    'Would Pay',
    'Tech Comfort',
    ...questions.map((q) => q.label),
  ]

  const rows: Array<Array<string | number | boolean | null>> = (responses || []).map((r: any) => {
    const answers = (r.answers as Record<string, unknown>) || {}
    const meta = getBetaSurveyResponseMeta(answers)
    return [
      r.submitted_at || 'In progress',
      r.respondent_role || '',
      r.respondent_name || '',
      r.respondent_email || '',
      meta.source ?? '',
      meta.channel ?? '',
      meta.campaign ?? '',
      meta.wave ?? '',
      meta.launch ?? '',
      r.nps_score ?? '',
      r.overall_satisfaction ?? '',
      r.would_pay === null ? '' : r.would_pay ? 'Yes' : 'No',
      r.tech_comfort ?? '',
      ...questions.map((q) => {
        const val = answers[q.id]
        if (Array.isArray(val)) return val.join('; ')
        if (val === null || val === undefined) return ''
        return String(val)
      }),
    ]
  })

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csv = [
    headers.map(escape).join(','),
    ...rows.map((r: Array<string | number | boolean | null>) =>
      r.map((v: string | number | boolean | null) => escape(String(v))).join(',')
    ),
  ].join('\n')

  return { success: true, csv }
}

// ─── Admin: Get Invites ─────────────────────────────────────────────────────

/**
 * Get all invites for a survey.
 * Admin only.
 */
export async function getBetaSurveyInvites(surveyId: string) {
  await requireAdmin()
  const db: any = createAdminClient()

  const { data, error } = await db
    .from('beta_survey_invites')
    .select('*')
    .eq('survey_id', surveyId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getBetaSurveyInvites]', error)
    return []
  }

  return data || []
}
