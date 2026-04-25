'use server'

// Compatibility entrypoint for onboarding progress consumers.
// The first-week activation contract is the single source of truth.

import {
  getFirstWeekActivationProgress,
  type FirstWeekActivationProgress,
} from '@/lib/onboarding/first-week-activation'

export type OnboardingProgress = FirstWeekActivationProgress

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  return getFirstWeekActivationProgress()
}
