import { createAdminClient } from '@/lib/supabase/admin'

export type BetaSignupTrackerStatus =
  | 'pending'
  | 'invited'
  | 'account_ready'
  | 'onboarding'
  | 'declined'
  | 'completed'

export type BetaSignupTrackerStage =
  | 'application_review'
  | 'account_creation'
  | 'workspace_launch'
  | 'setup_hub'
  | 'review_closed'
  | 'activated'

export type BetaSignupLifecycleEmailType =
  | 'pending_review'
  | 'invited'
  | 'account_ready'
  | 'onboarding_reminder'
  | 'declined'
  | 'onboarding_complete'

export type BetaOnboardingProgressSnapshot = {
  businessName: string | null
  displayName: string | null
  onboardingCompletedAt: string | null
  profileDone: boolean
  clientsDone: boolean
  clientCount: number
  loyaltyDone: boolean
  recipesDone: boolean
  recipeCount: number
  staffDone: boolean
  staffCount: number
  completedPhases: number
  totalPhases: number
}

export type BetaSignupTrackerRow = {
  id: string
  signup_id: string
  email: string
  chef_id: string | null
  auth_user_id: string | null
  current_status: BetaSignupTrackerStatus
  current_stage: BetaSignupTrackerStage
  progress_percent: number
  next_action: string | null
  last_email_type: BetaSignupLifecycleEmailType | null
  last_email_sent_at: string | null
  pending_review_sent_at: string | null
  invited_sent_at: string | null
  declined_sent_at: string | null
  account_ready_sent_at: string | null
  onboarding_reminder_sent_at: string | null
  completed_sent_at: string | null
  invited_at: string | null
  account_created_at: string | null
  declined_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type BetaSignupRecord = {
  id: string
  name: string
  email: string
  phone: string | null
  business_name: string | null
  cuisine_type: string | null
  years_in_business: string | null
  referral_source: string | null
  status: 'pending' | 'invited' | 'onboarded' | 'declined'
  notes: string | null
  created_at: string
  invited_at: string | null
  onboarded_at: string | null
}

type UpsertTrackerParams = {
  signup: BetaSignupRecord
  supabase?: any
  emailType?: BetaSignupLifecycleEmailType | null
  sentAt?: string
  chefId?: string | null
  authUserId?: string | null
  accountCreatedAt?: string | null
  forceCompleted?: boolean
  onboardingProgress?: BetaOnboardingProgressSnapshot | null
}

const EMAIL_TIMESTAMP_COLUMNS: Record<BetaSignupLifecycleEmailType, string> = {
  pending_review: 'pending_review_sent_at',
  invited: 'invited_sent_at',
  account_ready: 'account_ready_sent_at',
  onboarding_reminder: 'onboarding_reminder_sent_at',
  declined: 'declined_sent_at',
  onboarding_complete: 'completed_sent_at',
}

const STAGE_LABELS: Record<BetaSignupTrackerStage, string> = {
  application_review: 'Application Review',
  account_creation: 'Account Creation',
  workspace_launch: 'Workspace Launch',
  setup_hub: 'Setup Hub',
  review_closed: 'Review Closed',
  activated: 'Activated',
}

const EMAIL_LABELS: Record<BetaSignupLifecycleEmailType, string> = {
  pending_review: 'Pending Review',
  invited: 'Invitation',
  account_ready: 'Account Ready',
  onboarding_reminder: 'Onboarding Reminder',
  declined: 'Declined',
  onboarding_complete: 'Onboarding Complete',
}

export function formatBetaSignupTrackerStage(stage: BetaSignupTrackerStage): string {
  return STAGE_LABELS[stage] || stage
}

export function formatBetaLifecycleEmailType(type: BetaSignupLifecycleEmailType): string {
  return EMAIL_LABELS[type] || type
}

export async function getBetaSignupByEmail(
  email: string,
  supabase: any = createAdminClient()
): Promise<BetaSignupRecord | null> {
  const normalizedEmail = email.trim().toLowerCase()
  const { data, error } = await supabase
    .from('beta_signups')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (error || !data) return null
  return data as BetaSignupRecord
}

export async function getBetaSignupTrackerBySignupId(
  signupId: string,
  supabase: any = createAdminClient()
): Promise<BetaSignupTrackerRow | null> {
  const { data, error } = await supabase
    .from('beta_signup_trackers')
    .select('*')
    .eq('signup_id', signupId)
    .maybeSingle()

  if (error || !data) return null
  return data as BetaSignupTrackerRow
}

export async function getBetaOnboardingProgressForChef(
  chefId: string,
  supabase: any = createAdminClient()
): Promise<BetaOnboardingProgressSnapshot | null> {
  const [chefRow, clients, loyaltyConfig, recipes, staff] = await Promise.all([
    supabase
      .from('chefs')
      .select('business_name, display_name, onboarding_completed_at')
      .eq('id', chefId)
      .maybeSingle(),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', chefId),
    supabase.from('loyalty_config').select('is_active').eq('tenant_id', chefId).maybeSingle(),
    supabase
      .from('recipes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', chefId)
      .eq('archived', false),
    supabase
      .from('staff_members')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', chefId),
  ])

  if (chefRow.error || !chefRow.data) return null

  const profileDone = !!(chefRow.data.business_name && chefRow.data.display_name)
  const clientsDone = (clients.count ?? 0) > 0
  const loyaltyDone = loyaltyConfig.data?.is_active === true
  const recipesDone = (recipes.count ?? 0) > 0
  const staffDone = (staff.count ?? 0) > 0

  const phases = [profileDone, clientsDone, loyaltyDone, recipesDone, staffDone]

  return {
    businessName: chefRow.data.business_name ?? null,
    displayName: chefRow.data.display_name ?? null,
    onboardingCompletedAt: chefRow.data.onboarding_completed_at ?? null,
    profileDone,
    clientsDone,
    clientCount: clients.count ?? 0,
    loyaltyDone,
    recipesDone,
    recipeCount: recipes.count ?? 0,
    staffDone,
    staffCount: staff.count ?? 0,
    completedPhases: phases.filter(Boolean).length,
    totalPhases: phases.length,
  }
}

export function buildBetaOnboardingTrackerItems(progress: BetaOnboardingProgressSnapshot | null) {
  if (!progress) {
    return [
      {
        label: 'Create your account',
        detail: 'Use your beta invite link to create your workspace.',
        state: 'active' as const,
      },
      {
        label: 'Launch your workspace',
        detail: 'Complete the five-step onboarding wizard.',
        state: 'upcoming' as const,
      },
      {
        label: 'Finish the setup hub',
        detail: 'Import clients, recipes, loyalty, and staff when relevant.',
        state: 'upcoming' as const,
      },
    ]
  }

  const completionState = progress.onboardingCompletedAt ? 'complete' : 'upcoming'
  const items = [
    {
      label: 'Profile and positioning',
      detail: progress.profileDone
        ? 'Display name and business identity are configured.'
        : 'Complete your profile and public positioning in the onboarding wizard.',
      state: progress.profileDone ? ('complete' as const) : ('active' as const),
    },
    {
      label: 'Client base imported',
      detail: progress.clientsDone
        ? `${progress.clientCount} client${progress.clientCount === 1 ? '' : 's'} imported.`
        : 'Import your first client so proposals and events use real data.',
      state: progress.clientsDone ? ('complete' as const) : ('upcoming' as const),
    },
    {
      label: 'Recipe library started',
      detail: progress.recipesDone
        ? `${progress.recipeCount} recipe${progress.recipeCount === 1 ? '' : 's'} saved.`
        : 'Add at least one recipe so menus and costing are ready.',
      state: progress.recipesDone ? ('complete' as const) : ('upcoming' as const),
    },
    {
      label: 'Loyalty configured',
      detail: progress.loyaltyDone
        ? 'Rewards and tiers are already enabled.'
        : 'Turn on loyalty when you are ready to support repeat business.',
      state: progress.loyaltyDone ? ('complete' as const) : ('upcoming' as const),
    },
    {
      label: 'Team setup',
      detail: progress.staffDone
        ? `${progress.staffCount} team member${progress.staffCount === 1 ? '' : 's'} added.`
        : 'Add core staff if you operate with a team.',
      state: progress.staffDone ? ('complete' as const) : ('upcoming' as const),
    },
    {
      label: 'Workspace activated',
      detail: progress.onboardingCompletedAt
        ? 'Your onboarding flow is complete and your workspace is live.'
        : 'Finish the final onboarding step to unlock your full dashboard.',
      state: completionState,
    },
  ]

  const firstIncomplete = items.findIndex((item) => item.state !== 'complete')
  if (firstIncomplete >= 0 && items[firstIncomplete].state === 'upcoming') {
    items[firstIncomplete] = { ...items[firstIncomplete], state: 'active' }
  }

  return items
}

function buildNextAction(progress: BetaOnboardingProgressSnapshot | null): string {
  if (!progress) {
    return 'Create your account from the invite link to unlock onboarding.'
  }

  if (progress.onboardingCompletedAt) {
    return 'Your onboarding is complete. Head to the dashboard and start using ChefFlow live.'
  }

  if (!progress.profileDone) {
    return 'Complete your profile and public positioning in the onboarding wizard.'
  }

  if (!progress.clientsDone) {
    return 'Import your first client inside the setup hub so your workflow has real data.'
  }

  if (!progress.recipesDone) {
    return 'Add at least one recipe so menus and costing are ready to use.'
  }

  if (!progress.loyaltyDone) {
    return 'Configure loyalty when you are ready to support repeat business.'
  }

  if (!progress.staffDone) {
    return 'Add your core staff if you run a team, then finish the setup hub.'
  }

  return 'Finish the final onboarding step to unlock your full ChefFlow dashboard.'
}

function resolveTrackerState(params: {
  signup: BetaSignupRecord
  onboardingProgress: BetaOnboardingProgressSnapshot | null
  forceCompleted?: boolean
}) {
  const { signup, onboardingProgress, forceCompleted } = params

  if (forceCompleted || onboardingProgress?.onboardingCompletedAt) {
    return {
      currentStatus: 'completed' as const,
      currentStage: 'activated' as const,
      progressPercent: 100,
      nextAction: 'Your onboarding is complete. Move into the dashboard and run ChefFlow live.',
    }
  }

  if (signup.status === 'declined') {
    return {
      currentStatus: 'declined' as const,
      currentStage: 'review_closed' as const,
      progressPercent: 0,
      nextAction:
        'No action is required right now. Reply if your timing or business details change.',
    }
  }

  if (signup.status === 'pending') {
    return {
      currentStatus: 'pending' as const,
      currentStage: 'application_review' as const,
      progressPercent: 15,
      nextAction:
        'No action is required right now. We review beta applications in small onboarding batches.',
    }
  }

  if (signup.status === 'invited') {
    return {
      currentStatus: 'invited' as const,
      currentStage: 'account_creation' as const,
      progressPercent: 35,
      nextAction: 'Create your account from the invite link to unlock onboarding.',
    }
  }

  if (!onboardingProgress) {
    return {
      currentStatus: 'account_ready' as const,
      currentStage: 'workspace_launch' as const,
      progressPercent: 50,
      nextAction: 'Sign in and start the onboarding wizard to launch your workspace.',
    }
  }

  const phaseRatio =
    onboardingProgress.totalPhases > 0
      ? onboardingProgress.completedPhases / onboardingProgress.totalPhases
      : 0

  const progressPercent = Math.min(95, 55 + Math.round(phaseRatio * 35))

  return {
    currentStatus:
      onboardingProgress.completedPhases === 0
        ? ('account_ready' as const)
        : ('onboarding' as const),
    currentStage:
      onboardingProgress.completedPhases === 0
        ? ('workspace_launch' as const)
        : ('setup_hub' as const),
    progressPercent,
    nextAction: buildNextAction(onboardingProgress),
  }
}

export async function upsertBetaSignupTracker({
  signup,
  supabase = createAdminClient(),
  emailType = null,
  sentAt,
  chefId = null,
  authUserId = null,
  accountCreatedAt = null,
  forceCompleted = false,
  onboardingProgress = null,
}: UpsertTrackerParams): Promise<BetaSignupTrackerRow | null> {
  const nowIso = sentAt || new Date().toISOString()
  const trackerState = resolveTrackerState({ signup, onboardingProgress, forceCompleted })

  const payload: Record<string, unknown> = {
    signup_id: signup.id,
    email: signup.email,
    current_status: trackerState.currentStatus,
    current_stage: trackerState.currentStage,
    progress_percent: trackerState.progressPercent,
    next_action: trackerState.nextAction,
    updated_at: nowIso,
  }

  if (chefId) payload.chef_id = chefId
  if (authUserId) payload.auth_user_id = authUserId
  if (signup.invited_at) payload.invited_at = signup.invited_at
  if (signup.status === 'declined') payload.declined_at = nowIso
  if (signup.status === 'onboarded') {
    payload.account_created_at = accountCreatedAt || signup.onboarded_at || nowIso
  }
  if (trackerState.currentStatus === 'completed') {
    payload.completed_at = onboardingProgress?.onboardingCompletedAt || nowIso
  }

  if (emailType) {
    payload.last_email_type = emailType
    payload.last_email_sent_at = nowIso
    payload[EMAIL_TIMESTAMP_COLUMNS[emailType]] = nowIso
  }

  const { data, error } = await supabase
    .from('beta_signup_trackers')
    .upsert(payload, { onConflict: 'signup_id' })
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('[beta-signup-tracker] Upsert failed:', error)
    return null
  }

  return (data as BetaSignupTrackerRow) ?? null
}
