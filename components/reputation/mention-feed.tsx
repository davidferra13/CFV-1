'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { markReviewed } from '@/lib/reputation/mention-actions'

type MentionRow = {
  id: string
  source: string
  title: string
  excerpt: string | null
  source_url: string | null
  sentiment: string
  is_reviewed: boolean
  found_at: string
}

interface MentionFeedProps {
  mentions: MentionRow[]
}

type FilterTab = 'all' | 'unreviewed' | 'negative'

function sentimentBadgeVariant(sentiment: string): 'success' | 'default' | 'error' {
  if (sentiment === 'positive') return 'success'
  if (sentiment === 'negative') return 'error'
  return 'default'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function MentionFeed({ mentions: initialMentions }: MentionFeedProps) {
  const [mentions, setMentions] = useState<MentionRow[]>(initialMentions)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [isPending, startTransition] = useTransition()

  const filtered = mentions.filter((m) => {
    if (activeTab === 'unreviewed') return !m.is_reviewed
    if (activeTab === 'negative') return m.sentiment === 'negative'
    return true
  })

  function handleMarkReviewed(id: string) {
    startTransition(async () => {
      await markReviewed(id)
      setMentions((prev) => prev.map((m) => (m.id === id ? { ...m, is_reviewed: true } : m)))
    })
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unreviewed', label: 'Unreviewed' },
    { key: 'negative', label: 'Negative' },
  ]

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-brand-600 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mention cards */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-stone-400 text-sm">
          No mentions found for this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((mention) => (
            <Card
              key={mention.id}
              className={`transition-opacity ${mention.is_reviewed ? 'opacity-60' : ''}`}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                        {mention.source}
                      </span>
                      <Badge variant={sentimentBadgeVariant(mention.sentiment)}>
                        {mention.sentiment}
                      </Badge>
                      {mention.is_reviewed && <Badge variant="default">Reviewed</Badge>}
                    </div>

                    <h4 className="font-medium text-stone-900 text-sm leading-snug">
                      {mention.source_url ? (
                        <a
                          href={mention.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-brand-600 underline underline-offset-2"
                        >
                          {mention.title}
                        </a>
                      ) : (
                        mention.title
                      )}
                    </h4>

                    {mention.excerpt && (
                      <p className="text-sm text-stone-500 mt-1 line-clamp-2">{mention.excerpt}</p>
                    )}

                    <p className="text-xs text-stone-400 mt-2">
                      Found {formatDate(mention.found_at)}
                    </p>
                  </div>

                  {!mention.is_reviewed && (
                    <div className="flex-shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={isPending}
                        onClick={() => handleMarkReviewed(mention.id)}
                      >
                        Mark Reviewed
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
