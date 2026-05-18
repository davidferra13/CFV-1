/**
 * Feed Aggregation Rules
 *
 * Configurable grouping rules per source category.
 * Each rule defines how to extract a grouping key and the time window
 * within which items are eligible for grouping.
 */

import type { UniversalRailItem } from '@/lib/discovery/universal-rail-types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AggregationRule {
  /** Extract a grouping key from an item. Items with the same key get grouped. */
  extractKey: (item: UniversalRailItem) => string
  /** Time window in ms. Items within this window of each other can group. */
  windowMs: number
}

// ---------------------------------------------------------------------------
// Default time window: 4 hours
// ---------------------------------------------------------------------------

const DEFAULT_WINDOW_MS = 4 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Action verb extraction
//
// Pulls the first verb-like word from the label. Falls back to the full
// label lowercased if no clear verb pattern is found.
// ---------------------------------------------------------------------------

const VERB_PATTERNS = [
  /^(confirm|approve|review|send|schedule|update|complete|finalize|check|respond|assign|follow up|create|sign|pay|submit|prepare|cancel)/i,
  /needs?\s+(confirmation|review|attention|approval|response|update|action)/i,
  /^(\w+)\s/,
]

function extractActionVerb(label: string): string {
  for (const pattern of VERB_PATTERNS) {
    const match = label.match(pattern)
    if (match) return match[1].toLowerCase()
  }
  return label.toLowerCase().slice(0, 20)
}

// ---------------------------------------------------------------------------
// Default key extractor: category + action verb
// ---------------------------------------------------------------------------

function defaultKeyExtractor(item: UniversalRailItem): string {
  const verb = extractActionVerb(item.label)
  return `${item.category}::${verb}`
}

// ---------------------------------------------------------------------------
// Per-category rule overrides
//
// Categories not listed here use the default rule.
// ---------------------------------------------------------------------------

const CATEGORY_RULES: Record<string, Partial<AggregationRule>> = {
  // Communication items group more aggressively (8h window)
  communication: {
    windowMs: 8 * 60 * 60 * 1000,
  },
  // Finance items use tighter window (2h)
  finance: {
    windowMs: 2 * 60 * 60 * 1000,
  },
  // Discovery/opportunity items can group across longer windows
  discovery: {
    windowMs: 12 * 60 * 60 * 1000,
  },
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the aggregation rule for a given item category.
 */
export function getAggregationRule(category: string): AggregationRule {
  const override = CATEGORY_RULES[category]
  return {
    extractKey: override?.extractKey ?? defaultKeyExtractor,
    windowMs: override?.windowMs ?? DEFAULT_WINDOW_MS,
  }
}

/**
 * Extract the grouping key for an item using its category rule.
 */
export function extractGroupKey(item: UniversalRailItem): string {
  const rule = getAggregationRule(item.category)
  return rule.extractKey(item)
}

/**
 * Get the time window for a given category.
 */
export function getWindowMs(category: string): number {
  return CATEGORY_RULES[category]?.windowMs ?? DEFAULT_WINDOW_MS
}
