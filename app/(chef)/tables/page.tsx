import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getChefCircles } from '@/lib/hub/chef-circle-actions'
import { getChefSocialFeed } from '@/lib/hub/social-feed-actions'
import { getSocialFeed } from '@/lib/social/chef-social/posts'
import { getFollowCounts } from '@/lib/social/chef-social/follows'
import { getUnreadSocialNotificationCount } from '@/lib/social/chef-social/notifications'
import { getOpenTables } from '@/lib/hub/open-tables-actions'
import { getTrendingHashtags } from '@/lib/social/chef-social/discovery'
import {
  normalizeHubFeedItem,
  normalizeChefSocialPost,
  unifyFeeds,
} from '@/lib/tables/feed-unification'
import { TablesStrip, type TableBubble } from '@/components/tables/tables-strip'
import { TablesStatsRow, type StatCard } from '@/components/tables/tables-stats-row'
import { TablesFeed } from '@/components/tables/tables-feed'

export const metadata: Metadata = { title: 'Tables' }

const CIRCLE_GRADIENTS = [
  'linear-gradient(135deg, #92400e, #d97706)',
  'linear-gradient(135deg, #065f46, #10b981)',
  'linear-gradient(135deg, #1e3a5f, #3b82f6)',
  'linear-gradient(135deg, #581c87, #7c3aed)',
  'linear-gradient(135deg, #7f1d1d, #dc2626)',
  'linear-gradient(135deg, #713f12, #ca8a04)',
  'linear-gradient(135deg, #134e4a, #14b8a6)',
  'linear-gradient(135deg, #be185d, #ec4899)',
]

export default async function TablesPage() {
  const user = await requireChef()

  return (
    <div className="min-h-screen">
      <div
        className="border-b border-stone-800 px-6 lg:px-8 pt-6"
        style={{
          background: 'linear-gradient(180deg, rgba(237,168,107,0.08) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[28px] font-bold text-stone-100 font-display-serif">Tables</h1>
            <p className="text-sm text-stone-500 mt-0.5">Your social world outside the kitchen</p>
          </div>
          <div className="flex gap-2">
            <Suspense
              fallback={<div className="h-9 w-9 rounded-full bg-stone-800 animate-pulse" />}
            >
              <NotificationBellAsync />
            </Suspense>
            <Link
              href="/network?tab=discover"
              className="h-9 px-3.5 rounded-full border border-stone-700 bg-surface-accent text-sm text-stone-300 flex items-center gap-1.5 hover:border-stone-600 hover:bg-surface transition-colors"
            >
              🔍 Search people
            </Link>
            <Link
              href="/circles/admin"
              className="h-9 px-3.5 rounded-full bg-brand-600 border border-brand-600 text-sm text-white flex items-center hover:bg-brand-500 transition-colors"
            >
              + Create Table
            </Link>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="flex gap-3 pb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[52px] h-[52px] rounded-full bg-stone-800 animate-pulse"
                />
              ))}
            </div>
          }
        >
          <TablesStripAsync />
        </Suspense>

        <div className="flex">
          {(['Feed', 'Discover', 'People', 'Community', 'Content Studio'] as const).map(
            (tab, i) => (
              <Link
                key={tab}
                href={
                  i === 0
                    ? '/tables'
                    : i === 1
                      ? '/explore'
                      : i === 2
                        ? '/network?tab=connections'
                        : i === 3
                          ? '/community'
                          : '/marketing/social'
                }
                className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                  i === 0
                    ? 'text-brand-400 border-brand-500'
                    : 'text-stone-400 border-transparent hover:text-stone-200'
                }`}
              >
                {tab}
              </Link>
            )
          )}
        </div>
      </div>

      <div className="px-6 lg:px-8 py-6 max-w-[1200px]">
        <Suspense
          fallback={
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-stone-800/50 animate-pulse" />
              ))}
            </div>
          }
        >
          <StatsRowAsync entityId={user.entityId} />
        </Suspense>

        <div className="flex gap-2 mb-5 flex-wrap">
          {[
            { label: '📝 Post to Network', href: '/network?tab=feed' },
            { label: '🔍 Find a Chef', href: '/explore/discover' },
            { label: '📊 View Benchmarks', href: '/community/benchmarks' },
            { label: '🤝 Share a Lead', href: '/network?tab=collab' },
            { label: '📋 Browse Templates', href: '/community/templates' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="px-3.5 py-1.5 rounded-full bg-surface-accent border border-stone-700 text-xs text-stone-300 hover:bg-surface hover:text-stone-100 hover:border-stone-600 transition-colors"
            >
              {action.label}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <Suspense
            fallback={
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-36 rounded-xl bg-stone-800/50 animate-pulse" />
                ))}
              </div>
            }
          >
            <FeedAsync />
          </Suspense>

          <Suspense
            fallback={
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-48 rounded-xl bg-stone-800/50 animate-pulse" />
                ))}
              </div>
            }
          >
            <SidebarAsync />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

async function NotificationBellAsync() {
  const count = await getUnreadSocialNotificationCount()
  return (
    <Link
      href="/network/notifications"
      className="relative h-9 w-9 rounded-full border border-stone-700 bg-surface-accent flex items-center justify-center text-stone-300 hover:border-stone-600 transition-colors"
    >
      🔔
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-medium">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}

async function TablesStripAsync() {
  const circles = await getChefCircles()
  const bubbles: TableBubble[] = (circles || []).slice(0, 8).map((c, i) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji || null,
    token: c.group_token,
    gradient: CIRCLE_GRADIENTS[i % CIRCLE_GRADIENTS.length],
    hasUnread: (c.unread_count ?? 0) > 0,
  }))
  return <TablesStrip tables={bubbles} />
}

async function StatsRowAsync({ entityId }: { entityId: string }) {
  const [circles, openTables, followCounts] = await Promise.all([
    getChefCircles(),
    getOpenTables().catch(() => []),
    getFollowCounts(entityId).catch(() => ({ followers: 0, following: 0 })),
  ])

  const unreadCount = (circles || []).filter((c) => (c.unread_count ?? 0) > 0).length

  const stats: StatCard[] = [
    {
      icon: '🪑',
      label: 'Active Tables',
      value: unreadCount > 0 ? `${unreadCount} with unread` : 'All caught up',
      count: (circles || []).length,
      color: 'amber',
      href: '/circles',
    },
    {
      icon: '🌐',
      label: 'Open Tables',
      value: 'Browse nearby',
      count: (openTables || []).length,
      color: 'emerald',
      href: '/hub/open-tables',
    },
    {
      icon: '👥',
      label: 'Connections',
      value: 'Find people',
      count: followCounts.followers + followCounts.following,
      color: 'blue',
      href: '/network?tab=connections',
    },
    {
      icon: '📱',
      label: 'Content Queue',
      value: 'Manage posts',
      count: 0,
      color: 'purple',
      href: '/marketing/social',
    },
  ]

  return <TablesStatsRow stats={stats} />
}

async function FeedAsync() {
  const [hubFeed, socialFeed] = await Promise.all([
    getChefSocialFeed({ limit: 10 }).catch(() => ({ items: [], nextCursor: null })),
    getSocialFeed({ mode: 'for_you', limit: 10 }).catch(() => []),
  ])

  const hubPosts = hubFeed.items.map(normalizeHubFeedItem)
  const socialPosts = socialFeed.map(normalizeChefSocialPost)
  const unified = unifyFeeds(hubPosts, socialPosts)

  return <TablesFeed posts={unified} />
}

async function SidebarAsync() {
  const [openTables, trendingTags] = await Promise.all([
    getOpenTables().catch(() => []),
    getTrendingHashtags().catch(() => []),
  ])

  return (
    <div className="space-y-4">
      {(openTables || []).length > 0 && (
        <SidebarSection title="Open Tables Nearby" seeAllHref="/hub/open-tables">
          {(openTables || []).slice(0, 3).map((table: any) => (
            <Link
              key={table.id}
              href={`/hub/join/${table.group_token}`}
              className="block p-2.5 rounded-lg bg-stone-700/30 hover:bg-stone-700/50 transition-colors mb-2"
            >
              <div className="text-xs font-semibold text-stone-200">
                {table.emoji || '🪑'} {table.display_name || table.group_name}
              </div>
              <div className="text-[10px] text-stone-500 flex gap-2 mt-0.5">
                <span>{table.display_area || 'Nearby'}</span>
                {table.open_seats && (
                  <span className="text-emerald-400">{table.open_seats} seats open</span>
                )}
              </div>
            </Link>
          ))}
        </SidebarSection>
      )}

      {(trendingTags || []).length > 0 && (
        <SidebarSection title="Trending Topics">
          <div className="flex flex-wrap gap-1.5">
            {(trendingTags || []).slice(0, 8).map((tag) => (
              <span
                key={tag.tag}
                className="text-xs px-2.5 py-1 rounded-full bg-stone-700/40 text-stone-300 cursor-pointer hover:bg-brand-950 hover:text-brand-400 transition-colors"
              >
                #{tag.tag}
              </span>
            ))}
          </div>
        </SidebarSection>
      )}

      <SidebarSection title="Content Studio" seeAllHref="/marketing/social" seeAllLabel="Manage">
        <Link
          href="/marketing/social"
          className="block p-2.5 rounded-lg bg-stone-700/30 hover:bg-stone-700/50 transition-colors"
        >
          <div className="text-xs text-stone-300">Social media planner</div>
          <div className="text-[10px] text-stone-500 mt-0.5">Schedule and publish content</div>
        </Link>
      </SidebarSection>
    </div>
  )
}

function SidebarSection({
  title,
  seeAllHref,
  seeAllLabel = 'See all',
  children,
}: {
  title: string
  seeAllHref?: string
  seeAllLabel?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl border border-stone-700/40 bg-surface-accent p-4"
      style={{
        backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-stone-100">{title}</div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-[11px] text-brand-400 font-medium hover:text-brand-300 transition-colors"
          >
            {seeAllLabel}
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}
