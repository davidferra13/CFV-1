export type OnboardingCompletionSnapshot = {
  onboardingCompletedAt?: string | null
  onboardingBannerDismissedAt?: string | null
}

export type OnboardingCompletionState = {
  wizardCompleted: boolean
  bannerDismissed: boolean
  dashboardBannerHidden: boolean
  shouldShowWizard: boolean
  shouldShowHub: boolean
}

export function getOnboardingCompletionState(
  snapshot: OnboardingCompletionSnapshot | null | undefined
): OnboardingCompletionState {
  const wizardCompleted = Boolean(snapshot?.onboardingCompletedAt)
  const bannerDismissed = Boolean(snapshot?.onboardingBannerDismissedAt)

  return {
    wizardCompleted,
    bannerDismissed,
    dashboardBannerHidden: wizardCompleted || bannerDismissed,
    shouldShowWizard: !wizardCompleted,
    shouldShowHub: wizardCompleted,
  }
}
