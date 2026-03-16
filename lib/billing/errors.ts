// Billing errors - thrown by requirePro() and caught by UI for upgrade prompts.
// NOT a server action file - class exports are not allowed in 'use server' files.

export class ProFeatureRequiredError extends Error {
  public readonly featureSlug: string

  constructor(featureSlug: string) {
    super(`Pro feature required: ${featureSlug}`)
    this.name = 'ProFeatureRequiredError'
    this.featureSlug = featureSlug
  }
}
