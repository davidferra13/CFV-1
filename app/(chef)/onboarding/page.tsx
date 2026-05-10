import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { OnboardingHub } from '@/components/onboarding/onboarding-hub'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getOnboardingProgress } from '@/lib/onboarding/progress-actions'
import { getChefArchetype } from '@/lib/archetypes/actions'
import { getOnboardingProgress as getWizardStepProgress } from '@/lib/onboarding/onboarding-actions'
import { getOnboardingCompletionState } from '@/lib/onboarding/completion-state'
import { getSmartSuggestions } from '@/lib/onboarding/smart-suggestions'

export const metadata = { title: 'Setup' }

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ reconfigure?: string }>
}) {
  const params = await searchParams
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: chef } = await db
    .from('chefs')
    .select('onboarding_completed_at, onboarding_banner_dismissed_at')
    .eq('id', user.entityId)
    .single()

  const completionState = getOnboardingCompletionState({
    onboardingCompletedAt: chef?.onboarding_completed_at,
    onboardingBannerDismissedAt: chef?.onboarding_banner_dismissed_at,
  })

  // Re-entrability: show wizard if reconfigure param is present
  if (params.reconfigure === 'true') {
    return <OnboardingWizard />
  }

  if (completionState.shouldShowHub) {
    // The hub is only for chefs who actually completed the first-run wizard.
    const [progress, archetype, wizardSteps] = await Promise.all([
      getOnboardingProgress(),
      getChefArchetype(),
      getWizardStepProgress(),
    ])
    const suggestions = getSmartSuggestions(archetype, progress)
    return (
      <OnboardingHub
        progress={progress}
        archetype={archetype}
        wizardSteps={wizardSteps}
        suggestions={suggestions}
      />
    )
  }

  return <OnboardingWizard />
}
