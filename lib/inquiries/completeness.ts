// Inquiry Completeness Scoring
// Scores an inquiry record 0–100 based on confirmed facts and context.
// Weights: essential booking facts > important context > nice-to-have details.
// Returns a score, tier, and top missing fields with suggested chef actions.
// Pure utility — no DB access, accepts the inquiry object directly.

export type InquiryCompletenessResult = {
  score: number // 0–100
  tier: 'complete' | 'good' | 'basic' | 'minimal'
  missing: MissingField[]
}

export type MissingField = {
  label: string
  suggestion: string
  weight: number
}

type InquiryLike = {
  client_id?: string | null
  confirmed_date?: string | null
  confirmed_guest_count?: number | null
  confirmed_budget_cents?: number | null
  confirmed_location?: string | null
  confirmed_occasion?: string | null
  confirmed_dietary_restrictions?: string[] | null
  confirmed_service_expectations?: string | null
  referral_source?: string | null
  referral_partner_id?: string | null
  notes?: string | null
  unknown_fields?: Record<string, unknown> | null
}

type FieldCheck = {
  label: string
  suggestion: string
  weight: number
  filled: (i: InquiryLike) => boolean
}

const FIELDS: FieldCheck[] = [
  // Essential — booking can't happen without these (60 pts)
  {
    label: 'Client linked',
    suggestion: 'Link to an existing client or create a new one',
    weight: 15,
    filled: (i) => typeof i.client_id === 'string' && i.client_id.length > 0,
  },
  {
    label: 'Event date',
    suggestion: 'Confirm the event date with the client',
    weight: 15,
    filled: (i) => typeof i.confirmed_date === 'string' && i.confirmed_date.length > 0,
  },
  {
    label: 'Guest count',
    suggestion: 'Get a confirmed or estimated guest count',
    weight: 10,
    filled: (i) => typeof i.confirmed_guest_count === 'number' && i.confirmed_guest_count > 0,
  },
  {
    label: 'Budget',
    suggestion: 'Ask for a budget range or send a pricing overview',
    weight: 10,
    filled: (i) => typeof i.confirmed_budget_cents === 'number' && i.confirmed_budget_cents > 0,
  },
  {
    label: 'Location',
    suggestion: 'Get the service address or venue',
    weight: 10,
    filled: (i) =>
      typeof i.confirmed_location === 'string' && i.confirmed_location.trim().length > 0,
  },

  // Important — complete picture before quoting (30 pts)
  {
    label: 'Allergy / dietary status',
    suggestion: 'Ask: any allergies or dietary restrictions? Even a "none" answer is important',
    weight: 10,
    filled: (i) => {
      // Confirmed as "none" via allergy_flag, OR has actual dietary restriction entries
      const flag = (i.unknown_fields as Record<string, unknown> | null)?.allergy_flag
      if (flag === 'none' || flag === 'yes' || flag === 'unknown') return true
      return (
        Array.isArray(i.confirmed_dietary_restrictions) &&
        i.confirmed_dietary_restrictions.length > 0
      )
    },
  },
  {
    label: 'Occasion / theme',
    suggestion: 'Confirm the event theme or occasion type',
    weight: 8,
    filled: (i) =>
      typeof i.confirmed_occasion === 'string' && i.confirmed_occasion.trim().length > 0,
  },
  {
    label: 'Service style',
    suggestion: 'Confirm service format — plated, family-style, cocktail, buffet?',
    weight: 7,
    filled: (i) =>
      typeof i.confirmed_service_expectations === 'string' &&
      i.confirmed_service_expectations.trim().length > 0,
  },
  {
    label: 'Referral source',
    suggestion: 'Note where this inquiry came from (referral, social, walk-in, etc.)',
    weight: 5,
    filled: (i) =>
      (typeof i.referral_source === 'string' && i.referral_source.trim().length > 0) ||
      (typeof i.referral_partner_id === 'string' && i.referral_partner_id.length > 0),
  },

  // Nice-to-have — relationship context (10 pts)
  {
    label: 'Internal notes',
    suggestion: 'Add any context, observations, or follow-up notes',
    weight: 6,
    filled: (i) => typeof i.notes === 'string' && i.notes.trim().length > 0,
  },
  {
    label: 'Additional details',
    suggestion: 'Capture any extra requests, venue details, or special considerations',
    weight: 4,
    filled: (i) => {
      const uf = i.unknown_fields as Record<string, unknown> | null
      const hasAdditionalNotes =
        typeof uf?.additional_notes === 'string' &&
        (uf.additional_notes as string).trim().length > 0
      const hasFavorites =
        typeof uf?.favorite_ingredients_dislikes === 'string' &&
        (uf.favorite_ingredients_dislikes as string).trim().length > 0
      return hasAdditionalNotes || hasFavorites
    },
  },
]

// Total weight: 15+15+10+10+10+10+8+7+5+6+4 = 100 ✓

export function getInquiryCompleteness(inquiry: InquiryLike): InquiryCompletenessResult {
  let score = 0

  for (const field of FIELDS) {
    if (field.filled(inquiry)) {
      score += field.weight
    }
  }

  const missing: MissingField[] = FIELDS.filter((f) => !f.filled(inquiry))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((f) => ({ label: f.label, suggestion: f.suggestion, weight: f.weight }))

  const tier: InquiryCompletenessResult['tier'] =
    score >= 85 ? 'complete' : score >= 60 ? 'good' : score >= 35 ? 'basic' : 'minimal'

  return { score, tier, missing }
}
