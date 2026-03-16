'use client'

import { useState, useTransition, useCallback } from 'react'
import { RefreshCw } from '@/components/ui/icons'
import type {
  SocialPost,
  SocialChannel,
  StoryGroup,
  SocialPostAuthor,
} from '@/lib/social/chef-social-actions'
import { getSocialFeed, getChannelFeed, getActiveStories } from '@/lib/social/chef-social-actions'
import { SocialPostCard } from './social-post-card'
import { SocialPostComposer } from './social-post-composer'
import { SocialStoryBar } from './social-story-bar'
import { SocialDiscoverPanel } from './social-discover-panel'
import { toast } from 'sonner'

type FeedMode = 'for_you' | 'following' | 'global'

export function SocialFeedClient({
  initialPosts,
  storyGroups,
  myChannels,
  allChannels,
  suggestedChefs,
  trendingHashtags,
  myName,
  myAvatar,
  showSidebar = true,
  // When provided, the feed is scoped to this channel - mode tabs are hidden
  // and all load/refresh operations use getChannelFeed instead of getSocialFeed.
  channelSlug,
  defaultChannelId,
}: {
  initialPosts: SocialPost[]
  storyGroups: StoryGroup[]
  myChannels: SocialChannel[]
  allChannels: SocialChannel[]
  suggestedChefs: SocialPostAuthor[]
  trendingHashtags: Array<{ tag: string; post_count: number }>
  myName: string
  myAvatar?: string | null
  showSidebar?: boolean
  channelSlug?: string
  defaultChannelId?: string
}) {
  const isChannelFeed = !!channelSlug

  const [mode, setMode] = useState<FeedMode>('for_you')
  const [posts, setPosts] = useState<SocialPost[]>(initialPosts)
  const [stories, setStories] = useState<StoryGroup[]>(storyGroups)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialPosts.length >= 30)
  const [, startTransition] = useTransition()

  const reloadFeed = useCallback(
    (newMode?: FeedMode) => {
      startTransition(async () => {
        try {
          const fresh = isChannelFeed
            ? await getChannelFeed({ channelSlug: channelSlug!, limit: 30 })
            : await getSocialFeed({ mode: newMode ?? mode, limit: 30 })
          setPosts(fresh)
          setHasMore(fresh.length >= 30)
        } catch (err) {
          toast.error('Failed to load feed')
        }
      })
    },
    [isChannelFeed, channelSlug, mode]
  )

  const reloadStories = useCallback(() => {
    startTransition(async () => {
      try {
        const fresh = await getActiveStories()
        setStories(fresh)
      } catch (err) {
        toast.error('Failed to load stories')
      }
    })
  }, [])

  function switchMode(m: FeedMode) {
    setMode(m)
    reloadFeed(m)
  }

  async function loadMore() {
    if (!posts.length) return
    setLoadingMore(true)
    const before = posts[posts.length - 1].created_at
    const more = isChannelFeed
      ? await getChannelFeed({ channelSlug: channelSlug!, limit: 30, before })
      : await getSocialFeed({ mode, limit: 30, before })
    setPosts((p) => [...p, ...more])
    setHasMore(more.length >= 30)
    setLoadingMore(false)
  }

  function handlePostDeleted(id: string) {
    setPosts((p) => p.filter((post) => post.id !== id))
  }

  function handlePosted() {
    reloadFeed()
  }

  const tabs: Array<{ value: FeedMode; label: string }> = [
    { value: 'for_you', label: 'For You' },
    { value: 'following', label: 'Following' },
    { value: 'global', label: 'All Chefs' },
  ]

  return (
    <div className={showSidebar ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : 'space-y-4'}>
      {/* Main feed */}
      <div className={showSidebar ? 'lg:col-span-2 space-y-4' : 'space-y-4'}>
        {/* Story bar */}
        <SocialStoryBar groups={stories} onRefresh={reloadStories} />

        {/* Composer - defaults to posting in the current channel when channelSlug is set */}
        <SocialPostComposer
          myName={myName}
          myAvatar={myAvatar}
          channels={myChannels}
          defaultChannelId={defaultChannelId}
          onPosted={handlePosted}
        />

        {/* Feed header: mode tabs on main feed, simple refresh-only on channel feed */}
        <div className="bg-stone-900 rounded-2xl border border-stone-700 shadow-sm overflow-hidden">
          <div className="flex border-b border-stone-800">
            {isChannelFeed ? (
              <div className="flex-1 flex items-center px-4 py-3">
                <span className="text-sm font-medium text-stone-400">Channel Posts</span>
              </div>
            ) : (
              tabs.map((tab) => (
                <button
                  type="button"
                  key={tab.value}
                  onClick={() => switchMode(tab.value)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    mode === tab.value
                      ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-950/50'
                      : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))
            )}
            <button
              onClick={() => reloadFeed()}
              className="px-4 py-3 text-stone-400 hover:text-stone-400 transition-colors"
              title="Refresh feed"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Posts */}
          <div className="divide-y divide-stone-800">
            {posts.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-stone-400 text-sm">
                  {isChannelFeed
                    ? 'No posts in this channel yet - be the first!'
                    : mode === 'following'
                      ? 'Follow some chefs to see their posts here'
                      : 'No posts yet - be the first!'}
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="p-4">
                  <SocialPostCard post={post} onDelete={handlePostDeleted} />
                </div>
              ))
            )}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="p-4 border-t border-stone-800">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full text-sm text-amber-700 font-medium hover:text-amber-800 py-2 rounded-xl hover:bg-amber-950 transition-colors"
              >
                {loadingMore ? 'Loading...' : 'Load more posts'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="space-y-4">
          <SocialDiscoverPanel
            suggestedChefs={suggestedChefs}
            trendingHashtags={trendingHashtags}
          />
        </div>
      )}
    </div>
  )
}
