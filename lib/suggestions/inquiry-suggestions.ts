// Inquiry contextual suggestions - supplements NextActionBanner with state-based nudges
// No new DB queries; consumes data already loaded in inquiry detail page.

import type { ContextualSuggestion } from '@/components/suggestions/contextual-next-action'

interface InquirySuggestionInput {
  inquiryId: string
  status: string
  createdAt: string
  firstResponseAt: string | null
  lastResponseAt: string | null
  quoteCount: number
  hasAcceptedQuote: boolean
  convertedToEventId: string | null
}

export function buildInquirySuggestions(input: InquirySuggestionInput): ContextualSuggestion[] {
  const suggestions: ContextualSuggestion[] = []

  // Skip terminal states
  if (input.status === 'declined' || input.status === 'expired' || input.status === 'confirmed') {
    return suggestions
  }

  const hoursSinceCreated = (Date.now() - new Date(input.createdAt).getTime()) / (1000 * 60 * 60)

  // 1. Inquiry older than 48h without response - suggest responding now
  if (!input.firstResponseAt && hoursSinceCreated > 48) {
    suggestions.push({
      label: 'Respond now',
      description: `This inquiry has been waiting ${Math.floor(hoursSinceCreated / 24)} days without a response.`,
      href: `/inquiries/${input.inquiryId}`,
      tone: 'rose',
    })
  }

  // 2. Responded but no quote sent
  if (input.firstResponseAt && input.quoteCount === 0 && input.status !== 'declined') {
    suggestions.push({
      label: 'Send a quote',
      description: 'You have responded but no quote has been created yet.',
      href: `/inquiries/${input.inquiryId}`,
      tone: 'sky',
    })
  }

  // 3. Quote sent but not accepted - suggest follow up
  if (input.quoteCount > 0 && !input.hasAcceptedQuote && input.status === 'quoted') {
    const daysSinceLastResponse = input.lastResponseAt
      ? Math.floor((Date.now() - new Date(input.lastResponseAt).getTime()) / (1000 * 60 * 60 * 24))
      : null

    suggestions.push({
      label: 'Follow up on quote',
      description:
        daysSinceLastResponse && daysSinceLastResponse >= 3
          ? `Quote was sent ${daysSinceLastResponse} days ago with no acceptance.`
          : 'Quote has been sent. Follow up to close the deal.',
      href: `/inquiries/${input.inquiryId}`,
      tone: 'amber',
    })
  }

  return suggestions
}
