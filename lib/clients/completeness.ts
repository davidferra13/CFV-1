// Client Profile Completeness Meter
// Scores a client record 0–100 based on filled fields.
// Weights: critical (allergy-related, kitchen constraints) > important > nice-to-have.
// Used on the client detail header to show a progress bar + missing field nudges.
// Pure utility — no DB access, accepts the client object directly.

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
}

type FieldCheck = {
  label: string
  weight: number
  filled: (c: ClientLike) => boolean
}

const FIELDS: FieldCheck[] = [
  // Critical — allergies and safety (weighted heavily)
  {
    label: 'allergies confirmed',
    weight: 20,
    filled: c => Array.isArray(c.allergies) && c.allergies.length > 0,
  },
  {
    label: 'dietary restrictions',
    weight: 15,
    filled: c => Array.isArray(c.dietary_restrictions) && c.dietary_restrictions.length > 0,
  },
  {
    label: 'kitchen constraints',
    weight: 10,
    filled: c => typeof c.kitchen_constraints === 'string' && c.kitchen_constraints.trim().length > 0,
  },

  // Important — preferences and logistics
  {
    label: 'contact info (phone or email)',
    weight: 10,
    filled: c =>
      (typeof c.phone === 'string' && c.phone.trim().length > 0) ||
      (typeof c.email === 'string' && c.email.trim().length > 0),
  },
  {
    label: 'preferred cuisines',
    weight: 8,
    filled: c => Array.isArray(c.favorite_cuisines) && c.favorite_cuisines.length > 0,
  },
  {
    label: 'dislikes',
    weight: 8,
    filled: c => Array.isArray(c.dislikes) && c.dislikes.length > 0,
  },
  {
    label: 'vibe notes',
    weight: 8,
    filled: c => typeof c.vibe_notes === 'string' && c.vibe_notes.trim().length > 0,
  },
  {
    label: 'payment behavior',
    weight: 6,
    filled: c => typeof c.payment_behavior === 'string' && c.payment_behavior.trim().length > 0,
  },

  // Nice-to-have — relationship depth
  {
    label: 'regular guests',
    weight: 5,
    filled: c => Array.isArray(c.regular_guests) && c.regular_guests.length > 0,
  },
  {
    label: "partner's name",
    weight: 4,
    filled: c => typeof c.partner_name === 'string' && c.partner_name.trim().length > 0,
  },
  {
    label: 'personal milestones',
    weight: 4,
    filled: c => Array.isArray(c.personal_milestones) && c.personal_milestones.length > 0,
  },
  {
    label: 'what they care about',
    weight: 2,
    filled: c => typeof c.what_they_care_about === 'string' && c.what_they_care_about.trim().length > 0,
  },
]

// Total weight must equal 100
// 20 + 15 + 10 + 10 + 8 + 8 + 8 + 6 + 5 + 4 + 4 + 2 = 100 ✓

export function getClientProfileCompleteness(client: ClientLike): ProfileCompletenessResult {
  let score = 0
  const missing: string[] = []

  for (const field of FIELDS) {
    if (field.filled(client)) {
      score += field.weight
    } else {
      missing.push(field.label)
    }
  }

  // Show only the top missing fields by weight (most impactful first)
  const sortedMissing = FIELDS
    .filter(f => !f.filled(client))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map(f => f.label)

  const tier: ProfileCompletenessResult['tier'] =
    score >= 85 ? 'complete' :
    score >= 60 ? 'good' :
    score >= 35 ? 'basic' :
    'minimal'

  return { score, missing: sortedMissing, tier }
}
