export const PUBLIC_INTAKE_LANE_KEYS = {
  open_booking: 'open_booking',
  public_profile_inquiry: 'public_profile_inquiry',
  embed_inquiry: 'embed_inquiry',
  kiosk_inquiry: 'kiosk_inquiry',
  wix_form: 'wix_form',
  instant_book: 'instant_book',
} as const

export type PublicIntakeLaneKey =
  (typeof PUBLIC_INTAKE_LANE_KEYS)[keyof typeof PUBLIC_INTAKE_LANE_KEYS]

export type PublicIntakeLaneFact = {
  detail: string
  label: string
  value: string
}

export type PublicIntakeLaneDefinition = {
  expectation: {
    eyebrow: string
    facts: PublicIntakeLaneFact[]
    summary: string
    title: string
  }
  label: string
}

export const PUBLIC_INTAKE_LANE_CONFIG = {
  [PUBLIC_INTAKE_LANE_KEYS.open_booking]: {
    label: 'Open Booking',
    expectation: {
      eyebrow: 'Matched-chef request',
      title: 'ChefFlow shares this request only with matched chefs.',
      summary:
        'Use this lane when you want help finding the right chef. Multiple matched chefs may review the request, and interested chefs contact you directly.',
      facts: [
        {
          label: 'Lead sharing',
          value: 'Matched chefs only',
          detail: 'The request is shared only with chefs who fit the location and job.',
        },
        {
          label: 'Response path',
          value: 'Chefs reply directly',
          detail: 'Matched chefs follow up by email, and by phone if you choose to share it.',
        },
        {
          label: 'Commitment',
          value: 'Free to submit',
          detail:
            'You review pricing, deposits, and terms before you decide whether to move forward.',
        },
      ],
    },
  },
  [PUBLIC_INTAKE_LANE_KEYS.public_profile_inquiry]: {
    label: 'Profile Inquiry',
    expectation: {
      eyebrow: 'Direct chef inquiry',
      title: 'You are contacting one chef directly.',
      summary:
        'Use this lane when you already know which chef you want or the request needs planning with a specific chef. The named chef reviews the details and responds directly.',
      facts: [
        {
          label: 'Recipient',
          value: 'One named chef',
          detail: 'This inquiry does not fan out to other chefs on the platform.',
        },
        {
          label: 'Review',
          value: 'Direct review',
          detail: 'The chef checks fit, timing, and pricing for this request.',
        },
        {
          label: 'Commitment',
          value: 'No payment to inquire',
          detail: 'Terms and any deposit come later if you decide to move forward.',
        },
      ],
    },
  },
  [PUBLIC_INTAKE_LANE_KEYS.embed_inquiry]: {
    label: 'Website Embed',
    expectation: {
      eyebrow: 'Embedded inquiry',
      title: 'This request routes through an embedded chef form.',
      summary:
        'Embed submissions still create a direct chef inquiry, but they preserve website attribution for reporting and follow-up.',
      facts: [
        {
          label: 'Recipient',
          value: 'One chef',
          detail: 'The request goes to the chef who owns the embedded form.',
        },
        {
          label: 'Attribution',
          value: 'Embed source preserved',
          detail: 'UTM fields and embed markers remain attached for downstream analytics.',
        },
        {
          label: 'Commitment',
          value: 'No payment on submit',
          detail: 'The chef reviews the inquiry before any quote or deposit step.',
        },
      ],
    },
  },
  [PUBLIC_INTAKE_LANE_KEYS.kiosk_inquiry]: {
    label: 'Kiosk',
    expectation: {
      eyebrow: 'Kiosk inquiry',
      title: 'This request starts from an in-person kiosk or device.',
      summary:
        'Kiosk submissions create a direct inquiry with device and staff attribution so the operator can follow up cleanly.',
      facts: [
        {
          label: 'Recipient',
          value: 'One operator',
          detail: 'The inquiry goes to the tenant attached to the kiosk device.',
        },
        {
          label: 'Attribution',
          value: 'Device trail kept',
          detail: 'Device and staff identifiers stay attached for operational review.',
        },
        {
          label: 'Commitment',
          value: 'Follow-up required',
          detail: 'The operator still needs to confirm fit and event details.',
        },
      ],
    },
  },
  [PUBLIC_INTAKE_LANE_KEYS.wix_form]: {
    label: 'Wix Form',
    expectation: {
      eyebrow: 'Website form intake',
      title: 'This request starts from a chef website form.',
      summary:
        'Wix form submissions flow into the same inquiry system while keeping website-form provenance intact.',
      facts: [
        {
          label: 'Recipient',
          value: 'One chef',
          detail: 'The submission routes to the tenant connected to the Wix webhook.',
        },
        {
          label: 'Attribution',
          value: 'Wix source preserved',
          detail: 'Original form and submitter fields remain attached to the inquiry.',
        },
        {
          label: 'Commitment',
          value: 'Review before pricing',
          detail: 'The chef still reviews the request before sending pricing or terms.',
        },
      ],
    },
  },
  [PUBLIC_INTAKE_LANE_KEYS.instant_book]: {
    label: 'Instant Book',
    expectation: {
      eyebrow: 'Instant booking',
      title: 'This lane moves into checkout, not just a quote request.',
      summary:
        'Use this when a chef publishes pricing and allows payment-backed booking. You share the details once, then pay the published deposit in Stripe to lock the date.',
      facts: [
        {
          label: 'Availability',
          value: 'Live date selection',
          detail: 'The booking starts from dates the chef has opened for new events.',
        },
        {
          label: 'Payment',
          value: 'Deposit due at checkout',
          detail: 'Stripe handles the published deposit before the booking is confirmed.',
        },
        {
          label: 'Confirmation',
          value: 'Booking after payment',
          detail: 'Remaining balance and follow-up details come after checkout, not before.',
        },
      ],
    },
  },
} as const satisfies Record<PublicIntakeLaneKey, PublicIntakeLaneDefinition>

export const PUBLIC_INTAKE_LANE_LABELS: Record<PublicIntakeLaneKey, string> = {
  [PUBLIC_INTAKE_LANE_KEYS.open_booking]:
    PUBLIC_INTAKE_LANE_CONFIG[PUBLIC_INTAKE_LANE_KEYS.open_booking].label,
  [PUBLIC_INTAKE_LANE_KEYS.public_profile_inquiry]:
    PUBLIC_INTAKE_LANE_CONFIG[PUBLIC_INTAKE_LANE_KEYS.public_profile_inquiry].label,
  [PUBLIC_INTAKE_LANE_KEYS.embed_inquiry]:
    PUBLIC_INTAKE_LANE_CONFIG[PUBLIC_INTAKE_LANE_KEYS.embed_inquiry].label,
  [PUBLIC_INTAKE_LANE_KEYS.kiosk_inquiry]:
    PUBLIC_INTAKE_LANE_CONFIG[PUBLIC_INTAKE_LANE_KEYS.kiosk_inquiry].label,
  [PUBLIC_INTAKE_LANE_KEYS.wix_form]:
    PUBLIC_INTAKE_LANE_CONFIG[PUBLIC_INTAKE_LANE_KEYS.wix_form].label,
  [PUBLIC_INTAKE_LANE_KEYS.instant_book]:
    PUBLIC_INTAKE_LANE_CONFIG[PUBLIC_INTAKE_LANE_KEYS.instant_book].label,
}

export function getPublicIntakeLaneLabel(lane: PublicIntakeLaneKey) {
  return PUBLIC_INTAKE_LANE_LABELS[lane]
}

export function isPublicIntakeLaneKey(
  value: string | null | undefined
): value is PublicIntakeLaneKey {
  if (!value) return false
  return value in PUBLIC_INTAKE_LANE_CONFIG
}

export function withSubmissionSource<T extends Record<string, unknown>>(
  lane: PublicIntakeLaneKey,
  fields?: T | null
): T & { submission_source: PublicIntakeLaneKey } {
  return {
    ...(fields ?? ({} as T)),
    submission_source: lane,
  }
}
