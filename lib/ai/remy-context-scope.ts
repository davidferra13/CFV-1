// Remy - Context Scope Types
// Extracted to avoid circular imports between remy-context.ts and route-prompt-utils.ts.
// No 'use server' - safe to import from any context.

// Which data sections to load from the DB and include in the prompt.
// Determined by regex (Formula > AI) before Ollama classification.
// Saves 15-25 DB queries on focused messages (~70% of traffic).

export type ContextScope =
  | 'full'
  | 'greeting'
  | 'calendar'
  | 'financial'
  | 'client'
  | 'operational'
  | 'draft'
  | 'minimal'

// Which query groups each scope needs (used by remy-context.ts loadDetailedContext)
export const SCOPE_QUERY_GROUPS: Record<ContextScope, Set<string>> = {
  full: new Set([
    'core',
    'calendar',
    'financial',
    'client',
    'operational',
    'intelligence',
    'proactive',
  ]),
  greeting: new Set(['core']),
  minimal: new Set(['core']),
  calendar: new Set(['core', 'calendar', 'operational']),
  financial: new Set(['core', 'financial', 'proactive']),
  client: new Set(['core', 'client', 'proactive']),
  operational: new Set(['core', 'operational']),
  draft: new Set(['core', 'client', 'proactive']),
}
