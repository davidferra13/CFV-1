// lib/billing/errors.ts
// Error type thrown when a chef hits a Pro-plan feature on the free tier.
// Consumed by tests/unit/billing.tier.test.ts and
// tests/unit/security-trust-reset.test.ts. Kept free of implementation
// detail so the message is safe to surface in UI.

export class ProFeatureRequiredError extends Error {
  readonly code = 'PRO_FEATURE_REQUIRED'
  readonly featureSlug: string

  constructor(featureSlug: string) {
    super(`This feature requires the Pro plan: ${featureSlug}`)
    this.name = 'ProFeatureRequiredError'
    this.featureSlug = featureSlug
  }
}
