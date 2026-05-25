'use client'

// Timeline Filter Bar: channel and date range filters for the Communication Timeline.
// This is a standalone version; CommunicationTimeline also embeds its own filter bar.
// Use this component when mounting filters outside the timeline card.

type Props = {
  activeFilter: string
  onFilterChange: (filter: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  dateFrom: string
  onDateFromChange: (date: string) => void
  dateTo: string
  onDateToChange: (date: string) => void
  onClear: () => void
}

const CHANNEL_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'Text' },
  { value: 'phone', label: 'Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'manual_log', label: 'Logged' },
  { value: 'note', label: 'Notes' },
]

export function TimelineFilterBar({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onClear,
}: Props) {
  const hasActiveFilters = searchQuery || dateFrom || dateTo || activeFilter !== 'all'

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {CHANNEL_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onFilterChange(f.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              activeFilter === f.value
                ? 'bg-brand-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search conversations..."
          className="flex-1 min-w-[200px] rounded-lg border border-stone-700 bg-stone-800 px-3 py-1.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="rounded-lg border border-stone-700 bg-stone-800 px-2 py-1.5 text-xs text-stone-300 focus:border-brand-500 focus:outline-none"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="rounded-lg border border-stone-700 bg-stone-800 px-2 py-1.5 text-xs text-stone-300 focus:border-brand-500 focus:outline-none"
          title="To date"
        />
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-stone-500 hover:text-stone-300"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}
