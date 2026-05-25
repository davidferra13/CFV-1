'use client'

import { useState, useTransition, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { UnifiedThreadItem } from '@/lib/communication/unified-thread'

type Props = {
  clientId: string
  initialItems?: UnifiedThreadItem[]
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

const TYPE_ICONS: Record<string, string> = {
  email: 'Em',
  sms: 'Tx',
  phone: 'Ph',
  whatsapp: 'WA',
  manual_log: 'Log',
  note: 'N',
  chat: 'Ch',
  other: '?',
}

const TYPE_COLORS: Record<string, string> = {
  email: 'bg-blue-900/40 text-blue-400',
  sms: 'bg-green-900/40 text-green-400',
  phone: 'bg-purple-900/40 text-purple-400',
  whatsapp: 'bg-emerald-900/40 text-emerald-400',
  manual_log: 'bg-brand-900/40 text-brand-400',
  note: 'bg-amber-900/40 text-amber-400',
  chat: 'bg-stone-700 text-stone-300',
  other: 'bg-stone-700 text-stone-400',
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'short' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Communication Timeline: unified chronological view of all touchpoints with a client.
 * Combines the timeline display and filter bar (channel filter, date range, text search).
 */
export function CommunicationTimeline({ clientId, initialItems }: Props) {
  const [items, setItems] = useState<UnifiedThreadItem[]>(initialItems ?? [])
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Load items if not provided
  useEffect(() => {
    if (initialItems) return
    import('@/lib/communication/unified-thread')
      .then(({ getUnifiedThread }) => {
        // We need tenantId but this is client-side; fetch via server action pattern
        // For now, items should be passed as initialItems from the server component
      })
      .catch(() => {})
  }, [clientId, initialItems])

  // Filter items
  const filtered = items.filter((item) => {
    // Channel filter
    if (activeFilter !== 'all' && item.type !== activeFilter) return false

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      if (!item.content.toLowerCase().includes(q)) return false
    }

    // Date range
    if (dateFrom) {
      const from = new Date(dateFrom).getTime()
      if (new Date(item.timestamp).getTime() < from) return false
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000 // end of day
      if (new Date(item.timestamp).getTime() > to) return false
    }

    return true
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Communication Timeline</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">
              {filtered.length} of {items.length} items
            </span>
            <button
              type="button"
              onClick={() => setShowSearch(!showSearch)}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              {showSearch ? 'Hide search' : 'Search'}
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="space-y-2 mt-2">
          <div className="flex flex-wrap gap-1.5">
            {CHANNEL_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setActiveFilter(f.value)}
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

          {showSearch && (
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="flex-1 min-w-[200px] rounded-lg border border-stone-700 bg-stone-800 px-3 py-1.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
              />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-stone-700 bg-stone-800 px-2 py-1.5 text-xs text-stone-300 focus:border-brand-500 focus:outline-none"
                title="From date"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-stone-700 bg-stone-800 px-2 py-1.5 text-xs text-stone-300 focus:border-brand-500 focus:outline-none"
                title="To date"
              />
              {(searchQuery || dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setDateFrom('')
                    setDateTo('')
                  }}
                  className="text-xs text-stone-500 hover:text-stone-300"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-6">
            {items.length === 0
              ? 'No communication history with this client yet.'
              : 'No items match the current filters.'}
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-stone-700" />

            <div className="space-y-0">
              {filtered.map((item) => (
                <div key={item.id} className="relative pl-10 py-3 group">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-2.5 top-4 w-3 h-3 rounded-full border-2 border-stone-900 ${
                      item.direction === 'inbound' ? 'bg-brand-500' : 'bg-stone-500'
                    }`}
                  />

                  <div className="flex items-start gap-2">
                    {/* Type badge */}
                    <span
                      className={`inline-flex items-center justify-center w-8 h-5 rounded text-[10px] font-bold shrink-0 ${
                        TYPE_COLORS[item.type] || TYPE_COLORS.other
                      }`}
                    >
                      {TYPE_ICONS[item.type] || '?'}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-stone-300">
                          {item.direction === 'inbound' ? 'From' : 'To'}{' '}
                          {item.senderName || 'Unknown'}
                        </span>
                        <span className="text-xs text-stone-600">
                          {formatTimestamp(item.timestamp)}
                        </span>
                        {item.linkedEntityType && (
                          <Badge variant="default" className="text-[10px] py-0">
                            {item.linkedEntityType}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-stone-300 mt-0.5 line-clamp-3 break-words">
                        {item.content || '(no content)'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
