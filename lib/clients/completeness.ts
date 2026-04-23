// Client Profile Completeness Meter
// Scores a client record 0–100 based on filled fields.
// Weights: critical (allergy-related, kitchen constraints) > important > nice-to-have.
// Used on the client detail header to show a progress bar + missing field nudges.
// Pure utility - no DB access, accepts the client object directly.

export type ProfileCompletenessResult = {
  score: number // 0–100
  missing: string[] // human-readable list of the most impactful missing fields
  tier: 'complete' | 'good' | 'basic' | 'minimal'
}

type ClientLike = {
  phone?: string | null
  email?: string | null
  allergies?: string[] | null
  dietary_restrictions?: string[] | null
  kitchen_constraints?: string | null
  allergy_severity?: string | null
  favorite_cuisines?: string[] | null
  dislikes?: string[] | null
  vibe_notes?: string | null
  payment_behavior?: string | null
  regular_guests?: unknown[] | null
  partner_name?: string | null
  personal_milestones?: unknown[] | null
  what_they_care_about?: string | null
  tipping_pattern?: string | null
  // Extended fields
  birthday?: string | null
  anniversary?: string | null
  address?: string | null
  pets?: unknown[] | null
  preferred_service_style?: string | null
  formality_level?: string | null
}

type FieldCheck = {
  label: string
  weight: number
  filled: (c: ClientLike) => boolean
}

export const CLIENT_PROFILE_COMPLETENESS_FIELDS = [
  'phone',
  'email',
  'allergies',
  'dietary_restrictions',
  'kitchen_constraints',
  'favorite_cuisines',
  'dislikes',
  'vibe_notes',
  'payment_behavior',
  'regular_guests',
  'partner_name',
  'personal_milestones',
  'what_they_care_about',
  'birthday',
  'anniversary',
  'address',
  'pets',
  'preferred_service_style',
  'formality_level',
] as const satisfies ReadonlyArray<keyof ClientLike>

const FIELDS: FieldCheck[] = [
  // Critical - allergies and safety (weighted heavily)
  {
    label: 'allergies confirmed',
    weight: 15,
    filled: (c) => Array.isArray(c.allergies) && c.allergies.length > 0,
  },
  {
    label: 'dietary restrictions',
    weight: 12,
    filled: (c) => Array.isArray(c.dietary_restrictions) && c.dietary_restrictions.length > 0,
  },
  {
    label: 'kitchen constraints',
    weight: 8,
    filled: (c) =>
      typeof c.kitchen_constraints === 'string' && c.kitchen_constraints.trim().length > 0,
  },

  // Important - preferences and logistics
  {
    label: 'contact info (phone or email)',
    weight: 8,
    filled: (c) =>
      (typeof c.phone === 'string' && c.phone.trim().length > 0) ||
      (typeof c.email === 'string' && c.email.trim().length > 0),
  },
  {
    label: 'preferred cuisines',
    weight: 6,
    filled: (c) => Array.isArray(c.favorite_cuisines) && c.favorite_cuisines.length > 0,
  },
  {
    label: 'dislikes',
    weight: 6,
    filled: (c) => Array.isArray(c.dislikes) && c.dislikes.length > 0,
  },
  {
    label: 'vibe notes',
    weight: 6,
    filled: (c) => typeof c.vibe_notes === 'string' && c.vibe_notes.trim().length > 0,
  },
  {
    label: 'payment behavior',
    weight: 5,
    filled: (c) => typeof c.payment_behavior === 'string' && c.payment_behavior.trim().length > 0,
  },

  // New fields - address, birthday, service preferences
  {
    label: 'birthday or anniversary',
    weight: 5,
    filled: (c) =>
      (typeof c.birthday === 'string' && c.birthday.length > 0) ||
      (typeof c.anniversary === 'string' && c.anniversary.length > 0),
  },
  {
    label: 'address',
    weight: 5,
    filled: (c) => typeof c.address === 'string' && c.address.trim().length > 0,
  },
  {
    label: 'pets documented',
    weight: 4,
    filled: (c) => Array.isArray(c.pets) && c.pets.length > 0,
  },
  {
    label: 'service defaults',
    weight: 4,
    filled: (c) =>
      (typeof c.preferred_service_style === 'string' &&
        c.preferred_service_style.trim().length > 0) ||
      (typeof c.formality_level === 'string' && c.formality_level.trim().length > 0),
  },

  // Nice-to-have - relationship depth
  {
    label: 'regular guests',
    weight: 4,
    filled: (c) => Array.isArray(c.regular_guests) && c.regular_guests.length > 0,
  },
  {
    label: "partner's name",
    weight: 4,
    filled: (c) => typeof c.partner_name === 'string' && c.partner_name.trim().length > 0,
  },
  {
    label: 'personal milestones',
    weight: 4,
    filled: (c) => Array.isArray(c.personal_milestones) && c.personal_milestones.length > 0,
  },
  {
    label: 'what they care about',
    weight: 4,
    filled: (c) =>
      typeof c.what_they_care_about === 'string' && c.what_they_care_about.trim().length > 0,
  },
]

const TOTAL_COMPLETENESS_WEIGHT = FIELDS.reduce((sum, field) => sum + field.weight, 0)

function getFilledWeight(client: ClientLike): number {
  return FIELDS.reduce((sum, field) => {
    return sum + (field.filled(client) ? field.weight : 0)
  }, 0)
}

function getCompletenessTier(score: number): ProfileCompletenessResult['tier'] {
  return score >= 85 ? 'complete' : score >= 60 ? 'good' : score >= 35 ? 'basic' : 'minimal'
}

// Total weight must equal 100
// 15 + 12 + 8 + 8 + 6 + 6 + 6 + 5 + 5 + 5 + 4 + 4 + 4 + 4 + 4 + 4 = 100 ✓

export function getClientProfileCompleteness(client: ClientLike): ProfileCompletenessResult {
  const score = getFilledWeight(client)

  // Show only the top missing fields by weight (most impactful first)
  const sortedMissing = FIELDS.filter((f) => !f.filled(client))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map((f) => f.label)

  return { score, missing: sortedMissing, tier: getCompletenessTier(score) }
}

export function getClientProfileEngagementPoints(client: ClientLike, maxPoints = 15): number {
  if (maxPoints <= 0 || TOTAL_COMPLETENESS_WEIGHT === 0) {
    return 0
  }

  return Math.round((getFilledWeight(client) / TOTAL_COMPLETENESS_WEIGHT) * maxPoints)
}
