import { Users } from '@/components/ui/icons'
import type { ClientSuggestion } from '@/lib/goals/types'
import { ClientSuggestionCard } from './client-suggestion-card'

interface ClientSuggestionsListProps {
  suggestions: ClientSuggestion[]
  eventsNeeded: number
}

export function ClientSuggestionsList({ suggestions, eventsNeeded }: ClientSuggestionsListProps) {
  const visible = suggestions.filter((s) => s.status !== 'dismissed')
  if (visible.length === 0) return null

  const pending = visible.filter((s) => s.status === 'pending').length

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-stone-400" />
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
          {pending > 0
            ? `${pending} client${pending === 1 ? '' : 's'} to reach out to`
            : 'Outreach tracker'}
        </p>
      </div>
      {eventsNeeded > 0 && pending > 0 && (
        <p className="text-xs text-stone-500">
          These clients have booked before and may be ready for another dinner.
        </p>
      )}
      <div className="space-y-2">
        {visible.map((suggestion) => (
          <ClientSuggestionCard key={suggestion.clientId} suggestion={suggestion} />
        ))}
      </div>
    </div>
  )
}
