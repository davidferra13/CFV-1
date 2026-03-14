import { getOnboardingStatus, getChefFullProfile } from '@/lib/chef/profile-actions'
import { getConnectAccountStatus } from '@/lib/stripe/connect'
import { getOnboardingProgress } from '@/lib/onboarding/progress-actions'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { OnboardingHub } from '@/components/onboarding/onboarding-hub'

export const metadata = { title: 'Setup — ChefFlow' }

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { step?: string }
}) {
  const wizardDone = await getOnboardingStatus().catch(() => false)

  if (!wizardDone) {
    // First-time setup: profile + Stripe wizard
    const [profile, connectStatus] = await Promise.all([
      getChefFullProfile().catch(() => null),
      getConnectAccountStatus().catch(() => ({
        connected: false,
        pending: false,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
      })),
    ])

    const stepParam = parseInt(searchParams?.step ?? '1', 10)
    const initialStep = isNaN(stepParam) || stepParam < 1 ? 1 : Math.min(stepParam, 5)

    return (
      <OnboardingWizard
        profile={profile}
        connectStatus={connectStatus}
        initialStep={initialStep}
      />
    )
  }

  // Wizard done — show migration hub
  const progress = await getOnboardingProgress()

  return <OnboardingHub progress={progress} />
}
