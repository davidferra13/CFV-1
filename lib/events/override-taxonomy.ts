/**
 * Override Reason Taxonomy
 *
 * Classifies free-text override reasons into structured categories
 * for analytics, audit trails, and pattern detection.
 */

import { createServerClient } from '@/lib/db/server'

export type OverrideCategory =
  | 'time_constraint'
  | 'client_request'
  | 'ingredient_substitution'
  | 'venue_change'
  | 'simplified_service'
  | 'chef_judgment'
  | 'other'

export interface OverrideCategoryInfo {
  value: OverrideCategory
  label: string
  description: string
}

export const OVERRIDE_CATEGORIES: OverrideCategoryInfo[] = [
  {
    value: 'time_constraint',
    label: 'Time Constraint',
    description: 'Not enough time to fully resolve before event',
  },
  {
    value: 'client_request',
    label: 'Client Request',
    description: 'Client explicitly asked to proceed despite incomplete readiness',
  },
  {
    value: 'ingredient_substitution',
    label: 'Ingredient Substitution',
    description: 'Original ingredient unavailable; substitution planned',
  },
  {
    value: 'venue_change',
    label: 'Venue Change',
    description: 'Venue logistics changed; prior readiness data no longer applies',
  },
  {
    value: 'simplified_service',
    label: 'Simplified Service',
    description: 'Service scope reduced, making the gate irrelevant',
  },
  {
    value: 'chef_judgment',
    label: 'Chef Judgment',
    description: 'Chef has assessed the situation and accepts the risk',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Reason does not fit standard categories',
  },
]

const CATEGORY_KEYWORDS: Record<OverrideCategory, string[]> = {
  time_constraint: [
    'time',
    'rush',
    'deadline',
    'last minute',
    'running out',
    'too late',
    'short notice',
    'no time',
    'urgent',
    'tomorrow',
    'tonight',
    'hours away',
    'day of',
    'same day',
  ],
  client_request: [
    'client',
    'customer',
    'guest',
    'they asked',
    'they want',
    'requested',
    'insisted',
    'approved',
    'signed off',
    'gave permission',
    'okayed',
    'confirmed by client',
  ],
  ingredient_substitution: [
    'substitut',
    'swap',
    'replace',
    'alternative',
    'unavailable ingredient',
    'out of stock',
    'using instead',
    'different ingredient',
    'seasonal swap',
  ],
  venue_change: [
    'venue',
    'location',
    'moved',
    'new address',
    'different kitchen',
    'site change',
    'relocated',
    'outdoor',
    'indoor',
    'space changed',
  ],
  simplified_service: [
    'simplified',
    'reduced',
    'fewer courses',
    'dropped',
    'removed course',
    'scaled down',
    'simpler',
    'less complex',
    'buffet instead',
    'family style instead',
    'no longer needed',
    'not applicable',
  ],
  chef_judgment: [
    'judgment',
    'my call',
    'i know',
    'experience',
    'confident',
    'done this before',
    'acceptable risk',
    'professional',
    'i can handle',
    'not a concern',
    'fine without',
    'will manage',
  ],
  other: [],
}

/**
 * Classify a free-text override reason into a structured category
 * using keyword matching. Returns 'other' if no strong match found.
 */
export function classifyOverrideReason(reason: string): OverrideCategory {
  const normalized = reason.toLowerCase().trim()
  if (!normalized) return 'other'

  let bestCategory: OverrideCategory = 'other'
  let bestScore = 0

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    OverrideCategory,
    string[],
  ][]) {
    if (category === 'other') continue

    let score = 0
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        score += keyword.length // longer matches = higher confidence
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }

  return bestCategory
}

/**
 * Reads all existing override_reason values for a tenant and writes
 * the computed override_category back to rows that lack one.
 */
export async function classifyExistingOverrides(tenantId: string): Promise<{
  classified: number
  skipped: number
}> {
  const db: any = createServerClient({ admin: true })

  // Fetch rows with an override_reason but no category
  const { data: rows, error } = await db
    .from('event_readiness_gates')
    .select('id, override_reason')
    .eq('tenant_id', tenantId)
    .eq('status', 'overridden')
    .is('override_category', null)
    .not('override_reason', 'is', null)

  if (error) {
    throw new Error(`Failed to fetch overrides: ${error.message}`)
  }

  if (!rows || rows.length === 0) {
    return { classified: 0, skipped: 0 }
  }

  let classified = 0
  let skipped = 0

  for (const row of rows as { id: string; override_reason: string }[]) {
    const category = classifyOverrideReason(row.override_reason)
    const { error: updateError } = await db
      .from('event_readiness_gates')
      .update({ override_category: category })
      .eq('id', row.id)

    if (updateError) {
      skipped++
    } else {
      classified++
    }
  }

  return { classified, skipped }
}
