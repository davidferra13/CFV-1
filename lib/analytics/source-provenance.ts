// Source Provenance Helper
// Pure derivation function: maps inquiry fields to a canonical intake-lane key and label.
// No database calls, no auth, no side effects.
// Used by analytics actions so all grouping goes through one consistent precedence order.

export type ProvenanceLaneKey =
  | 'open_booking'
  | 'public_profile_inquiry'
  | 'embed_inquiry'
  | 'wix_form'
  | 'kiosk_inquiry'
  | 'instant_book'
  | 'take_a_chef'
  | 'phone'
  | 'email'
  | 'text'
  | 'referral'
  | 'walk_in'
  | 'instagram'
  | 'other'

export type SourceProvenance = {
  key: ProvenanceLaneKey
  label: string
}

const LANE_LABELS: Record<ProvenanceLaneKey, string> = {
  open_booking: 'Open Booking',
  public_profile_inquiry: 'Profile Inquiry',
  embed_inquiry: 'Website Embed',
  wix_form: 'Wix Form',
  kiosk_inquiry: 'Kiosk',
  instant_book: 'Instant Book',
  take_a_chef: 'Take a Chef',
  phone: 'Phone',
  email: 'Email',
  text: 'Text',
  referral: 'Referral',
  walk_in: 'Walk-In',
  instagram: 'Instagram',
  other: 'Other',
}

export type InquiryProvenanceInput = {
  channel?: string | null
  // unknown_fields can be an object {open_booking: true, embed_source: true, ...}
  // or a legacy array of blocking question strings - handle both safely
  unknown_fields?: Record<string, unknown> | unknown[] | null
  utm_medium?: string | null
  external_platform?: string | null
  // Linked event booking_source - only relevant when event context is available
  event_booking_source?: string | null
}

function safeFields(
  raw: Record<string, unknown> | unknown[] | null | undefined
): Record<string, unknown> {
  if (!raw || Array.isArray(raw)) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  return {}
}

// Precedence order (highest to lowest):
// 1. explicit submission_source lane key in unknown_fields (written by P0 routing spec, future)
// 2. open_booking markers (unknown_fields.open_booking or utm_medium)
// 3. embed marker (unknown_fields.embed_source)
// 4. wix channel
// 5. kiosk channel
// 6. instant_book from linked event booking_source
// 7. external_platform (third-party marketplace)
// 8. coarse channel label (phone, email, text, referral, walk_in, instagram, take_a_chef)
// 9. website channel -> public_profile_inquiry (direct chef profile inquiry)
// 10. fallback: other
export function deriveProvenance(input: InquiryProvenanceInput): SourceProvenance {
  const fields = safeFields(input.unknown_fields)

  // 1. Explicit lane key
  const explicit = fields.submission_source as string | undefined
  if (explicit && explicit in LANE_LABELS) {
    return { key: explicit as ProvenanceLaneKey, label: LANE_LABELS[explicit as ProvenanceLaneKey] }
  }

  // 2. Open booking
  if (fields.open_booking === true || input.utm_medium === 'open_booking') {
    return { key: 'open_booking', label: LANE_LABELS.open_booking }
  }

  // 3. Embed
  if (fields.embed_source === true) {
    return { key: 'embed_inquiry', label: LANE_LABELS.embed_inquiry }
  }

  // 4. Wix
  if (input.channel === 'wix') {
    return { key: 'wix_form', label: LANE_LABELS.wix_form }
  }

  // 5. Kiosk
  if (input.channel === 'kiosk') {
    return { key: 'kiosk_inquiry', label: LANE_LABELS.kiosk_inquiry }
  }

  // 6. Instant book (event-side signal)
  if (input.event_booking_source === 'instant_book') {
    return { key: 'instant_book', label: LANE_LABELS.instant_book }
  }

  // 7. External marketplace
  if (input.external_platform) {
    if (input.external_platform === 'take_a_chef') {
      return { key: 'take_a_chef', label: LANE_LABELS.take_a_chef }
    }
    // Other known marketplaces fall back with their raw name as label
    return { key: 'other', label: input.external_platform }
  }

  // 8. Coarse channel
  const ch = input.channel
  switch (ch) {
    case 'phone':
      return { key: 'phone', label: LANE_LABELS.phone }
    case 'email':
      return { key: 'email', label: LANE_LABELS.email }
    case 'text':
      return { key: 'text', label: LANE_LABELS.text }
    case 'referral':
      return { key: 'referral', label: LANE_LABELS.referral }
    case 'walk_in':
      return { key: 'walk_in', label: LANE_LABELS.walk_in }
    case 'instagram':
      return { key: 'instagram', label: LANE_LABELS.instagram }
    case 'take_a_chef':
      return { key: 'take_a_chef', label: LANE_LABELS.take_a_chef }
    case 'website':
      // 9. Website channel without open_booking/embed markers = direct profile inquiry
      return { key: 'public_profile_inquiry', label: LANE_LABELS.public_profile_inquiry }
  }

  // 10. Fallback
  return { key: 'other', label: ch || 'Other' }
}
