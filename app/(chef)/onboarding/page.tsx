import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { OnboardingHub } from '@/components/onboarding/onboarding-hub'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getOnboardingProgress } from '@/lib/onboarding/progress-actions'

export const metadata = { title: 'Setup | ChefFlow' }

export default async function OnboardingPage() {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check if the wizard was permanently completed OR the user opted out (banner dismissed)
  const { data: chef } = await db
    .from('chefs')
    .select('onboarding_completed_at, onboarding_banner_dismissed_at')
    .eq('id', user.entityId)
    .single()

  if (chef?.onboarding_completed_at || chef?.onboarding_banner_dismissed_at) {
    // Wizard already done (or skipped), show the post-wizard hub
    const progress = await getOnboardingProgress()
    return <OnboardingHub progress={progress} />
  }

  // Wizard not completed yet, show the wizard
  return <OnboardingWizard />
}
