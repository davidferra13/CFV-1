// ProFeatureRequiredError - shared error type for tier-gated operations
// No 'use server' - safe to import from any context (server actions, components, tests)
// This lives in its own file because 'use server' modules can only export async functions.
// Follows the same pattern as lib/ai/ollama-errors.ts.

/**
 * Thrown when a Free-tier user attempts to use a Pro-only feature.
 * Caught by UI components to show upgrade prompts instead of generic error messages.
 */
export class ProFeatureRequiredError extends Error {
  readonly featureSlug: string
  readonly code = 'PRO_FEATURE_REQUIRED' as const

  constructor(featureSlug: string) {
    super(`Pro subscription required for: ${featureSlug}`)
    this.name = 'ProFeatureRequiredError'
    this.featureSlug = featureSlug
  }
}
