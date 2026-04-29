'use client'

import Link from 'next/link'
import type { ResumeItem } from '@/lib/activity/chef-types'

interface ResumeSectionProps {
  items: ResumeItem[]
}

const STATUS_STYLES: Record<string, string> = {
  amber: 'bg-amber-900 text-amber-700 border-amber-200',
  blue: 'bg-brand-900 text-brand-700 border-brand-200',
  brand: 'bg-brand-900 text-brand-700 border-brand-200',
  green: 'bg-green-900 text-green-700 border-green-200',
  red: 'bg-red-900 text-red-700 border-red-200',
  purple: 'bg-purple-900 text-purple-700 border-purple-200',
  stone: 'bg-stone-800 text-stone-400 border-stone-700',
}

const TYPE_MARKERS: Record<string, string> = {
  event: 'EV',
  menu: 'MN',
  inquiry: 'IN',
  quote: 'QT',
  note: 'NT',
}

export function ResumeSection({ items }: ResumeSectionProps) {
  if (items.length === 0) {
    return (
      <div
        id="resume"
        tabIndex={-1}
        aria-labelledby="resume-heading"
        className="border border-stone-700 rounded-lg p-6 bg-stone-800/50 scroll-mt-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <h3 id="resume-heading" className="text-sm font-semibold text-stone-300 mb-1">
          Pick Up Where You Left Off
        </h3>
        <p className="text-xs text-stone-400">
          Nothing in progress right now. You&apos;re all caught up!
        </p>
      </div>
    )
  }

  return (
    <div
      id="resume"
      tabIndex={-1}
      aria-labelledby="resume-heading"
      className="border border-stone-700 rounded-lg overflow-hidden scroll-mt-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="px-4 py-3 bg-stone-800 border-b border-stone-700">
        <h3 id="resume-heading" className="text-sm font-semibold text-stone-300">
          Pick Up Where You Left Off
        </h3>
        <p className="text-xs text-stone-400 mt-0.5">
          {items.length} item{items.length !== 1 ? 's' : ''} in progress
        </p>
      </div>
      <div className="divide-y divide-stone-800">
        {items.map((item) => (
          <ResumeRow key={`${item.type}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  )
}

function ResumeRow({ item }: { item: ResumeItem }) {
  const marker = TYPE_MARKERS[item.type] || 'IT'
  const statusStyle = STATUS_STYLES[item.statusColor] || STATUS_STYLES.stone
  const actionLabel = getActionLabel(item)

  return (
    <Link
      href={item.href}
      aria-label={`${actionLabel}: ${item.title}`}
      className="flex items-start gap-3 px-4 py-3 hover:bg-stone-800 transition-colors group"
    >
      <span className="text-xxs font-semibold text-stone-500 border border-stone-700 rounded px-1.5 py-0.5 mt-0.5 shrink-0">
        {marker}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-200 truncate">{item.title}</span>
          <span
            className={`text-xxs font-medium px-1.5 py-0.5 rounded border shrink-0 ${statusStyle}`}
          >
            {item.status}
          </span>
        </div>
        <p className="text-xs text-stone-500 mt-0.5 truncate">{item.subtitle}</p>
      </div>
      <span className="text-xs font-medium text-brand-500 group-hover:text-brand-400 transition-colors shrink-0 mt-1 whitespace-nowrap">
        {actionLabel}
      </span>
    </Link>
  )
}

function getActionLabel(item: ResumeItem): string {
  if (item.type === 'inquiry') return 'Open next step'
  if (item.type === 'quote') {
    return item.status.toLowerCase() === 'draft' ? 'Resume quote' : 'Open quote'
  }
  if (item.type === 'menu') return 'Resume menu'
  if (item.type === 'event') return 'Resume event'
  if (item.type === 'note') return 'Open note'
  return 'Resume'
}
