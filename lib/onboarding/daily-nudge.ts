'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getOnboardingProgress } from './progress-actions'
import { getChefArchetype } from '@/lib/archetypes/actions'
import { getSmartSuggestions } from './smart-suggestions'

export type OnboardingNudgeData = {
  show: boolean
  progressPercent: number
  nextStep: string
  href: string
}

/**
 * Returns an onboarding nudge for the daily plan if setup is incomplete.
 * Shows only when progress is below 80%.
 */
export async function getOnboardingNudge(): Promise<OnboardingNudgeData | null> {
  await requireChef()

  const progress = await getOnboardingProgress()

  // Use built-in step counts + secondary setup
  const secondaryDone = [
    progress.secondarySetup.clientsImported,
    progress.secondarySetup.recipesAdded,
    progress.secondarySetup.loyaltyConfigured,
    progress.secondarySetup.staffAdded,
  ].filter(Boolean).length

  const totalDone = progress.completedSteps + secondaryDone
  const totalSteps = progress.totalSteps + 4
  const progressPercent = Math.round((totalDone / totalSteps) * 100)

  // Only show nudge if below 80%
  if (progressPercent >= 80) return null

  // Get next suggested action
  const archetype = await getChefArchetype()
  const suggestions = getSmartSuggestions(archetype, progress)

  const nextSuggestion = suggestions[0]
  const nextStepLabel = nextSuggestion?.title ?? progress.nextStep?.label ?? 'Complete your profile'
  const href = nextSuggestion?.href ?? progress.nextStep?.href ?? '/onboarding'

  return {
    show: true,
    progressPercent,
    nextStep: nextStepLabel,
    href,
  }
}
