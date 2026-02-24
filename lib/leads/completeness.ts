// Inquiry Completeness Score — how many key fields are filled
// Higher completeness = easier to convert (chef has what they need to quote)

export interface CompletenessScore {
  inquiryId: string
  score: number // 0–100
  filled: string[]
  missing: string[]
}

const FIELDS: {
  key: string
  label: string
  weight: number
  check: (inq: CompletenessInput) => boolean
}[] = [
  { key: 'date', label: 'Event date', weight: 20, check: (i) => !!i.confirmed_date },
  {
    key: 'guests',
    label: 'Guest count',
    weight: 15,
    check: (i) => !!i.confirmed_guest_count && i.confirmed_guest_count > 0,
  },
  {
    key: 'budget',
    label: 'Budget',
    weight: 20,
    check: (i) => !!i.confirmed_budget_cents && i.confirmed_budget_cents > 0,
  },
  { key: 'occasion', label: 'Occasion', weight: 10, check: (i) => !!i.confirmed_occasion },
  { key: 'location', label: 'Location', weight: 10, check: (i) => !!i.confirmed_location },
  {
    key: 'dietary',
    label: 'Dietary info',
    weight: 10,
    check: (i) =>
      !!i.confirmed_dietary_restrictions &&
      (i.confirmed_dietary_restrictions as string[]).length > 0,
  },
  { key: 'client', label: 'Client linked', weight: 15, check: (i) => !!i.client_id },
]

interface CompletenessInput {
  id: string
  confirmed_date?: string | null
  confirmed_guest_count?: number | null
  confirmed_budget_cents?: number | null
  confirmed_occasion?: string | null
  confirmed_location?: string | null
  confirmed_dietary_restrictions?: string[] | null
  client_id?: string | null
}

export function computeCompleteness(inquiry: CompletenessInput): CompletenessScore {
  let score = 0
  const filled: string[] = []
  const missing: string[] = []

  for (const field of FIELDS) {
    if (field.check(inquiry)) {
      score += field.weight
      filled.push(field.label)
    } else {
      missing.push(field.label)
    }
  }

  return { inquiryId: inquiry.id, score: Math.min(100, score), filled, missing }
}
