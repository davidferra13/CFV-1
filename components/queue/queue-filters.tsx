// Queue Filters — Client component for domain and urgency filtering
'use client'

import type { QueueItem, QueueDomain, QueueUrgency } from '@/lib/queue/types'

const DOMAIN_LABELS: Record<QueueDomain, string> = {
  inquiry: 'Inquiry',
  message: 'Message',
  quote: 'Quote',
  event: 'Event',
  financial: 'Financial',
  post_event: 'Post-Event',
  client: 'Client',
  culinary: 'Culinary',
}

const URGENCY_LABELS: Record<QueueUrgency, string> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
}

const URGENCY_COLORS: Record<QueueUrgency, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-amber-100 text-amber-700 border-amber-200',
  normal: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  low: 'bg-stone-100 text-stone-600 border-stone-200',
}

interface Props {
  items: QueueItem[]
  domainFilter: QueueDomain | 'all'
  urgencyFilter: QueueUrgency | 'all'
  onDomainChange: (domain: QueueDomain | 'all') => void
  onUrgencyChange: (urgency: QueueUrgency | 'all') => void
}

export function QueueFilters({
  items,
  domainFilter,
  urgencyFilter,
  onDomainChange,
  onUrgencyChange,
}: Props) {
  // Count items per domain and urgency
  const domainCounts: Record<string, number> = { all: items.length }
  const urgencyCounts: Record<string, number> = { all: items.length }

  for (const item of items) {
    domainCounts[item.domain] = (domainCounts[item.domain] || 0) + 1
    urgencyCounts[item.urgency] = (urgencyCounts[item.urgency] || 0) + 1
  }

  // Only show domains that have items
  const activeDomains = (Object.keys(DOMAIN_LABELS) as QueueDomain[]).filter(
    d => (domainCounts[d] || 0) > 0
  )

  // Only show urgencies that have items
  const activeUrgencies = (Object.keys(URGENCY_LABELS) as QueueUrgency[]).filter(
    u => (urgencyCounts[u] || 0) > 0
  )

  return (
    <div className="space-y-3">
      {/* Domain filters */}
      <div className="flex flex-wrap gap-1.5">
        <FilterPill
          label="All"
          count={domainCounts.all}
          active={domainFilter === 'all'}
          onClick={() => onDomainChange('all')}
        />
        {activeDomains.map(domain => (
          <FilterPill
            key={domain}
            label={DOMAIN_LABELS[domain]}
            count={domainCounts[domain] || 0}
            active={domainFilter === domain}
            onClick={() => onDomainChange(domain)}
          />
        ))}
      </div>

      {/* Urgency filters */}
      {activeUrgencies.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <FilterPill
            label="All priorities"
            count={urgencyCounts.all}
            active={urgencyFilter === 'all'}
            onClick={() => onUrgencyChange('all')}
            variant="urgency"
          />
          {activeUrgencies.map(urgency => (
            <FilterPill
              key={urgency}
              label={URGENCY_LABELS[urgency]}
              count={urgencyCounts[urgency] || 0}
              active={urgencyFilter === urgency}
              onClick={() => onUrgencyChange(urgency)}
              variant="urgency"
              colorClass={URGENCY_COLORS[urgency]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterPill({
  label,
  count,
  active,
  onClick,
  variant = 'domain',
  colorClass,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  variant?: 'domain' | 'urgency'
  colorClass?: string
}) {
  const baseClass = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer'
  const activeClass = active
    ? colorClass
      ? `${colorClass} ring-1 ring-offset-1`
      : variant === 'domain'
        ? 'bg-brand-100 text-brand-700 border-brand-200 ring-1 ring-brand-300 ring-offset-1'
        : 'bg-stone-800 text-white border-stone-800'
    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'

  return (
    <button className={`${baseClass} ${activeClass}`} onClick={onClick}>
      {label}
      <span className={`text-[10px] ${active ? 'opacity-80' : 'text-stone-400'}`}>
        {count}
      </span>
    </button>
  )
}
