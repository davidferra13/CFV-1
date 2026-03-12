'use server'

import { headers } from 'next/headers'
import { requireAdmin } from '@/lib/auth/admin'
import { createNotification } from '@/lib/notifications/actions'
import { sendEmail } from '@/lib/email/send'
import { BetaSignupAdminEmail } from '@/lib/email/templates/beta-signup-admin'
import { getAdminNotificationRecipients, resolveOwnerIdentity } from '@/lib/platform/owner-account'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBetaLifecycleEmail } from './lifecycle-email'
import {
  getBetaOnboardingProgressForChef,
  type BetaOnboardingProgressSnapshot,
  type BetaSignupLifecycleEmailType,
  type BetaSignupRecord,
  type BetaSignupTrackerRow,
  upsertBetaSignupTracker,
} from './signup-tracker'

export interface BetaSignupInput {
  name: string
  email: string
  phone?: string
  businessName?: string
  cuisineType?: string
  yearsInBusiness?: string
  referralSource?: string
  website?: string
}

type BetaOnboardingLinkInput = {
  email: string
  name?: string
  source?: string
  chefId?: string
  authUserId?: string
}

export type BetaSignupStatus = 'pending' | 'invited' | 'onboarded' | 'declined'

type UpdateBetaSignupStatusOptions = {
  sendStatusEmail?: boolean
  refreshStatusTimestamp?: boolean
}

export type UpdateBetaSignupStatusResult = {
  success: boolean
  error?: string
  message?: string
  updated?: {
    status: BetaSignupStatus
    notes: string | null
    invitedAt: string | null
    onboardedAt: string | null
    tracker: BetaSignupTrackerRow | null
  }
}

export type BetaOnboardingSyncResult = {
  matched: boolean
  signup: BetaSignupRecord | null
  tracker: BetaSignupTrackerRow | null
  onboardingProgress: BetaOnboardingProgressSnapshot | null
}

export type BetaSignupAdminRow = BetaSignupRecord & {
  tracker: BetaSignupTrackerRow | null
}

const ADMIN_NOTIFICATION_RECIPIENTS = getAdminNotificationRecipients()
const ADMIN_SIGNUP_SELECT = '*, beta_signup_trackers(*)'

const ipBuckets = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60_000 * 5

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const bucket = ipBuckets.get(ip)
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipBuckets.set(ip, { count: 1, windowStart: now })
    return true
  }

  bucket.count += 1
  if (bucket.count % 50 === 0) {
    for (const [key, value] of ipBuckets) {
      if (now - value.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
        ipBuckets.delete(key)
      }
    }
  }

  return bucket.count <= RATE_LIMIT_MAX
}

function normalizeSignupTracker(row: any): BetaSignupTrackerRow | null {
  if (!row) return null
  if (Array.isArray(row)) return (row[0] as BetaSignupTrackerRow) ?? null
  return row as BetaSignupTrackerRow
}

function normalizeBetaSignupAdminRow(row: any): BetaSignupAdminRow {
  return {
    ...(row as BetaSignupRecord),
    tracker: normalizeSignupTracker(row?.beta_signup_trackers),
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function buildLifecycleEmailMessage(emailType: BetaSignupLifecycleEmailType): string {
  switch (emailType) {
    case 'pending_review':
      return 'Pending review email sent.'
    case 'invited':
      return 'Invite email sent.'
    case 'declined':
      return 'Decline email sent.'
    case 'account_ready':
      return 'Account ready email sent.'
    case 'onboarding_reminder':
      return 'Onboarding reminder sent.'
    case 'onboarding_complete':
      return 'Completion email sent.'
    default:
      return 'Lifecycle email sent.'
  }
}

function mapStatusToEmailType(status: BetaSignupStatus): BetaSignupLifecycleEmailType | null {
  switch (status) {
    case 'pending':
      return 'pending_review'
    case 'invited':
      return 'invited'
    case 'declined':
      return 'declined'
    default:
      return null
  }
}

function buildSignupPayload(input: BetaSignupInput) {
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    business_name: input.businessName?.trim() || null,
    cuisine_type: input.cuisineType?.trim() || null,
    years_in_business: input.yearsInBusiness?.trim() || null,
    referral_source: input.referralSource?.trim() || null,
  }
}

async function fetchAdminSignupRowById(
  supabase: any,
  id: string
): Promise<BetaSignupAdminRow | null> {
  const { data, error } = await supabase
    .from('beta_signups')
    .select(ADMIN_SIGNUP_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return normalizeBetaSignupAdminRow(data)
}

async function fetchAdminSignupRowByEmail(
  supabase: any,
  email: string
): Promise<BetaSignupAdminRow | null> {
  const { data, error } = await supabase
    .from('beta_signups')
    .select(ADMIN_SIGNUP_SELECT)
    .eq('email', email)
    .maybeSingle()

  if (error || !data) return null
  return normalizeBetaSignupAdminRow(data)
}

async function updateTrackerForSignup({
  supabase,
  signup,
  existingTracker,
  emailType = null,
  sentAt,
  chefId,
  authUserId,
  accountCreatedAt,
  forceCompleted = false,
}: {
  supabase: any
  signup: BetaSignupRecord
  existingTracker?: BetaSignupTrackerRow | null
  emailType?: BetaSignupLifecycleEmailType | null
  sentAt?: string
  chefId?: string | null
  authUserId?: string | null
  accountCreatedAt?: string | null
  forceCompleted?: boolean
}): Promise<{
  tracker: BetaSignupTrackerRow | null
  onboardingProgress: BetaOnboardingProgressSnapshot | null
}> {
  const resolvedChefId = chefId ?? existingTracker?.chef_id ?? null
  const resolvedAuthUserId = authUserId ?? existingTracker?.auth_user_id ?? null
  const onboardingProgress = resolvedChefId
    ? await getBetaOnboardingProgressForChef(resolvedChefId, supabase)
    : null

  const tracker = await upsertBetaSignupTracker({
    signup,
    supabase,
    emailType,
    sentAt,
    chefId: resolvedChefId,
    authUserId: resolvedAuthUserId,
    accountCreatedAt: accountCreatedAt ?? signup.onboarded_at,
    forceCompleted,
    onboardingProgress,
  })

  return { tracker, onboardingProgress }
}

async function sendStatusEmailIfRequested(
  signup: BetaSignupRecord,
  tracker: BetaSignupTrackerRow | null,
  emailType: BetaSignupLifecycleEmailType | null,
  onboardingProgress: BetaOnboardingProgressSnapshot | null
) {
  if (!emailType) {
    return {
      success: true,
      result: null as Awaited<ReturnType<typeof sendBetaLifecycleEmail>> | null,
    }
  }

  const result = await sendBetaLifecycleEmail({
    emailType,
    signup,
    tracker,
    onboardingProgress,
  })

  return { success: result.success, result }
}

export async function submitBetaSignup(
  input: BetaSignupInput
): Promise<{ success: boolean; error?: string }> {
  if (input.website) {
    return { success: true }
  }

  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) {
    return { success: false, error: 'Too many submissions. Please try again in a few minutes.' }
  }

  const payload = buildSignupPayload(input)

  if (!payload.name || payload.name.length < 2) {
    return { success: false, error: 'Please enter your name.' }
  }

  if (!payload.email || !isValidEmail(payload.email)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  try {
    const supabase: any = createAdminClient()
    const existingSignup = await fetchAdminSignupRowByEmail(supabase, payload.email)

    let signup: BetaSignupRecord | null = null
    if (existingSignup) {
      const { data, error } = await supabase
        .from('beta_signups')
        .update({
          name: payload.name,
          phone: payload.phone,
          business_name: payload.business_name,
          cuisine_type: payload.cuisine_type,
          years_in_business: payload.years_in_business,
          referral_source: payload.referral_source,
        })
        .eq('id', existingSignup.id)
        .select('*')
        .single()

      if (error || !data) {
        console.error('[beta-signup] Update failed:', error)
        return { success: false, error: 'Something went wrong. Please try again.' }
      }

      signup = data as BetaSignupRecord
      await updateTrackerForSignup({
        supabase,
        signup,
        existingTracker: existingSignup.tracker,
      })

      return { success: true }
    }

    const { data, error } = await supabase
      .from('beta_signups')
      .insert({
        ...payload,
        status: 'pending',
      })
      .select('*')
      .single()

    if (error || !data) {
      console.error('[beta-signup] Insert failed:', error)
      return { success: false, error: 'Something went wrong. Please try again.' }
    }

    signup = data as BetaSignupRecord

    const pendingEmail = await sendBetaLifecycleEmail({
      emailType: 'pending_review',
      signup,
    })

    await updateTrackerForSignup({
      supabase,
      signup,
      emailType: pendingEmail.success ? 'pending_review' : null,
    })

    if (!pendingEmail.success) {
      console.error('[beta-signup] Pending review email failed:', pendingEmail.error)
    }

    try {
      const totalSignups = await getBetaSignupCount()
      await sendEmail({
        to: ADMIN_NOTIFICATION_RECIPIENTS,
        subject: `New beta signup: ${signup.name}`,
        react: BetaSignupAdminEmail({
          name: signup.name,
          email: signup.email,
          businessName: signup.business_name,
          cuisineType: signup.cuisine_type,
          yearsInBusiness: signup.years_in_business,
          referralSource: signup.referral_source,
          totalSignups,
        }),
      })
    } catch (notificationError) {
      console.error('[beta-signup] Admin notification failed:', notificationError)
    }

    try {
      const owner = await resolveOwnerIdentity(supabase)
      if (owner.ownerChefId && owner.ownerAuthUserId) {
        await createNotification({
          tenantId: owner.ownerChefId,
          recipientId: owner.ownerAuthUserId,
          category: 'system',
          action: 'system_alert',
          title: `New beta signup: ${signup.name}`,
          body: `${signup.email} joined the beta waitlist.`,
          actionUrl: '/admin/beta',
          metadata: {
            kind: 'beta_signup_received',
            signup_name: signup.name,
            signup_email: signup.email,
          },
        })
      }
    } catch (alertError) {
      console.error('[beta-signup] Founder in-app alert failed:', alertError)
    }

    return { success: true }
  } catch (error) {
    console.error('[beta-signup] Unexpected error:', error)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}

export async function markBetaSignupOnboardedByEmail(
  input: BetaOnboardingLinkInput
): Promise<BetaOnboardingSyncResult> {
  const email = input.email?.trim().toLowerCase()
  if (!email || !isValidEmail(email)) {
    return {
      matched: false,
      signup: null,
      tracker: null,
      onboardingProgress: null,
    }
  }

  const source = input.source?.trim() || null
  const nowIso = new Date().toISOString()
  const supabase: any = createAdminClient()

  try {
    const existingSignup = await fetchAdminSignupRowByEmail(supabase, email)
    let signup: BetaSignupRecord | null = null
    let existingTracker: BetaSignupTrackerRow | null = existingSignup?.tracker ?? null

    if (existingSignup) {
      const updates: Record<string, unknown> = {
        status: 'onboarded',
      }

      if (!existingSignup.onboarded_at) {
        updates.onboarded_at = nowIso
      }

      if (!existingSignup.referral_source && source) {
        updates.referral_source = source
      }

      const { data, error } = await supabase
        .from('beta_signups')
        .update(updates)
        .eq('id', existingSignup.id)
        .select('*')
        .single()

      if (error || !data) {
        console.error('[beta-signup] Onboarded update failed:', error)
        return {
          matched: false,
          signup: null,
          tracker: null,
          onboardingProgress: null,
        }
      }

      signup = data as BetaSignupRecord
    } else {
      if (!source) {
        return {
          matched: false,
          signup: null,
          tracker: null,
          onboardingProgress: null,
        }
      }

      const inferredName = input.name?.trim() || email.split('@')[0] || 'Beta Chef'
      const { data, error } = await supabase
        .from('beta_signups')
        .insert({
          name: inferredName,
          email,
          referral_source: source,
          status: 'onboarded',
          onboarded_at: nowIso,
        })
        .select('*')
        .single()

      if (error || !data) {
        console.error('[beta-signup] Onboarded insert failed:', error)
        return {
          matched: false,
          signup: null,
          tracker: null,
          onboardingProgress: null,
        }
      }

      signup = data as BetaSignupRecord
      existingTracker = null
    }

    const { tracker, onboardingProgress } = await updateTrackerForSignup({
      supabase,
      signup,
      existingTracker,
      chefId: input.chefId ?? null,
      authUserId: input.authUserId ?? null,
      accountCreatedAt: signup.onboarded_at || nowIso,
    })

    return {
      matched: true,
      signup,
      tracker,
      onboardingProgress,
    }
  } catch (error) {
    console.error('[beta-signup] Onboarded sync failed:', error)
    return {
      matched: false,
      signup: null,
      tracker: null,
      onboardingProgress: null,
    }
  }
}

export async function getBetaSignups(): Promise<BetaSignupAdminRow[]> {
  await requireAdmin()
  const supabase: any = createAdminClient()

  const { data, error } = await supabase
    .from('beta_signups')
    .select(ADMIN_SIGNUP_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[beta-signup] Fetch failed:', error)
    return []
  }

  return (data ?? []).map(normalizeBetaSignupAdminRow)
}

export async function updateBetaSignupStatus(
  id: string,
  status: BetaSignupStatus,
  notes?: string,
  options?: UpdateBetaSignupStatusOptions
): Promise<UpdateBetaSignupStatusResult> {
  await requireAdmin()
  const supabase: any = createAdminClient()

  const existingSignup = await fetchAdminSignupRowById(supabase, id)
  if (!existingSignup) {
    return { success: false, error: 'Failed to load signup.' }
  }

  const normalizedNotes = notes !== undefined ? notes.trim() || null : undefined
  const nowIso = new Date().toISOString()
  const statusChanged = existingSignup.status !== status
  const lifecycleEmailType = options?.sendStatusEmail ? mapStatusToEmailType(status) : null

  const nextSignup: BetaSignupRecord = {
    ...existingSignup,
    status,
    notes: normalizedNotes !== undefined ? normalizedNotes : existingSignup.notes,
    invited_at:
      status === 'invited' && (statusChanged || options?.refreshStatusTimestamp)
        ? nowIso
        : existingSignup.invited_at,
    onboarded_at:
      status === 'onboarded' && (statusChanged || options?.refreshStatusTimestamp)
        ? nowIso
        : existingSignup.onboarded_at,
  }

  const preflight = await sendStatusEmailIfRequested(
    nextSignup,
    existingSignup.tracker,
    lifecycleEmailType,
    null
  )

  if (!preflight.success) {
    const errorMessage = preflight.result?.skipped
      ? 'Email delivery is not configured for this environment.'
      : preflight.result?.error || 'Failed to send lifecycle email.'
    return { success: false, error: errorMessage }
  }

  const updates: Record<string, unknown> = { status }
  if (normalizedNotes !== undefined) {
    updates.notes = normalizedNotes
  }
  if (status === 'invited' && (statusChanged || options?.refreshStatusTimestamp)) {
    updates.invited_at = nextSignup.invited_at
  }
  if (status === 'onboarded' && (statusChanged || options?.refreshStatusTimestamp)) {
    updates.onboarded_at = nextSignup.onboarded_at
  }

  const { data, error } = await supabase
    .from('beta_signups')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    console.error('[beta-signup] Status update failed:', error)
    return {
      success: false,
      error: lifecycleEmailType
        ? 'Email sent, but the row failed to update. Refresh before retrying.'
        : 'Failed to update status.',
    }
  }

  const updatedSignup = data as BetaSignupRecord
  const { tracker } = await updateTrackerForSignup({
    supabase,
    signup: updatedSignup,
    existingTracker: existingSignup.tracker,
    emailType: lifecycleEmailType,
    sentAt: lifecycleEmailType ? nowIso : undefined,
  })

  return {
    success: true,
    message: lifecycleEmailType ? buildLifecycleEmailMessage(lifecycleEmailType) : undefined,
    updated: {
      status: updatedSignup.status,
      notes: updatedSignup.notes,
      invitedAt: updatedSignup.invited_at,
      onboardedAt: updatedSignup.onboarded_at,
      tracker,
    },
  }
}

export async function deleteBetaSignup(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const supabase: any = createAdminClient()

  const { error } = await supabase.from('beta_signups').delete().eq('id', id)

  if (error) {
    console.error('[beta-signup] Delete failed:', error)
    return { success: false, error: 'Failed to delete signup.' }
  }

  return { success: true }
}

export async function getBetaSignupCount(): Promise<number> {
  const supabase: any = createAdminClient()

  const { count, error } = await supabase
    .from('beta_signups')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('[beta-signup] Count failed:', error)
    return 0
  }

  return count ?? 0
}

function escapeCsvValue(value: string | null | undefined) {
  if (!value) return ''
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function exportBetaSignupsCsv(): Promise<string> {
  await requireAdmin()
  const supabase: any = createAdminClient()

  const { data, error } = await supabase
    .from('beta_signups')
    .select(ADMIN_SIGNUP_SELECT)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('[beta-signup] CSV export failed:', error)
    return ''
  }

  const rows = data.map(normalizeBetaSignupAdminRow)
  const csvHeaders = [
    'Name',
    'Email',
    'Phone',
    'Business',
    'Cuisine',
    'Years',
    'Source',
    'Status',
    'Notes',
    'Signed Up',
    'Invited',
    'Onboarded',
    'Tracker Status',
    'Tracker Stage',
    'Tracker Progress',
    'Last Lifecycle Email',
    'Last Lifecycle Email At',
    'Next Action',
  ]

  const csvRows = rows.map((row) =>
    [
      escapeCsvValue(row.name),
      escapeCsvValue(row.email),
      escapeCsvValue(row.phone),
      escapeCsvValue(row.business_name),
      escapeCsvValue(row.cuisine_type),
      escapeCsvValue(row.years_in_business),
      escapeCsvValue(row.referral_source),
      escapeCsvValue(row.status),
      escapeCsvValue(row.notes),
      row.created_at ? new Date(row.created_at).toISOString() : '',
      row.invited_at ? new Date(row.invited_at).toISOString() : '',
      row.onboarded_at ? new Date(row.onboarded_at).toISOString() : '',
      escapeCsvValue(row.tracker?.current_status || ''),
      escapeCsvValue(row.tracker?.current_stage || ''),
      row.tracker?.progress_percent != null ? String(row.tracker.progress_percent) : '',
      escapeCsvValue(row.tracker?.last_email_type || ''),
      row.tracker?.last_email_sent_at ? new Date(row.tracker.last_email_sent_at).toISOString() : '',
      escapeCsvValue(row.tracker?.next_action || ''),
    ].join(',')
  )

  return [csvHeaders.join(','), ...csvRows].join('\n')
}
