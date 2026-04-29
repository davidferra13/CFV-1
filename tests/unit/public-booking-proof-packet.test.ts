import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPublicBookingProofPacket,
  type PublicBookingProofFacts,
} from '@/lib/validation/public-booking-proof-packet'

function facts(overrides: Partial<PublicBookingProofFacts> = {}): PublicBookingProofFacts {
  return {
    chefName: 'Pilot Chef',
    publicBookingHref: '/book/pilot-chef',
    bookingEnabled: true,
    publicBookingInquiryCount: 0,
    openBookingInquiryCount: 0,
    nonDeveloperTesterConfirmed: false,
    testerArtifactCount: 0,
    chefFollowUpArtifactCount: 0,
    ...overrides,
  }
}

describe('public booking proof packet', () => {
  it('blocks when the public booking link is not testable', () => {
    const packet = buildPublicBookingProofPacket(
      facts({
        publicBookingHref: null,
        bookingEnabled: false,
      })
    )

    assert.equal(packet.status, 'blocked')
    assert.deepEqual(packet.missingEvidence, [
      {
        key: 'booking_enabled',
        label: 'Public booking is enabled',
        detail: 'Pilot Chef does not have public booking enabled.',
      },
      {
        key: 'public_booking_link',
        label: 'Public booking link exists',
        detail: 'No public booking URL is available for the tester.',
      },
      {
        key: 'public_or_open_booking_inquiry',
        label: 'Public or open booking inquiry exists',
        detail: 'No public booking or open booking inquiry has been captured.',
      },
      {
        key: 'non_developer_tester',
        label: 'Tester is not a developer',
        detail: 'No operator confirmation exists that the tester was a non-developer.',
      },
      {
        key: 'tester_artifact',
        label: 'Tester artifact is attached',
        detail: 'No tester screenshot, note, or transcript artifact is attached.',
      },
      {
        key: 'chef_follow_up',
        label: 'Chef follow-up artifact exists',
        detail: 'No chef follow-up, quote, or response artifact is attached.',
      },
    ])
    assert.equal(
      packet.nextAction,
      'Enable public booking for Pilot Chef, publish the booking link, then send it to a non-developer tester.'
    )
  })

  it('asks for a non-developer tester when the link is ready but no inquiry exists', () => {
    const packet = buildPublicBookingProofPacket(facts())

    assert.equal(packet.status, 'ready_for_test')
    assert.deepEqual(packet.testerInstructions, [
      'Open /book/pilot-chef in a signed-out or fresh browser session.',
      'Submit a realistic event request using a non-developer email address.',
      'Save a screenshot or short note showing the submitted public booking flow.',
    ])
    assert.equal(
      packet.nextAction,
      'Send /book/pilot-chef to a non-developer tester and capture one realistic public booking inquiry.'
    )
  })

  it('keeps submitted booking evidence in operator review until non-developer proof is complete', () => {
    const packet = buildPublicBookingProofPacket(
      facts({
        publicBookingInquiryCount: 1,
        nonDeveloperTesterConfirmed: true,
        testerArtifactCount: 1,
      })
    )

    assert.equal(packet.status, 'operator_review')
    assert.deepEqual(packet.missingEvidence, [
      {
        key: 'chef_follow_up',
        label: 'Chef follow-up artifact exists',
        detail: 'No chef follow-up, quote, or response artifact is attached.',
      },
    ])
    assert.equal(
      packet.nextAction,
      'Attach one chef follow-up, quote, or response artifact for Pilot Chef.'
    )
  })

  it('verifies only after inquiry, non-developer, tester, and chef follow-up evidence exist', () => {
    const packet = buildPublicBookingProofPacket(
      facts({
        publicBookingInquiryCount: 1,
        openBookingInquiryCount: 1,
        nonDeveloperTesterConfirmed: true,
        testerArtifactCount: 1,
        chefFollowUpArtifactCount: 1,
      })
    )

    assert.equal(packet.status, 'verified')
    assert.deepEqual(packet.missingEvidence, [])
    assert.equal(packet.nextAction, 'Public booking proof is ready for launch-readiness review.')
    assert.deepEqual(packet.expectedArtifacts, [
      {
        key: 'public_booking_link',
        label: 'Public booking link',
        expected: '/book/pilot-chef',
        present: true,
      },
      {
        key: 'public_or_open_booking_inquiry',
        label: 'Public or open booking inquiry',
        expected: 'At least 1 captured inquiry from the public booking flow',
        present: true,
      },
      {
        key: 'non_developer_tester',
        label: 'Non-developer tester confirmation',
        expected: 'Operator confirms the tester was not a developer',
        present: true,
      },
      {
        key: 'tester_artifact',
        label: 'Tester artifact',
        expected: 'Screenshot, note, or transcript from the tester',
        present: true,
      },
      {
        key: 'chef_follow_up',
        label: 'Chef follow-up artifact',
        expected: 'Chef response, quote, or follow-up artifact tied to the inquiry',
        present: true,
      },
    ])
  })
})
