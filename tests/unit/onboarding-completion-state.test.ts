import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { getOnboardingCompletionState } from '@/lib/onboarding/completion-state'

describe('onboarding completion state', () => {
  it('keeps the wizard available when only the dashboard banner was dismissed', () => {
    const state = getOnboardingCompletionState({
      onboardingCompletedAt: null,
      onboardingBannerDismissedAt: '2026-04-22T18:00:00.000Z',
    })

    assert.equal(state.bannerDismissed, true)
    assert.equal(state.dashboardBannerHidden, true)
    assert.equal(state.wizardCompleted, false)
    assert.equal(state.shouldShowWizard, true)
    assert.equal(state.shouldShowHub, false)
  })

  it('shows the post-wizard hub only after real wizard completion', () => {
    const state = getOnboardingCompletionState({
      onboardingCompletedAt: '2026-04-22T18:00:00.000Z',
      onboardingBannerDismissedAt: null,
    })

    assert.equal(state.wizardCompleted, true)
    assert.equal(state.shouldShowWizard, false)
    assert.equal(state.shouldShowHub, true)
  })

  it('treats a completed wizard as hiding the dashboard banner too', () => {
    const state = getOnboardingCompletionState({
      onboardingCompletedAt: '2026-04-22T18:00:00.000Z',
      onboardingBannerDismissedAt: '2026-04-22T17:00:00.000Z',
    })

    assert.equal(state.wizardCompleted, true)
    assert.equal(state.bannerDismissed, true)
    assert.equal(state.dashboardBannerHidden, true)
  })
})
