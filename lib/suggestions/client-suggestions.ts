// Client contextual suggestions - supplements NextBestAction with state-based nudges
// No new DB queries; consumes data already loaded in client detail page.

import type { ContextualSuggestion } from '@/components/suggestions/contextual-next-action'

interface ClientSuggestionInput {
  clientId: string
  lastEventDate: string | null
  upcomingEventCount: number
  outstandingBalanceCents: number
  totalEvents: number
  isDormant: boolean
}

export function buildClientSuggestions(input: ClientSuggestionInput): ContextualSuggestion[] {
  const suggestions: ContextualSuggestion[] = []

  // 1. Last event was 60+ days ago (dormant/lapsed) - suggest check-in
  if (input.lastEventDate) {
    const daysSince = Math.floor(
      (Date.now() - new Date(input.lastEventDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSince >= 60 && input.upcomingEventCount === 0) {
      suggestions.push({
        label: 'Send a check-in',
        description: `No events in ${daysSince} days. A quick message could re-engage this client.`,
        href: `/clients/${input.clientId}#outreach`,
        tone: 'amber',
      })
    }
  }

  // 2. No upcoming events - suggest creating one
  if (input.upcomingEventCount === 0 && input.totalEvents > 0 && !input.isDormant) {
    suggestions.push({
      label: 'Create an event',
      description: 'This client has no upcoming events scheduled.',
      href: `/events/new?client_id=${input.clientId}`,
      tone: 'sky',
    })
  }

  // 3. Outstanding balance - suggest sending a reminder
  if (input.outstandingBalanceCents > 0) {
    const formatted = `$${(input.outstandingBalanceCents / 100).toFixed(2)}`
    suggestions.push({
      label: 'Send payment reminder',
      description: `Outstanding balance of ${formatted} needs attention.`,
      href: `/clients/${input.clientId}#outreach`,
      tone: 'rose',
    })
  }

  // 4. Brand new client (0 events) - suggest first event
  if (input.totalEvents === 0) {
    suggestions.push({
      label: 'Create first event',
      description: 'New client with no event history. Book their first dinner.',
      href: `/events/new?client_id=${input.clientId}`,
      tone: 'emerald',
    })
  }

  return suggestions
}
