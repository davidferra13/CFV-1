'use client'

// Client Communication Hub - Stats Card
// Displays total interactions, last contact, most common type, and frequency.

import { MessageSquare, Clock, TrendingUp, BarChart2 } from '@/components/ui/icons'
import type { CommunicationStats } from '@/lib/clients/communication-actions'
import type { TimelineItemType } from '@/lib/clients/communication-actions'

const TYPE_LABELS: Record<TimelineItemType, string> = {
  event: 'Events',
  inquiry: 'Inquiries',
  email: 'Emails',
  note: 'Notes',
  quote: 'Quotes',
  payment: 'Payments',
  referral: 'Referrals',
}

interface CommunicationStatsCardProps {
  stats: CommunicationStats
}

export function CommunicationStatsCard({ stats }: CommunicationStatsCardProps) {
  const lastContactLabel = stats.lastContactDate
    ? formatRelativeDate(stats.lastContactDate)
    : 'No contact yet'

  const mostCommonLabel = stats.mostCommonType ? TYPE_LABELS[stats.mostCommonType] : 'N/A'

  return (
    <div className="border border-stone-700 rounded-xl bg-stone-900">
      <div className="px-5 py-3 border-b border-stone-800">
        <h3 className="font-semibold text-stone-100">Communication Summary</h3>
      </div>
      <div className="grid grid-cols-2 gap-px bg-stone-800">
        <StatCell
          icon={MessageSquare}
          label="Total Interactions"
          value={stats.totalInteractions.toString()}
        />
        <StatCell icon={Clock} label="Last Contact" value={lastContactLabel} />
        <StatCell icon={BarChart2} label="Most Common" value={mostCommonLabel} />
        <StatCell
          icon={TrendingUp}
          label="Per Month"
          value={stats.interactionsPerMonth.toFixed(1)}
        />
      </div>
    </div>
  )
}

function StatCell({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MessageSquare
  label: string
  value: string
}) {
  return (
    <div className="bg-stone-900 px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-stone-500" />
        <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-lg font-semibold text-stone-100">{value}</p>
    </div>
  )
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)}+ years ago`
}
