export type CustomerStoryMetric = {
  label: string
  before: string
  after: string
  delta: string
}

export type CustomerStory = {
  slug: string
  title: string
  chefName: string
  chefProfile: string
  location: string
  summary: string
  timeline: string
  challenge: string[]
  solution: string[]
  outcomes: string[]
  quote: string
  quoteAttribution: string
  metrics: CustomerStoryMetric[]
}

// Keep this empty until there are verified, approved, real customer stories.
export const CUSTOMER_STORIES: CustomerStory[] = []

export function getCustomerStory(slug: string): CustomerStory | undefined {
  return CUSTOMER_STORIES.find((story) => story.slug === slug)
}
