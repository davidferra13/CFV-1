'use client'

import Link from 'next/link'
import type { ResumeItem } from '@/lib/activity/chef-types'

interface ResumeSectionProps {
  items: ResumeItem[]
}

const STATUS_STYLES: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  stone: 'bg-stone-100 text-stone-600 border-stone-200',
}

const TYPE_ICONS: Record<string, string> = {
  event: '🗓',
  menu: '📋',
  inquiry: '💬',
  quote: '💰',
  note: '📝',
}

export function ResumeSection({ items }: ResumeSectionProps) {
  if (items.length === 0) {
    return (
      <div className="border border-stone-200 rounded-lg p-6 bg-stone-50/50">
        <h3 className="text-sm font-semibold text-stone-700 mb-1">Pick Up Where You Left Off</h3>
        <p className="text-xs text-stone-400">Nothing in progress right now. You&apos;re all caught up!</p>
      </div>
    )
  }

  return (
    <div className="border border-stone-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
        <h3 className="text-sm font-semibold text-stone-700">Pick Up Where You Left Off</h3>
        <p className="text-xs text-stone-400 mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''} in progress</p>
      </div>
      <div className="divide-y divide-stone-100">
        {items.map(item => (
          <ResumeRow key={`${item.type}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  )
}

function ResumeRow({ item }: { item: ResumeItem }) {
  const icon = TYPE_ICONS[item.type] || '📄'
  const statusStyle = STATUS_STYLES[item.statusColor] || STATUS_STYLES.stone

  return (
    <Link
      href={item.href}
      className="flex items-start gap-3 px-4 py-3 hover:bg-stone-50 transition-colors group"
    >
      <span className="text-base mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-stone-800 truncate">{item.title}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${statusStyle}`}>
            {item.status}
          </span>
        </div>
        <p className="text-xs text-stone-500 mt-0.5 truncate">{item.subtitle}</p>
      </div>
      <span className="text-xs text-stone-300 group-hover:text-stone-400 transition-colors shrink-0 mt-1">
        &rarr;
      </span>
    </Link>
  )
}
