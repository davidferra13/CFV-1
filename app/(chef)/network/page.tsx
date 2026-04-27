// Chef Network & Social Hub
// Full social media platform for chef-to-chef interaction.
// Tabs: Feed | Channels | Discover | Connections

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getSocialFeed,
  getActiveStories,
  getMyChannels,
  listChannels,
  getDiscoverChefs,
  getTrendingHashtags,
  getTrendingPosts,
  getPublicChefSocialProfile,
  markSocialNotificationsRead,
} from '@/lib/social/chef-social-actions'
import {
  getMyConnections,
  getPendingRequests,
  getNetworkDiscoverable,
  getNetworkContactShares,
} from '@/lib/network/actions'
import {
  getCollabAvailabilitySignals,
  getCollabInbox,
  getCollabMetrics,
  getCollabUnreadCount,
  getTrustedCircle,
} from '@/lib/network/collab-actions'
import {
  getCollabSpaceSummaries,
  getCollabSpacesUnreadCount,
} from '@/lib/network/collab-space-actions'
import { getChefIntroBridges, type IntroBridgeSummary } from '@/lib/network/intro-bridge-actions'
import { createServerClient } from '@/lib/db/server'
import { SocialFeedClient } from '@/components/social/social-feed-client'
import { SocialChannelGrid } from '@/components/social/social-channel-card'
import { SocialDiscoverPanel } from '@/components/social/social-discover-panel'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ChefSearch } from './chef-search'
import { PendingRequests } from './pending-requests'
import { FriendsList } from './friends-list'
import { ContactShares } from './contact-shares'
import { TrustedCircle } from './trusted-circle'
import { CollabInboxPanel } from './collab-inbox'
import {
  Rss,
  Hash,
  Compass,
  Users,
  ShieldOff,
  Settings,
  Bell,
  Bookmark,
  Handshake,
  Briefcase,
} from '@/components/ui/icons'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { NetworkReferralBar } from '@/components/intelligence/network-referral-bar'

export const metadata: Metadata = { title: 'Chef Community' }

type Tab = 'feed' | 'channels' | 'discover' | 'connections' | 'collab'

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; handoff?: string; notif?: string }>
}) {
  const user = await requireChef()
  const params = await searchParams
  const tab = (params.tab as Tab) ?? 'feed'
  const focusHandoffId = typeof params.handoff === 'string' ? params.handoff : null
  const focusNotificationId = typeof params.notif === 'string' ? params.notif : null

  if (focusNotificationId) {
    try {
      await markSocialNotificationsRead([focusNotificationId])
    } catch (error) {
      console.error('[NetworkPage] Failed to mark notification as read:', error)
    }
  }

  // Get chef's own profile info for composer
  const db = createServerClient({ admin: true })
  const { data: myChef } = await db
    .from('chefs')
    .select('display_name, business_name, profile_image_url')
    .eq('id', user.entityId)
    .single()

  const myName = (myChef as any)?.display_name ?? (myChef as any)?.business_name ?? 'Chef'
  const myAvatar = (myChef as any)?.profile_image_url ?? null

  // Load tab-specific data
  const [discoverable, pending, collabUnreadCount, spacesUnreadCount] = await Promise.all([
    getNetworkDiscoverable(),
    getPendingRequests(),
    getCollabUnreadCount(),
    getCollabSpacesUnreadCount(),
  ])

  const totalCollabBadge = collabUnreadCount + spacesUnreadCount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Chef Community</h1>
          <p className="text-stone-500 mt-1 text-sm">
            Connect, share, and grow with private chefs everywhere
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/network/opportunities"
            className="p-2 rounded-xl text-stone-500 hover:bg-stone-700 transition-colors border border-stone-700"
            title="Opportunity board"
          >
            <Briefcase className="h-5 w-5" />
          </Link>
          <Link
            href="/network/notifications"
            className="p-2 rounded-xl text-stone-500 hover:bg-stone-700 transition-colors border border-stone-700"
            title="Social notifications"
          >
            <Bell className="h-5 w-5" />
          </Link>
          <Link
            href="/network/saved"
            className="p-2 rounded-xl text-stone-500 hover:bg-stone-700 transition-colors border border-stone-700"
            title="Saved posts"
          >
            <Bookmark className="h-5 w-5" />
          </Link>
          <Link
            href="/settings/profile"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-stone-300 bg-stone-900 border border-stone-700 rounded-xl hover:bg-stone-800 transition-colors shadow-sm"
          >
            <Settings className="h-4 w-4" />
            Profile
          </Link>
        </div>
      </div>

      {/* Referral Intelligence */}
      <WidgetErrorBoundary name="Network Referral" compact>
        <Suspense fallback={null}>
          <NetworkReferralBar />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Privacy notice */}
      {!discoverable && (
        <div className="bg-amber-950 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldOff className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              You&apos;re hidden from the community
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              Other chefs can&apos;t find or follow you.{' '}
              <Link href="/settings" className="underline font-medium hover:text-amber-900">
                Enable discoverability in Settings
              </Link>{' '}
              to participate fully.
            </p>
          </div>
        </div>
      )}

      {/* Pending connection requests badge */}
      {pending.length > 0 && (
        <div className="bg-brand-950 border border-brand-200 rounded-xl p-3 flex items-center justify-between">
          <p className="text-sm text-brand-800 font-medium">
            {pending.filter((p) => p.direction === 'received').length} pending connection request(s)
          </p>
          <Link
            href="?tab=connections"
            className="text-sm text-brand-700 font-medium hover:underline"
          >
            View →
          </Link>
        </div>
      )}

      {/* Tab navigation */}
      <div className="bg-stone-900 rounded-2xl border border-stone-700 shadow-sm overflow-hidden">
        <nav className="flex border-b border-stone-800">
          {[
            { id: 'feed', label: 'Feed', icon: Rss, badge: 0 },
            { id: 'channels', label: 'Channels', icon: Hash, badge: 0 },
            { id: 'discover', label: 'Discover', icon: Compass, badge: 0 },
            { id: 'connections', label: 'Connections', icon: Users, badge: 0 },
            { id: 'collab', label: 'Collab', icon: Handshake, badge: totalCollabBadge },
          ].map(({ id, label, icon: Icon, badge }) => (
            <Link
              key={id}
              href={`?tab=${id}`}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-sm font-medium transition-colors ${
                tab === id
                  ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-950/50'
                  : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              {badge > 0 && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-600 px-1.5 py-0.5 text-xxs font-semibold text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4">
          {tab === 'feed' && <FeedTab myName={myName} myAvatar={myAvatar} chefId={user.entityId} />}
          {tab === 'channels' && <ChannelsTab />}
          {tab === 'discover' && <DiscoverTab />}
          {tab === 'connections' && <ConnectionsTab chefId={user.entityId} />}
          {tab === 'collab' && <CollabTab focusHandoffId={focusHandoffId} />}
        </div>
      </div>
    </div>
  )
}

// ── Feed Tab ─────────────────────────────────────────────────
async function FeedTab({
  myName,
  myAvatar,
  chefId,
}: {
  myName: string
  myAvatar: string | null
  chefId: string
}) {
  const [posts, stories, myChannels, allChannels, suggestedChefs, trendingHashtags] =
    await Promise.all([
      getSocialFeed({ mode: 'for_you', limit: 30 }),
      getActiveStories(),
      getMyChannels(),
      listChannels(),
      getDiscoverChefs({ limit: 5 }),
      getTrendingHashtags({ limit: 10 }),
    ])

  return (
    <SocialFeedClient
      initialPosts={posts}
      storyGroups={stories}
      myChannels={myChannels}
      allChannels={allChannels}
      suggestedChefs={suggestedChefs}
      trendingHashtags={trendingHashtags}
      myName={myName}
      myAvatar={myAvatar}
      showSidebar
    />
  )
}

// ── Channels Tab ─────────────────────────────────────────────
async function ChannelsTab() {
  const [channels, myChannels] = await Promise.all([listChannels(), getMyChannels()])

  const joinedSlugs = new Set(myChannels.map((c: any) => c.slug))
  const unjoinedCount = channels.filter((c: any) => !joinedSlugs.has(c.slug)).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          Join channels to connect around specific culinary topics
        </p>
        {unjoinedCount > 0 && (
          <span className="text-xs text-amber-600 font-medium">
            {unjoinedCount} channel{unjoinedCount !== 1 ? 's' : ''} available to join
          </span>
        )}
      </div>
      <SocialChannelGrid channels={channels} />
    </div>
  )
}

// ── Discover Tab ─────────────────────────────────────────────
async function DiscoverTab() {
  const [trending, suggestedChefs, trendingHashtags] = await Promise.all([
    getTrendingPosts({ limit: 10 }),
    getDiscoverChefs({ limit: 20 }),
    getTrendingHashtags({ limit: 20 }),
  ])

  return (
    <div className="space-y-6">
      {/* Trending hashtags full list */}
      <div>
        <h3 className="text-sm font-semibold text-stone-300 mb-3">Trending Hashtags</h3>
        <div className="flex flex-wrap gap-2">
          {trendingHashtags.map((item) => (
            <Link
              key={item.tag}
              href={`?tab=feed&mode=global&tag=${encodeURIComponent(item.tag)}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-950 text-amber-700 rounded-full text-sm font-medium hover:bg-amber-900 transition-colors"
            >
              #{item.tag}
              <span className="text-amber-500 text-xs">{item.post_count}</span>
            </Link>
          ))}
          {trendingHashtags.length === 0 && (
            <p className="text-sm text-stone-400">No trending topics yet</p>
          )}
        </div>
      </div>

      {/* Discover chefs */}
      <SocialDiscoverPanel suggestedChefs={suggestedChefs} trendingHashtags={[]} />

      {/* Trending posts */}
      {trending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-300 mb-3">Trending Posts This Week</h3>
          <div className="space-y-3">
            {trending.map((post) => {
              const authorName = post.author.display_name ?? post.author.business_name
              return (
                <div key={post.id} className="border border-stone-700 rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Link
                      href={`/network/${post.chef_id}`}
                      className="font-medium text-stone-300 hover:underline"
                    >
                      {authorName}
                    </Link>
                    {post.channel && (
                      <>
                        <span>·</span>
                        <Link
                          href={`/network/channels/${post.channel.slug}`}
                          className="text-amber-700 hover:underline"
                        >
                          {post.channel.icon} {post.channel.name}
                        </Link>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-stone-300 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-3 text-xs text-stone-400">
                    <span>🔥 {post.reactions_count}</span>
                    <span>💬 {post.comments_count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Connections Tab ──────────────────────────────────────────
async function ConnectionsTab({ chefId }: { chefId: string }) {
  const [friends, pending, contactShares, trustedCircle] = await Promise.all([
    getMyConnections(),
    getPendingRequests(),
    getNetworkContactShares(),
    getTrustedCircle(),
  ])

  return (
    <div className="space-y-6">
      {/* Header with Add Connection CTA */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">Find and connect with private chefs in your area</p>
        <a
          href="#find-chefs"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-stone-100 bg-amber-700 rounded-xl hover:bg-amber-600 transition-colors shadow-sm flex-shrink-0"
        >
          + Add Connection
        </a>
      </div>

      {/* Search */}
      <Card id="find-chefs" className="scroll-mt-6">
        <CardHeader>
          <CardTitle className="text-base">Find Chefs</CardTitle>
        </CardHeader>
        <CardContent>
          <ChefSearch />
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <PendingRequests requests={pending} />
          </CardContent>
        </Card>
      )}

      {/* Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Connections ({friends.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <FriendsList friends={friends} />
        </CardContent>
      </Card>

      {/* Contact Shares */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Direct Contact Shares</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactShares connections={friends} shares={contactShares} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trusted Circle</CardTitle>
        </CardHeader>
        <CardContent>
          <TrustedCircle connections={friends} initialTrusted={trustedCircle} />
        </CardContent>
      </Card>
    </div>
  )
}

// -- Collaboration Tab --------------------------------------------
async function CollabTab({ focusHandoffId }: { focusHandoffId: string | null }) {
  const [trustedCircle, collabInbox, availabilitySignals, collabMetrics, spaces, bridges] =
    await Promise.all([
      getTrustedCircle(),
      getCollabInbox(80),
      getCollabAvailabilitySignals(),
      getCollabMetrics(90),
      getCollabSpaceSummaries(5),
      getChefIntroBridges(),
    ])

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">
        Structured handoffs for lead swaps, backup coverage, and referrals. Built for fast,
        low-friction chef collaboration.
      </p>
      <CollabInboxPanel
        trustedCircle={trustedCircle}
        initialInbox={collabInbox}
        initialSignals={availabilitySignals}
        initialMetrics={collabMetrics}
        initialFocusHandoffId={focusHandoffId}
      />

      {/* Active Introductions section */}
      {bridges.length > 0 && (
        <div className="mt-6 pt-6 border-t border-stone-700">
          <h3 className="text-sm font-semibold text-stone-200 mb-3">Active Introductions</h3>
          <div className="space-y-2">
            {bridges
              .filter((b: IntroBridgeSummary) => b.status === 'active')
              .map((bridge: IntroBridgeSummary) => (
                <Link
                  key={bridge.id}
                  href={`/network/bridges/${bridge.id}`}
                  className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-800/50 px-3 py-2.5 hover:border-amber-700/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-200 font-medium truncate">
                        {bridge.client_display_name}
                      </span>
                      <span
                        className={`text-xxs border rounded-full px-1.5 py-0.5 ${
                          bridge.intro_mode === 'transfer'
                            ? 'bg-red-900/40 text-red-300 border-red-700/50'
                            : bridge.intro_mode === 'observer'
                              ? 'bg-blue-900/40 text-blue-300 border-blue-700/50'
                              : 'bg-amber-900/40 text-amber-300 border-amber-700/50'
                        }`}
                      >
                        {bridge.intro_mode}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5 truncate">
                      with {bridge.counterpart_chef_name}
                      {bridge.last_message_preview ? ` - ${bridge.last_message_preview}` : ''}
                    </p>
                  </div>
                  {bridge.target_circle_token && (
                    <span className="text-xs text-amber-500 flex-shrink-0 ml-2">Circle ready</span>
                  )}
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Private Spaces section */}
      <div className="mt-6 pt-6 border-t border-stone-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-stone-200">Private Spaces</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Persistent chef-only spaces for ongoing collaboration. Not a Dinner Circle.
            </p>
          </div>
          <Link
            href="/network/collabs"
            className="text-xs text-amber-500 hover:text-amber-400 font-medium"
          >
            New Space
          </Link>
        </div>
        {spaces.length === 0 ? (
          <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4 text-center">
            <p className="text-xs text-stone-500">
              No spaces yet.{' '}
              <Link href="/network/collabs" className="text-amber-500 hover:underline">
                Create one
              </Link>{' '}
              to start ongoing chef collaboration.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {spaces.map((space) => (
              <Link
                key={space.id}
                href={`/network/collabs/${space.id}`}
                className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-800/50 px-3 py-2 hover:border-amber-700/50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm text-stone-200 truncate font-medium">
                    {space.display_name}
                  </span>
                  {space.unread && (
                    <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                </div>
                <span className="text-xs text-stone-500 flex-shrink-0">
                  {space.thread_count} threads
                </span>
              </Link>
            ))}
            {spaces.length >= 5 && (
              <Link
                href="/network/collabs"
                className="block text-center text-xs text-amber-500 hover:text-amber-400 py-1"
              >
                View all spaces
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
