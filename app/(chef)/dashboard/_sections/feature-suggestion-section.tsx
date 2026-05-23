// Feature suggestion section for dashboard.
// Loads suggestions server-side and renders max 1.

import { getFeatureSuggestions } from '@/lib/progressive-disclosure/disclosure-actions'
import { FeatureSuggestionSlot } from '@/components/progressive-disclosure/feature-suggestion'

export async function FeatureSuggestionSection() {
  const suggestions = await getFeatureSuggestions().catch(() => [])
  if (!suggestions.length) return null
  return <FeatureSuggestionSlot suggestions={suggestions.slice(0, 3)} />
}
