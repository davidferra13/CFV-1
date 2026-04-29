export type PublicBookingProofStatus = 'blocked' | 'ready_for_test' | 'operator_review' | 'verified'

export type PublicBookingProofEvidenceKey =
  | 'booking_enabled'
  | 'public_booking_link'
  | 'public_or_open_booking_inquiry'
  | 'non_developer_tester'
  | 'tester_artifact'
  | 'chef_follow_up'

export type PublicBookingProofFacts = {
  chefName: string
  publicBookingHref: string | null
  bookingEnabled: boolean
  publicBookingInquiryCount: number
  openBookingInquiryCount: number
  nonDeveloperTesterConfirmed: boolean
  testerArtifactCount: number
  chefFollowUpArtifactCount: number
}

export type PublicBookingMissingEvidence = {
  key: PublicBookingProofEvidenceKey
  label: string
  detail: string
}

export type PublicBookingExpectedArtifact = {
  key: Exclude<PublicBookingProofEvidenceKey, 'booking_enabled'>
  label: string
  expected: string
  present: boolean
}

export type PublicBookingProofPacket = {
  status: PublicBookingProofStatus
  missingEvidence: PublicBookingMissingEvidence[]
  testerInstructions: string[]
  expectedArtifacts: PublicBookingExpectedArtifact[]
  nextAction: string
}

function positiveCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

function cleanHref(href: string | null): string | null {
  const trimmed = href?.trim()
  return trimmed ? trimmed : null
}

function buildMissingEvidence(input: {
  chefName: string
  bookingEnabled: boolean
  publicBookingHref: string | null
  capturedInquiryCount: number
  nonDeveloperTesterConfirmed: boolean
  testerArtifactCount: number
  chefFollowUpArtifactCount: number
}): PublicBookingMissingEvidence[] {
  const missing: PublicBookingMissingEvidence[] = []

  if (!input.bookingEnabled) {
    missing.push({
      key: 'booking_enabled',
      label: 'Public booking is enabled',
      detail: `${input.chefName} does not have public booking enabled.`,
    })
  }

  if (!input.publicBookingHref) {
    missing.push({
      key: 'public_booking_link',
      label: 'Public booking link exists',
      detail: 'No public booking URL is available for the tester.',
    })
  }

  if (input.capturedInquiryCount === 0) {
    missing.push({
      key: 'public_or_open_booking_inquiry',
      label: 'Public or open booking inquiry exists',
      detail: 'No public booking or open booking inquiry has been captured.',
    })
  }

  if (!input.nonDeveloperTesterConfirmed) {
    missing.push({
      key: 'non_developer_tester',
      label: 'Tester is not a developer',
      detail: 'No operator confirmation exists that the tester was a non-developer.',
    })
  }

  if (input.testerArtifactCount === 0) {
    missing.push({
      key: 'tester_artifact',
      label: 'Tester artifact is attached',
      detail: 'No tester screenshot, note, or transcript artifact is attached.',
    })
  }

  if (input.chefFollowUpArtifactCount === 0) {
    missing.push({
      key: 'chef_follow_up',
      label: 'Chef follow-up artifact exists',
      detail: 'No chef follow-up, quote, or response artifact is attached.',
    })
  }

  return missing
}

function buildTesterInstructions(status: PublicBookingProofStatus, href: string | null): string[] {
  if (status === 'blocked') {
    return [
      'Enable public booking and publish a booking link before recruiting a tester.',
      'Confirm the link opens without a signed-in developer session.',
      'Use a non-developer tester for the actual public booking submission.',
    ]
  }

  if (status === 'ready_for_test') {
    const destination = href ?? 'the public booking link'
    return [
      `Open ${destination} in a signed-out or fresh browser session.`,
      'Submit a realistic event request using a non-developer email address.',
      'Save a screenshot or short note showing the submitted public booking flow.',
    ]
  }

  if (status === 'operator_review') {
    return [
      'Compare the submitted inquiry with the tester artifact.',
      'Confirm the tester was not a developer or internal builder.',
      'Attach the chef follow-up artifact that proves the inquiry reached the working chef flow.',
    ]
  }

  return [
    'Keep the booking link, inquiry, tester artifact, and chef follow-up together for launch-readiness review.',
  ]
}

function buildExpectedArtifacts(input: {
  publicBookingHref: string | null
  capturedInquiryCount: number
  nonDeveloperTesterConfirmed: boolean
  testerArtifactCount: number
  chefFollowUpArtifactCount: number
}): PublicBookingExpectedArtifact[] {
  return [
    {
      key: 'public_booking_link',
      label: 'Public booking link',
      expected: input.publicBookingHref ?? 'Published public booking URL',
      present: Boolean(input.publicBookingHref),
    },
    {
      key: 'public_or_open_booking_inquiry',
      label: 'Public or open booking inquiry',
      expected: 'At least 1 captured inquiry from the public booking flow',
      present: input.capturedInquiryCount > 0,
    },
    {
      key: 'non_developer_tester',
      label: 'Non-developer tester confirmation',
      expected: 'Operator confirms the tester was not a developer',
      present: input.nonDeveloperTesterConfirmed,
    },
    {
      key: 'tester_artifact',
      label: 'Tester artifact',
      expected: 'Screenshot, note, or transcript from the tester',
      present: input.testerArtifactCount > 0,
    },
    {
      key: 'chef_follow_up',
      label: 'Chef follow-up artifact',
      expected: 'Chef response, quote, or follow-up artifact tied to the inquiry',
      present: input.chefFollowUpArtifactCount > 0,
    },
  ]
}

function resolveStatus(input: {
  bookingEnabled: boolean
  publicBookingHref: string | null
  capturedInquiryCount: number
  missingEvidence: PublicBookingMissingEvidence[]
}): PublicBookingProofStatus {
  if (!input.bookingEnabled || !input.publicBookingHref) return 'blocked'
  if (input.capturedInquiryCount === 0) return 'ready_for_test'
  if (input.missingEvidence.length > 0) return 'operator_review'
  return 'verified'
}

function buildNextAction(input: {
  chefName: string
  status: PublicBookingProofStatus
  publicBookingHref: string | null
  bookingEnabled: boolean
  capturedInquiryCount: number
  nonDeveloperTesterConfirmed: boolean
  testerArtifactCount: number
  chefFollowUpArtifactCount: number
}): string {
  if (input.status === 'blocked') {
    if (!input.bookingEnabled && !input.publicBookingHref) {
      return `Enable public booking for ${input.chefName}, publish the booking link, then send it to a non-developer tester.`
    }

    if (!input.bookingEnabled) {
      return `Enable public booking for ${input.chefName}, then send ${input.publicBookingHref} to a non-developer tester.`
    }

    return `Publish the public booking link for ${input.chefName}, then send it to a non-developer tester.`
  }

  if (input.capturedInquiryCount === 0) {
    return `Send ${input.publicBookingHref} to a non-developer tester and capture one realistic public booking inquiry.`
  }

  if (!input.nonDeveloperTesterConfirmed) {
    return 'Record operator confirmation that the public booking tester was not a developer.'
  }

  if (input.testerArtifactCount === 0) {
    return 'Attach one tester screenshot, note, or transcript from the public booking flow.'
  }

  if (input.chefFollowUpArtifactCount === 0) {
    return `Attach one chef follow-up, quote, or response artifact for ${input.chefName}.`
  }

  return 'Public booking proof is ready for launch-readiness review.'
}

export function buildPublicBookingProofPacket(
  facts: PublicBookingProofFacts
): PublicBookingProofPacket {
  const publicBookingHref = cleanHref(facts.publicBookingHref)
  const capturedInquiryCount =
    positiveCount(facts.publicBookingInquiryCount) + positiveCount(facts.openBookingInquiryCount)
  const testerArtifactCount = positiveCount(facts.testerArtifactCount)
  const chefFollowUpArtifactCount = positiveCount(facts.chefFollowUpArtifactCount)
  const chefName = facts.chefName.trim() || 'The chef'

  const missingEvidence = buildMissingEvidence({
    chefName,
    bookingEnabled: facts.bookingEnabled,
    publicBookingHref,
    capturedInquiryCount,
    nonDeveloperTesterConfirmed: facts.nonDeveloperTesterConfirmed,
    testerArtifactCount,
    chefFollowUpArtifactCount,
  })
  const status = resolveStatus({
    bookingEnabled: facts.bookingEnabled,
    publicBookingHref,
    capturedInquiryCount,
    missingEvidence,
  })

  return {
    status,
    missingEvidence,
    testerInstructions: buildTesterInstructions(status, publicBookingHref),
    expectedArtifacts: buildExpectedArtifacts({
      publicBookingHref,
      capturedInquiryCount,
      nonDeveloperTesterConfirmed: facts.nonDeveloperTesterConfirmed,
      testerArtifactCount,
      chefFollowUpArtifactCount,
    }),
    nextAction: buildNextAction({
      chefName,
      status,
      publicBookingHref,
      bookingEnabled: facts.bookingEnabled,
      capturedInquiryCount,
      nonDeveloperTesterConfirmed: facts.nonDeveloperTesterConfirmed,
      testerArtifactCount,
      chefFollowUpArtifactCount,
    }),
  }
}
