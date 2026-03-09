import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getLaunchStatus } from '@/lib/onboarding/launch-status'

describe('onboarding launch status', () => {
  it('counts completed launch tasks from profile and payments data', () => {
    const status = getLaunchStatus(
      {
        business_name: 'North Star Dining',
        display_name: 'Chef North',
        bio: null,
        phone: null,
        tagline: null,
        google_review_url: null,
        profile_image_url: null,
        logo_url: null,
        website_url: null,
        show_website_on_public_profile: true,
        preferred_inquiry_destination: 'both',
        slug: 'chef-north',
      },
      {
        connected: true,
        pending: false,
        accountId: 'acct_123',
        chargesEnabled: true,
        payoutsEnabled: true,
      }
    )

    assert.equal(status.completedSteps, 3)
    assert.equal(status.totalSteps, 3)
    assert.equal(status.publicUrlDone, true)
    assert.equal(status.paymentsDone, true)
    assert.equal(status.displayName, 'Chef North')
  })

  it('falls back to business name and marks missing tasks incomplete', () => {
    const status = getLaunchStatus(
      {
        business_name: 'North Star Dining',
        display_name: null,
        bio: null,
        phone: null,
        tagline: null,
        google_review_url: null,
        profile_image_url: null,
        logo_url: null,
        website_url: null,
        show_website_on_public_profile: true,
        preferred_inquiry_destination: 'both',
        slug: null,
      },
      {
        connected: false,
        pending: true,
        accountId: 'acct_pending',
        chargesEnabled: false,
        payoutsEnabled: false,
      }
    )

    assert.equal(status.completedSteps, 1)
    assert.equal(status.profileDone, true)
    assert.equal(status.publicUrlDone, false)
    assert.equal(status.paymentsDone, false)
    assert.equal(status.displayName, 'North Star Dining')
  })
})
