// Charity keyword matching utility
// Single source of truth for all charity-related keyword matching.
// Add new terms to CHARITY_KEYWORDS — they propagate to all queries automatically.

/**
 * Configurable keyword array for charity detection.
 * Case-insensitive matching everywhere this is used.
 */
export const CHARITY_KEYWORDS: string[] = [
  'charity',
  'nonprofit',
  'non-profit',
  'fundraiser',
  'fundraising',
  'donation',
  'donate',
  'giveback',
  'philanthropic',
  'philanthropy',
  'foundation',
  'sponsorship',
  'volunteer',
  'community support',
  'pro bono',
  '501c',
  '501(c)',
  'benefit dinner',
  'benefit gala',
]

/**
 * Check if a text string contains any charity keyword (case-insensitive).
 * Works on single strings — for arrays, call on each element.
 */
export function isCharityRelated(text: string | null | undefined): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return CHARITY_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()))
}

/**
 * Build a Supabase `.or()` filter string for ILIKE matching across columns.
 * Example output: "occasion.ilike.%charity%,occasion.ilike.%nonprofit%,notes.ilike.%charity%,..."
 */
export function buildCharityOrFilter(columns: string[]): string {
  const clauses: string[] = []
  for (const col of columns) {
    for (const kw of CHARITY_KEYWORDS) {
      clauses.push(`${col}.ilike.%${kw}%`)
    }
  }
  return clauses.join(',')
}
