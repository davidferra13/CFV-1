import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeOnboardingPeripheralVisibility } from '@/lib/onboarding/peripheral-visibility'

describe('onboarding peripheral visibility', () => {
  it('blocks secondary prompts while the welcome modal is active', () => {
    assert.equal(
      computeOnboardingPeripheralVisibility({
        showWelcome: true,
        showChecklist: false,
        isTourActive: false,
      }),
      false
    )
  })

  it('blocks secondary prompts while the checklist or guided tour is active', () => {
    assert.equal(
      computeOnboardingPeripheralVisibility({
        showWelcome: false,
        showChecklist: true,
        isTourActive: false,
      }),
      false
    )

    assert.equal(
      computeOnboardingPeripheralVisibility({
        showWelcome: false,
        showChecklist: false,
        isTourActive: true,
      }),
      false
    )
  })

  it('re-enables secondary prompts once onboarding surfaces are cleared', () => {
    assert.equal(
      computeOnboardingPeripheralVisibility({
        showWelcome: false,
        showChecklist: false,
        isTourActive: false,
      }),
      true
    )
  })
})
