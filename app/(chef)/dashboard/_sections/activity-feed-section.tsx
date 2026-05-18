// Activity Feed Section - async server component
// Fetches aggregated feed items and renders the FeedCard client component.

import { getFeedItems } from '@/lib/feed/feed-actions'
import { FeedCard } from '@/components/feed/feed-card'

export async function ActivityFeedSection() {
  try {
    const items = await getFeedItems()
    return <FeedCard items={items} />
  } catch (err) {
    console.error('[Dashboard/ActivityFeedSection] failed:', err)
    return null
  }
}
