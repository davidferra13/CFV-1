'use server'

import { requireChef } from '@/lib/auth/get-user'
import { assembleRailForPage } from '@/lib/discovery/universal-rail-assembly'
import { groupFeedItems } from './aggregation'
import type { FeedItem } from './aggregation'

/**
 * Fetch aggregated feed items for the current chef.
 * Assembles the universal rail for the dashboard context,
 * then groups similar items via the feed aggregation engine.
 */
export async function getFeedItems(): Promise<FeedItem[]> {
  const user = await requireChef()

  const result = await assembleRailForPage('chef', 'dashboard', user.id, user.tenantId ?? undefined)

  return groupFeedItems(result.items)
}
