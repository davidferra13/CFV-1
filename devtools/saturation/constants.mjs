export const SPEC_STATUSES = ['draft', 'ready', 'in-progress', 'built', 'verified']

export const DECAY_THRESHOLDS = {
  fresh: { maxDays: 7, maxChanges: 10 },
  aging: { maxDays: 30, maxChanges: 30 },
  // anything beyond aging thresholds = stale
}

export const SKIP_WORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'that',
  'this',
  'into',
  'over',
  'page',
  'fix',
  'build',
  'spec',
  'update',
  'session',
  'proof',
  'closeout',
  'handoff',
  'agent',
  'codex',
])
