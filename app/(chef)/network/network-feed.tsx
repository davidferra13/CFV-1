// Network Feed - Compose and view posts from connections
'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { NETWORK_FEATURE_DEFINITIONS, type NetworkFeatureKey } from '@/lib/network/features'
import { createNetworkPost, updateNetworkFeaturePreference } from '@/lib/network/actions'
import type { NetworkFeedPost, NetworkFeaturePreference } from '@/lib/network/actions'

interface NetworkFeedProps {
  posts: NetworkFeedPost[]
  connectionCount: number
  featurePreferences: NetworkFeaturePreference[]
}

export function NetworkFeed({ posts, connectionCount, featurePreferences }: NetworkFeedProps) {
  const [preferences, setPreferences] = useState(featurePreferences)
  const [selectedFeature, setSelectedFeature] = useState<NetworkFeatureKey | null>(
    getFirstEnabledFeature(featurePreferences)
  )
  const [content, setContent] = useState('')
  const [postError, setPostError] = useState<string | null>(null)
  const [preferenceError, setPreferenceError] = useState<string | null>(null)
  const [isPostPending, startPostTransition] = useTransition()
  const [isPreferencePending, startPreferenceTransition] = useTransition()
  const router = useRouter()

  const enabledFeatures = useMemo(() => preferences.filter((pref) => pref.enabled), [preferences])

  const trimmedContent = content.trim()
  const remaining = 1000 - trimmedContent.length

  useEffect(() => {
    if (
      selectedFeature &&
      enabledFeatures.some((feature) => feature.feature_key === selectedFeature)
    ) {
      return
    }
    setSelectedFeature(enabledFeatures[0]?.feature_key ?? null)
  }, [enabledFeatures, selectedFeature])

  function handlePost() {
    if (!selectedFeature || !trimmedContent || trimmedContent.length > 1000) return

    setPostError(null)
    startPostTransition(async () => {
      try {
        await createNetworkPost({ content: trimmedContent, feature_key: selectedFeature })
        setContent('')
        router.refresh()
      } catch (err: any) {
        setPostError(err.message || 'Failed to publish post')
      }
    })
  }

  function handleToggleFeature(featureKey: NetworkFeatureKey) {
    const current = preferences.find((pref) => pref.feature_key === featureKey)
    if (!current) return

    const nextEnabled = !current.enabled
    setPreferenceError(null)
    setPreferences((prev) =>
      prev.map((pref) =>
        pref.feature_key === featureKey ? { ...pref, enabled: nextEnabled } : pref
      )
    )

    startPreferenceTransition(async () => {
      try {
        await updateNetworkFeaturePreference({ feature_key: featureKey, enabled: nextEnabled })
        router.refresh()
      } catch (err: any) {
        setPreferences((prev) =>
          prev.map((pref) =>
            pref.feature_key === featureKey ? { ...pref, enabled: current.enabled } : pref
          )
        )
        setPreferenceError(err.message || 'Failed to update feature preference')
      }
    })
  }

  const feedSummary = useMemo<string>(() => {
    if (connectionCount === 0) {
      return 'You can post now. Your updates will appear to chefs as you connect.'
    }
    if (connectionCount === 1) {
      return 'Visible to you and 1 connection.'
    }
    return `Visible to you and ${connectionCount} connections.`
  }, [connectionCount])

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-700 p-4 bg-surface space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-stone-100">Feed Features</p>
            <p className="text-xs text-stone-500 mt-0.5">
              Enable only the feed categories you want to use.
            </p>
          </div>
          <p className="text-xs text-stone-400">
            {enabledFeatures.length} / {preferences.length} enabled
          </p>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {preferences.map((feature) => (
            <div
              key={feature.feature_key}
              className="border border-stone-700 rounded-lg p-3 flex items-start justify-between gap-3"
            >
              <div>
                <p className="text-sm font-medium text-stone-100">{feature.label}</p>
                <p className="text-xs text-stone-500 mt-0.5">{feature.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={feature.enabled}
                disabled={isPreferencePending}
                onClick={() => handleToggleFeature(feature.feature_key)}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                  transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50
                  ${feature.enabled ? 'bg-brand-600' : 'bg-stone-700'}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0
                    transition duration-200 ease-in-out
                    ${feature.enabled ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
          ))}
        </div>

        {preferenceError && <p className="text-sm text-red-700">{preferenceError}</p>}
      </div>

      <div className="rounded-lg border border-stone-700 p-4 bg-surface">
        <label className="block text-sm font-medium text-stone-300 mb-1.5">Post Type</label>
        <select
          value={selectedFeature ?? ''}
          onChange={(event) => setSelectedFeature(event.target.value as NetworkFeatureKey)}
          disabled={enabledFeatures.length === 0 || isPostPending}
          className="block w-full rounded-lg border border-stone-600 bg-surface px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-stone-800 disabled:text-stone-500"
        >
          {enabledFeatures.map((feature) => (
            <option key={feature.feature_key} value={feature.feature_key}>
              {feature.label}
            </option>
          ))}
        </select>

        <Textarea
          placeholder={
            selectedFeature
              ? NETWORK_FEATURE_DEFINITIONS[selectedFeature].placeholder
              : 'Enable at least one feature category to post.'
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={1000}
          rows={3}
          disabled={isPostPending || enabledFeatures.length === 0}
          className="mt-3"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-stone-500">{feedSummary}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">{remaining}</span>
            <Button
              size="sm"
              onClick={handlePost}
              disabled={
                isPostPending ||
                enabledFeatures.length === 0 ||
                !selectedFeature ||
                !trimmedContent ||
                remaining < 0
              }
            >
              <Send className="h-3.5 w-3.5" />
              Post
            </Button>
          </div>
        </div>
        {enabledFeatures.length === 0 && (
          <p className="text-sm text-amber-700 mt-2">
            All feed features are currently disabled. Re-enable at least one to post or view feed
            items.
          </p>
        )}
      </div>

      {postError && (
        <div className="rounded-lg border border-red-200 bg-red-950 p-3">
          <p className="text-sm text-red-700">{postError}</p>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-600 p-8 text-center">
          <p className="text-sm text-stone-400">No feed posts yet.</p>
          <p className="text-xs text-stone-400 mt-1">
            Share your first update to start your network feed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <FeedPostItem key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}

function FeedPostItem({ post }: { post: NetworkFeedPost }) {
  const name = post.author.display_name || post.author.business_name
  const location = [post.author.city, post.author.state].filter(Boolean).join(', ')
  const featureLabel = NETWORK_FEATURE_DEFINITIONS[post.feature_key].label

  return (
    <article className="rounded-lg border border-stone-700 p-4 bg-surface">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {post.author.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.author.profile_image_url}
              alt={name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-brand-900 text-brand-400 text-xs font-semibold flex items-center justify-center">
              {getInitials(name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-100 truncate">
              {name}
              {post.is_mine && <span className="text-stone-500 font-normal"> (You)</span>}
            </p>
            {location && (
              <p className="text-xs text-stone-500 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </p>
            )}
          </div>
        </div>
        <time className="text-xs text-stone-400 shrink-0" dateTime={post.created_at}>
          {formatTimeAgo(post.created_at)}
        </time>
      </div>
      <div className="mt-3">
        <Badge variant="info">{featureLabel}</Badge>
      </div>
      <p className="mt-3 text-sm text-stone-300 whitespace-pre-wrap break-words">{post.content}</p>
    </article>
  )
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getFirstEnabledFeature(preferences: NetworkFeaturePreference[]): NetworkFeatureKey | null {
  return preferences.find((preference) => preference.enabled)?.feature_key ?? null
}
