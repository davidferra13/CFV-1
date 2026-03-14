'use client'

import { useState } from 'react'
import type { ChefCircleSummary } from '@/lib/hub/chef-circle-actions'
import type { SocialFeedItem } from '@/lib/hub/social-feed-actions'
import { CirclesInbox } from './circles-inbox'
import { SocialFeed } from './social-feed'

interface CirclesPageTabsProps {
  circles: ChefCircleSummary[]
  feedItems: SocialFeedItem[]
  feedCursor: string | null
}

export function CirclesPageTabs({ circles, feedItems, feedCursor }: CirclesPageTabsProps) {
  const [tab, setTab] = useState<'circles' | 'feed'>('circles')

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-lg bg-stone-800/50 p-1">
        <button
          type="button"
          onClick={() => setTab('circles')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === 'circles'
              ? 'bg-stone-700 text-stone-100'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Circles
        </button>
        <button
          type="button"
          onClick={() => setTab('feed')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === 'feed' ? 'bg-stone-700 text-stone-100' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Feed
        </button>
      </div>

      {tab === 'circles' && <CirclesInbox circles={circles} />}
      {tab === 'feed' && <SocialFeed initialItems={feedItems} initialCursor={feedCursor} />}
    </div>
  )
}
