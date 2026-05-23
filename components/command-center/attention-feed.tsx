'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LucideIcon } from '@/components/ui/icons'
import {
  Flame,
  AlertTriangle,
  Clock,
  Eye,
  CalendarDays,
  ChatTeardropText,
  FileText,
  DollarSign,
  Mail,
  CheckCircle,
  ChevronDown,
  Users,
} from '@/components/ui/icons'
import type { AttentionItem, AttentionUrgency, AttentionItemType } from '@/lib/command-center/attention-aggregator'

// ---- Config ----

const URGENCY_CONFIG: Record<
  AttentionUrgency,
  { label: string; icon: LucideIcon; color: string; bgColor: string; borderColor: string }
> = {
  critical: {
    label: 'Fires',
    icon: Flame,
    color: 'text-red-400',
    bgColor: 'bg-red-950/40',
    borderColor: 'border-red-800/50',
  },
  high: {
    label: 'Needs Response',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/30',
    borderColor: 'border-amber-800/40',
  },
  medium: {
    label: 'Coming Up',
    icon: Clock,
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/20',
    borderColor: 'border-blue-800/30',
  },
  low: {
    label: 'FYI',
    icon: Eye,
    color: 'text-stone-400',
    bgColor: 'bg-stone-900/30',
    borderColor: 'border-stone-800/30',
  },
}

const TYPE_ICONS: Record<AttentionItemType, LucideIcon> = {
  event_today: CalendarDays,
  event_this_week: CalendarDays,
  unanswered_inquiry: ChatTeardropText,
  unsigned_contract: FileText,
  unpaid_invoice: DollarSign,
  overdue_task: Clock,
  expiring_quote: AlertTriangle,
  client_follow_up: Users,
  unread_message: Mail,
}

// ---- Components ----

function AttentionItemRow({ item }: { item: AttentionItem }) {
  const Icon = TYPE_ICONS[item.type] || Eye
  const urgencyConfig = URGENCY_CONFIG[item.urgency]

  return (
    <Link
      href={item.action}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-stone-800/50 transition-colors group"
    >
      <div
        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${urgencyConfig.bgColor}`}
      >
        <Icon className={`w-3.5 h-3.5 ${urgencyConfig.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-200 truncate group-hover:text-white transition-colors">
          {item.title}
        </p>
        <p className="text-[10px] text-stone-500">{item.source}</p>
      </div>
      <span className="text-[10px] text-stone-600 shrink-0">
        {formatTimeContext(item.createdAt)}
      </span>
    </Link>
  )
}

function UrgencySection({
  urgency,
  items,
  defaultExpanded = true,
}: {
  urgency: AttentionUrgency
  items: AttentionItem[]
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const config = URGENCY_CONFIG[urgency]
  const SectionIcon = config.icon

  return (
    <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-left"
      >
        <SectionIcon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
          {config.label}
        </span>
        <span className="text-[10px] text-stone-500 tabular-nums">({items.length})</span>
        <ChevronDown
          className={`w-3 h-3 text-stone-500 ml-auto transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {expanded && (
        <div className="px-1 pb-2 space-y-0.5">
          {items.map((item) => (
            <AttentionItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function formatTimeContext(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 0) {
      // Future
      const futureDays = Math.abs(diffDays)
      if (futureDays === 0) return 'Today'
      if (futureDays === 1) return 'Tomorrow'
      return `In ${futureDays}d`
    }
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

// ---- Main component ----

export function AttentionFeed({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-800/30 flex items-center justify-center mb-3">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-stone-200">All caught up!</p>
        <p className="text-xs text-stone-500 mt-1">Nothing needs your attention right now.</p>
      </div>
    )
  }

  const grouped: Record<AttentionUrgency, AttentionItem[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  }

  for (const item of items) {
    grouped[item.urgency].push(item)
  }

  const urgencyOrder: AttentionUrgency[] = ['critical', 'high', 'medium', 'low']

  return (
    <div className="space-y-3">
      {urgencyOrder.map((urgency) =>
        grouped[urgency].length > 0 ? (
          <UrgencySection
            key={urgency}
            urgency={urgency}
            items={grouped[urgency]}
            defaultExpanded={urgency === 'critical' || urgency === 'high'}
          />
        ) : null
      )}
    </div>
  )
}
