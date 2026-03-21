'use client'

import { useState } from 'react'
import type { RawFeedItem } from '@/lib/inquiries/platform-raw-feed'
import Link from 'next/link'

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const PLATFORM_COLORS: Record<string, string> = {
  Thumbtack: 'bg-green-900/50 text-green-300',
  TakeAChef: 'bg-brand-900/50 text-brand-300',
  Yhangry: 'bg-purple-900/50 text-purple-300',
  Bark: 'bg-orange-900/50 text-orange-300',
  'The Knot': 'bg-pink-900/50 text-pink-300',
  Cozymeal: 'bg-amber-900/50 text-amber-300',
  GigSalad: 'bg-teal-900/50 text-teal-300',
  PrivateChefManager: 'bg-brand-900/50 text-brand-300',
  HireAChef: 'bg-brand-900/50 text-brand-300',
  CuisineistChef: 'bg-rose-900/50 text-rose-300',
  Wix: 'bg-brand-900/50 text-brand-300',
}

function PlatformBadge({ platform }: { platform: string }) {
  const colors = PLATFORM_COLORS[platform] || 'bg-stone-700 text-stone-300'
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${colors}`}
    >
      {platform}
    </span>
  )
}

export function PlatformRawFeedTab({ items }: { items: RawFeedItem[] }) {
  const [expanded, setExpanded] = useState(false)

  if (items.length === 0) return null

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-stone-200">Platform Emails</h3>
          <span className="text-xs text-stone-500">({items.length})</span>
        </div>
        <span className="text-xs text-stone-500">{expanded ? 'Collapse' : 'Expand'}</span>
      </button>

      {expanded && (
        <div className="border-t border-stone-800 max-h-80 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="px-3 py-2 border-b border-stone-800 last:border-0 hover:bg-stone-800/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <PlatformBadge platform={item.platform} />
                <span className="text-sm text-stone-200 truncate flex-1" title={item.subject}>
                  {item.subject.length > 60 ? `${item.subject.slice(0, 60)}...` : item.subject}
                </span>
                <span className="text-xs text-stone-500 flex-shrink-0">{item.classification}</span>
                <span className="text-xs text-stone-500 flex-shrink-0">
                  {timeAgo(item.syncedAt)}
                </span>
                {item.linkedInquiryId && (
                  <Link
                    href={`/inquiries/${item.linkedInquiryId}`}
                    className="text-xs px-1.5 py-0.5 rounded bg-brand-900/50 text-brand-300 flex-shrink-0 hover:bg-brand-800/50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Linked
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
