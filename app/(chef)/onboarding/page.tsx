import { redirect } from 'next/navigation'
import { getOnboardingStatus, getChefFullProfile } from '@/lib/chef/profile-actions'
import { getConnectAccountStatus } from '@/lib/stripe/connect'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { step?: string }
}) {
  const completed = await getOnboardingStatus().catch(() => false)
  if (completed) redirect('/dashboard')

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
