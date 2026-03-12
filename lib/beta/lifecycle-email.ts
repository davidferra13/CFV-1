import { sendEmail, type SendEmailResult } from '@/lib/email/send'
import { BetaAccountReadyEmail } from '@/lib/email/templates/beta-account-ready'
import { BetaDeclinedEmail } from '@/lib/email/templates/beta-declined'
import { BetaInviteEmail } from '@/lib/email/templates/beta-invite'
import { BetaOnboardingCompleteEmail } from '@/lib/email/templates/beta-onboarding-complete'
import { BetaOnboardingReminderEmail } from '@/lib/email/templates/beta-onboarding-reminder'
import { BetaPendingReviewEmail } from '@/lib/email/templates/beta-pending-review'
import {
  buildBetaDashboardUrl,
  buildBetaInviteUrl,
  buildBetaOnboardingUrl,
  buildBetaSignInUrl,
} from './invite-utils'
import {
  buildBetaOnboardingTrackerItems,
  formatBetaSignupTrackerStage,
  type BetaOnboardingProgressSnapshot,
  type BetaSignupLifecycleEmailType,
  type BetaSignupRecord,
  type BetaSignupTrackerRow,
} from './signup-tracker'

type SendBetaLifecycleEmailParams = {
  emailType: BetaSignupLifecycleEmailType
  signup: BetaSignupRecord
  tracker?: BetaSignupTrackerRow | null
  onboardingProgress?: BetaOnboardingProgressSnapshot | null
}

function resolveSignupName(signup: BetaSignupRecord): string {
  const trimmedName = signup.name?.trim()
  if (trimmedName) return trimmedName
  const emailPrefix = signup.email.split('@')[0]?.trim()
  return emailPrefix || 'there'
}

function resolveTrackerStageLabel(
  tracker: BetaSignupTrackerRow | null | undefined,
  fallback:
    | 'application_review'
    | 'account_creation'
    | 'workspace_launch'
    | 'setup_hub'
    | 'review_closed'
    | 'activated'
) {
  return formatBetaSignupTrackerStage(tracker?.current_stage || fallback)
}

export async function sendBetaLifecycleEmail({
  emailType,
  signup,
  tracker = null,
  onboardingProgress = null,
}: SendBetaLifecycleEmailParams): Promise<SendEmailResult> {
  const name = resolveSignupName(signup)

  switch (emailType) {
    case 'pending_review':
      return sendEmail({
        to: signup.email,
        subject: 'ChefFlow beta application received',
        react: BetaPendingReviewEmail({
          name,
          email: signup.email,
          phone: signup.phone,
          businessName: signup.business_name,
          cuisineType: signup.cuisine_type,
          yearsInBusiness: signup.years_in_business,
          referralSource: signup.referral_source,
        }),
      })

    case 'invited':
      return sendEmail({
        to: signup.email,
        subject: 'Your ChefFlow beta invite is ready',
        react: BetaInviteEmail({
          name,
          inviteUrl: buildBetaInviteUrl(signup.email),
          invitedAt: signup.invited_at,
          businessName: signup.business_name,
          email: signup.email,
        }),
      })

    case 'declined':
      return sendEmail({
        to: signup.email,
        subject: 'Update on your ChefFlow beta application',
        react: BetaDeclinedEmail({
          name,
          email: signup.email,
          businessName: signup.business_name,
        }),
      })

    case 'account_ready':
      return sendEmail({
        to: signup.email,
        subject: 'Your ChefFlow beta account is live',
        react: BetaAccountReadyEmail({
          name,
          signInUrl: buildBetaSignInUrl('/onboarding'),
          onboardingUrl: buildBetaOnboardingUrl(),
          stageLabel: resolveTrackerStageLabel(tracker, 'workspace_launch'),
          progressPercent: tracker?.progress_percent ?? 50,
          nextAction:
            tracker?.next_action ||
            'Sign in and start the onboarding wizard to launch your workspace.',
          trackerItems: buildBetaOnboardingTrackerItems(onboardingProgress),
          businessName:
            onboardingProgress?.businessName ||
            signup.business_name ||
            onboardingProgress?.displayName,
          email: signup.email,
        }),
      })

    case 'onboarding_reminder':
      return sendEmail({
        to: signup.email,
        subject: 'Your ChefFlow onboarding is in progress',
        react: BetaOnboardingReminderEmail({
          name,
          signInUrl: buildBetaSignInUrl('/onboarding'),
          stageLabel: resolveTrackerStageLabel(tracker, 'setup_hub'),
          progressPercent: tracker?.progress_percent ?? 60,
          nextAction:
            tracker?.next_action ||
            'Sign in and complete the next active onboarding step to keep momentum.',
          trackerItems: buildBetaOnboardingTrackerItems(onboardingProgress),
        }),
      })

    case 'onboarding_complete':
      return sendEmail({
        to: signup.email,
        subject: 'Your ChefFlow beta onboarding is complete',
        react: BetaOnboardingCompleteEmail({
          name,
          dashboardUrl: buildBetaDashboardUrl(),
          stageLabel: resolveTrackerStageLabel(tracker, 'activated'),
          trackerItems: buildBetaOnboardingTrackerItems(onboardingProgress),
        }),
      })

    default:
      return {
        success: false,
        error: `Unsupported lifecycle email type: ${emailType}`,
      }
  }
}
