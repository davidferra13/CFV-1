'use client'

// Cannabis Event Card — used in the cannabis events list
// Styled for the cannabis portal aesthetic

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

const CATEGORY_LABELS: Record<string, string> = {
  cannabis_friendly: 'Cannabis Friendly',
  infused_menu: 'Infused Menu',
  cbd_only: 'CBD Only',
  micro_dose: 'Micro-Dose',
}

const CATEGORY_COLORS: Record<string, string> = {
  cannabis_friendly: '#4a7c4e',
  infused_menu: '#2d7a5a',
  cbd_only: '#5a7a2d',
  micro_dose: '#7a5a2d',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  proposed: 'Proposed',
  accepted: 'Accepted',
  paid: 'Paid',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

interface CannabisEventCardProps {
  event: {
    id: string
    event_date: string | null
    occasion: string | null
    guest_count: number | null
    location_city: string | null
    location_state: string | null
    status: string | null
    quoted_price_cents: number | null
    clients?: { full_name: string } | null
  }
  cannabisDetails?: {
    cannabis_category: string | null
    guest_consent_confirmed: boolean
  } | null
}

export function CannabisEventCard({ event, cannabisDetails }: CannabisEventCardProps) {
  const category = cannabisDetails?.cannabis_category ?? 'cannabis_friendly'
  const categoryColor = CATEGORY_COLORS[category] ?? '#4a7c4e'
  const categoryLabel = CATEGORY_LABELS[category] ?? 'Cannabis'
  const clientName = (event as any).clients?.full_name ?? 'Unknown Client'
  const priceDollars = event.quoted_price_cents ? (event.quoted_price_cents / 100).toFixed(0) : null
  const dateLabel = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date TBD'

  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div
        className="rounded-xl p-4 transition-all duration-200 group-hover:scale-[1.01]"
        style={{
          background: 'linear-gradient(135deg, #0f1a0f 0%, #131f14 100%)',
          border: '1px solid rgba(74, 124, 78, 0.2)',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: `${categoryColor}22`,
                  color: '#8bc34a',
                  border: `1px solid ${categoryColor}44`,
                }}
              >
                {categoryLabel}
              </span>
              {cannabisDetails?.guest_consent_confirmed && (
                <span className="text-xs" style={{ color: '#4a7c4e' }}>
                  ✓ Consent
                </span>
              )}
            </div>

            <p className="text-sm font-medium truncate" style={{ color: '#e8f5e9' }}>
              {clientName}
            </p>
            <p className="text-xs" style={{ color: '#6aaa6e' }}>
              {dateLabel}
              {event.occasion ? ` · ${event.occasion}` : ''}
              {event.guest_count ? ` · ${event.guest_count} guests` : ''}
            </p>
            {(event.location_city || event.location_state) && (
              <p className="text-xs mt-0.5" style={{ color: '#4a7c4e' }}>
                {[event.location_city, event.location_state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>

          <div className="text-right shrink-0">
            {priceDollars && (
              <p className="text-sm font-semibold" style={{ color: '#8bc34a' }}>
                ${priceDollars}
              </p>
            )}
            <p className="text-xs" style={{ color: '#4a7c4e' }}>
              {STATUS_LABELS[event.status ?? ''] ?? event.status}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}
