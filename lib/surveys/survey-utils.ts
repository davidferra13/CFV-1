// Survey utility types and pure helper functions.
// This file has NO 'use server' directive - pure computation only.
// Imported by both actions.ts (for the ChefSurveyRow type) and UI pages.

export type ChefSurveyRow = {
  id: string
  token: string
  submitted_at: string | null
  created_at: string
  overall_rating: number | null
  food_quality_rating: number | null
  communication_rating: number | null
  value_rating: number | null
  would_book_again: string | null
  highlight_text: string | null
  testimonial_consent: boolean
  event: {
    id: string
    occasion: string | null
    event_date: string | null
    client: { full_name: string } | null
  } | null
}

export type SurveyStats = {
  total: number
  submitted: number
  averageOverall: number | null
  averageFood: number | null
  averageCommunication: number | null
  averageValue: number | null
  wouldBookAgainYes: number
  wouldBookAgainNo: number
  wouldBookAgainMaybe: number
}

/**
 * Compute aggregated stats across a set of survey rows.
 * Pure synchronous function - no DB calls.
 */
export function computeSurveyStats(surveys: ChefSurveyRow[]): SurveyStats {
  const submitted = surveys.filter((s) => s.submitted_at !== null)

  function avg(vals: (number | null)[]): number | null {
    const valid = vals.filter((v): v is number => v !== null)
    if (valid.length === 0) return null
    return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10
  }

  return {
    total: surveys.length,
    submitted: submitted.length,
    averageOverall: avg(submitted.map((s) => s.overall_rating)),
    averageFood: avg(submitted.map((s) => s.food_quality_rating)),
    averageCommunication: avg(submitted.map((s) => s.communication_rating)),
    averageValue: avg(submitted.map((s) => s.value_rating)),
    wouldBookAgainYes: submitted.filter((s) => s.would_book_again === 'yes').length,
    wouldBookAgainNo: submitted.filter((s) => s.would_book_again === 'no').length,
    wouldBookAgainMaybe: submitted.filter((s) => s.would_book_again === 'maybe').length,
  }
}
