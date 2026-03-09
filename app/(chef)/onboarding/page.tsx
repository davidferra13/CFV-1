import { getOnboardingStatus, getChefFullProfile } from '@/lib/chef/profile-actions'
import { getConnectAccountStatus } from '@/lib/stripe/connect'
import { getOnboardingProgress } from '@/lib/onboarding/progress-actions'
import { getLaunchStatus } from '@/lib/onboarding/launch-status'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { OnboardingHub } from '@/components/onboarding/onboarding-hub'

export const metadata = { title: 'Setup - ChefFlow' }

const EMPTY_CONNECT_STATUS = {
  connected: false,
  pending: false,
  accountId: null,
  chargesEnabled: false,
  payoutsEnabled: false,
}

const EMPTY_PROGRESS = {
  profile: false,
  clients: { done: false, count: 0 },
  loyalty: { done: false },
  recipes: { done: false, count: 0 },
  staff: { done: false, count: 0 },
  completedPhases: 0,
  totalPhases: 5,
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { step?: string }
}) {
  const [wizardDone, profile, connectStatus, progress] = await Promise.all([
    getOnboardingStatus().catch(() => false),
    getChefFullProfile().catch(() => null),
    getConnectAccountStatus().catch(() => EMPTY_CONNECT_STATUS),
    getOnboardingProgress().catch(() => EMPTY_PROGRESS),
  ])

  const launchStatus = getLaunchStatus(profile, connectStatus)
  const stepParam = parseInt(searchParams?.step ?? '1', 10)
  const initialStep = isNaN(stepParam) || stepParam < 1 ? 1 : Math.min(stepParam, 5)

  if (!wizardDone) {
    return (
      <OnboardingWizard
        profile={profile}
        connectStatus={connectStatus}
        initialStep={initialStep}
        launchStatus={launchStatus}
        progress={progress}
      />
    )
  }

  return <OnboardingHub progress={progress} launchStatus={launchStatus} />
}
