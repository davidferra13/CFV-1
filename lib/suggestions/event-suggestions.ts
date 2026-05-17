// Event contextual suggestions - derives suggestions from CompletionResult
// No new DB queries, purely reads completion contract output.

import type { CompletionResult } from '@/lib/completion/types'
import type { ContextualSuggestion } from '@/components/suggestions/contextual-next-action'

export function buildEventSuggestions(
  eventId: string,
  event: { status: string; menu_id?: string | null; event_date?: string | null },
  completion: CompletionResult | null
): ContextualSuggestion[] {
  const suggestions: ContextualSuggestion[] = []
  const status = event.status

  // Skip completed/cancelled events
  if (status === 'completed' || status === 'cancelled') return suggestions

  // 1. Confirmed but no menu
  if (!event.menu_id) {
    const menuReq = completion?.missingRequirements.find((r) => r.key === 'menu_linked')
    suggestions.push({
      label: 'Add a menu',
      description: menuReq
        ? 'Menu is required before you can price, prep, or generate documents.'
        : 'This event needs a menu to move forward.',
      href: `/events/${eventId}`,
      tone: 'amber',
    })
  }

  // 2. Has menu but no pricing/quote
  if (event.menu_id && completion) {
    const quoteReq = completion.missingRequirements.find((r) => r.key === 'quote_exists')
    if (quoteReq) {
      suggestions.push({
        label: 'Set pricing',
        description: 'Menu is linked but no quote has been created or sent yet.',
        href: quoteReq.actionUrl || `/events/${eventId}?tab=money`,
        tone: 'sky',
      })
    }
  }

  // 3. Approaching event (< 7 days) with incomplete prep
  if (event.event_date) {
    const eventDate = new Date(event.event_date)
    const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysUntil >= 0 && daysUntil <= 7 && completion) {
      const prepMissing = completion.missingRequirements.filter(
        (r) => r.key === 'prep_ready' || r.key === 'grocery_ready' || r.key === 'packing_ready'
      )
      if (prepMissing.length > 0) {
        const labels = prepMissing.map((r) => r.label.toLowerCase()).join(', ')
        suggestions.push({
          label: 'Review prep list',
          description: `Event is ${daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}. Still missing: ${labels}.`,
          href: `/events/${eventId}?tab=prep`,
          tone: 'rose',
        })
      }
    }
  }

  // 4. Missing deposit (financial)
  if (completion) {
    const depositReq = completion.missingRequirements.find((r) => r.key === 'deposit')
    const quoteExists = !completion.missingRequirements.find((r) => r.key === 'quote_exists')
    if (depositReq && quoteExists) {
      suggestions.push({
        label: 'Collect deposit',
        description: 'Quote exists but no payment has been recorded yet.',
        href: depositReq.actionUrl || `/events/${eventId}?tab=money`,
        tone: 'amber',
      })
    }
  }

  // 5. Missing client allergies (safety)
  if (completion) {
    const allergyReq = completion.missingRequirements.find((r) => r.key === 'allergies')
    if (allergyReq && allergyReq.blocking) {
      suggestions.push({
        label: 'Confirm client allergies',
        description: 'Safety blocker: client allergy information has not been confirmed.',
        href: allergyReq.actionUrl || `/events/${eventId}`,
        tone: 'rose',
      })
    }
  }

  return suggestions
}
