import type { OverrideCategory } from './types'

// ============================================
// Override Reason Taxonomy
// 7-category keyword classifier for free-text override reasons.
// Maps unstructured text to a canonical OverrideCategory.
// ============================================

interface TaxonomyRule {
  category: OverrideCategory
  keywords: string[]
  phrases: string[]
}

const TAXONOMY_RULES: TaxonomyRule[] = [
  {
    category: 'time_constraint',
    keywords: [
      'rush',
      'hurry',
      'late',
      'behind',
      'deadline',
      'crunch',
      'urgent',
      'overtime',
      'delay',
      'overdue',
      'pressed',
      'scramble',
    ],
    phrases: [
      'not enough time',
      'running out of time',
      'too late',
      'ran out of time',
      'no time',
      'short on time',
      'time crunch',
      'last minute',
      'behind schedule',
      'can not wait',
    ],
  },
  {
    category: 'client_request',
    keywords: [
      'client',
      'customer',
      'guest',
      'host',
      'asked',
      'requested',
      'wants',
      'prefers',
      'insisted',
      'demanded',
    ],
    phrases: [
      'client asked',
      'client wants',
      'client requested',
      'guest preference',
      'they want',
      'they asked',
      'per client',
      'client insists',
      'at their request',
      'host preference',
    ],
  },
  {
    category: 'ingredient_substitution',
    keywords: [
      'substitut',
      'unavailable',
      'replace',
      'swap',
      'alternative',
      'shortage',
      'sold out',
      'discontinued',
      'seasonal',
      'sourcing',
    ],
    phrases: [
      'not available',
      'out of stock',
      'can not find',
      'hard to source',
      'ingredient swap',
      'no longer available',
      'could not get',
      'ran out of',
      'not in season',
      'supply issue',
    ],
  },
  {
    category: 'venue_change',
    keywords: ['venue', 'location', 'site', 'kitchen', 'space', 'facility', 'outdoor', 'indoor'],
    phrases: [
      'venue changed',
      'moved to',
      'different location',
      'kitchen issue',
      'new venue',
      'space constraint',
      'equipment not available',
      'venue requirement',
      'layout changed',
      'site restriction',
    ],
  },
  {
    category: 'financial_pressure',
    keywords: [
      'budget',
      'cost',
      'expensive',
      'afford',
      'revenue',
      'money',
      'price',
      'profit',
      'margin',
      'cash',
      'cheap',
    ],
    phrases: [
      'need the revenue',
      'can not afford',
      'budget constraint',
      'too expensive',
      'save money',
      'cost cutting',
      'tight budget',
      'need the money',
      'financial pressure',
      'margin too thin',
    ],
  },
  {
    category: 'scheduling_cascade',
    keywords: ['cascade', 'domino', 'conflict', 'overlap', 'double', 'reschedul', 'booking'],
    phrases: [
      'another event',
      'schedule conflict',
      'double booked',
      'overlapping event',
      'cascading change',
      'other commitment',
      'domino effect',
      'knocked on from',
      'because of another',
      'ripple effect',
    ],
  },
  {
    category: 'chef_judgment',
    keywords: [
      'judgment',
      'professional',
      'experience',
      'instinct',
      'quality',
      'standard',
      'better',
      'right',
      'safer',
      'improve',
    ],
    phrases: [
      'professional judgment',
      'better approach',
      'my experience',
      'quality concern',
      'the right call',
      'safer option',
      'better outcome',
      'in my judgment',
      'trust my instinct',
      'higher standard',
    ],
  },
]

/**
 * Classify free-text override reason into a canonical category.
 * Returns the best-matching category, or 'other' if no strong match.
 *
 * Scoring: phrase match = 3 points, keyword match = 1 point.
 * Minimum threshold of 1 point required to classify (prevents false positives).
 */
export function classifyOverrideReason(reason: string): OverrideCategory {
  if (!reason || reason.trim().length === 0) return 'other'

  const normalized = reason.toLowerCase().trim()
  let bestCategory: OverrideCategory = 'other'
  let bestScore = 0

  for (const rule of TAXONOMY_RULES) {
    let score = 0

    // Phrase matches (higher weight, more specific)
    for (const phrase of rule.phrases) {
      if (normalized.includes(phrase)) {
        score += 3
      }
    }

    // Keyword matches (lower weight, broader)
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        score += 1
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestCategory = rule.category
    }
  }

  // Require at least 1 point to classify (avoid false positives on empty/gibberish)
  return bestScore >= 1 ? bestCategory : 'other'
}

/**
 * Get all categories with their match scores for a given reason.
 * Useful for showing confidence in UI or debugging classification.
 */
export function scoreAllCategories(
  reason: string
): Array<{ category: OverrideCategory; score: number }> {
  if (!reason || reason.trim().length === 0) {
    return TAXONOMY_RULES.map((r) => ({ category: r.category, score: 0 }))
  }

  const normalized = reason.toLowerCase().trim()

  return TAXONOMY_RULES.map((rule) => {
    let score = 0
    for (const phrase of rule.phrases) {
      if (normalized.includes(phrase)) score += 3
    }
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) score += 1
    }
    return { category: rule.category, score }
  }).sort((a, b) => b.score - a.score)
}

/**
 * Suggest a category from free-text, returning null if confidence is too low.
 * Use this for auto-suggest in UI (user can override the suggestion).
 */
export function suggestCategory(reason: string): OverrideCategory | null {
  const scores = scoreAllCategories(reason)
  const top = scores[0]
  if (!top || top.score < 2) return null
  // Require clear winner (at least 2x second place score, or second is 0)
  const second = scores[1]
  if (second && second.score > 0 && top.score < second.score * 2) return null
  return top.category
}
