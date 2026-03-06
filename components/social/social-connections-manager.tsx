'use client'

import { useState } from 'react'
import { ExternalLink, CheckCircle2, AlertCircle, RefreshCw, Unlink } from '@/components/ui/icons'
import type { SocialConnectionStatus } from '@/lib/social/oauth-actions'
import { ConfirmModal } from '@/components/ui/confirm-modal'

// ── Static platform metadata ───────────────────────────────────────────────────

import type { SocialPlatform } from '@/lib/social/types'

type PlatformMeta = {
  id: SocialPlatform
  label: string
  description: string
  bgClass: string
  textClass: string
  docsUrl: string
  requirement: string
}

const PLATFORMS: PlatformMeta[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    description: 'Feed posts, Reels, and carousels via Meta Content Publishing API.',
    bgClass: 'bg-pink-500',
    textClass: 'text-pink-700',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api/content-publishing',
    requirement: 'Requires a Business or Creator Instagram account linked to a Facebook Page.',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    description: 'Page posts, photos, and videos. Shares the same OAuth flow as Instagram.',
    bgClass: 'bg-blue-600',
    textClass: 'text-blue-700',
    docsUrl: 'https://developers.facebook.com/docs/pages/publishing',
    requirement: 'Requires a Facebook Business Page (not personal profile).',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    description: 'Video posts via TikTok Content Posting API.',
    bgClass: 'bg-stone-900',
    textClass: 'text-stone-300',
    docsUrl: 'https://developers.tiktok.com/doc/content-posting-api-get-started',
    requirement: 'Requires a TikTok Business account. Video content only.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    description: 'Posts to your personal profile or a company page.',
    bgClass: 'bg-sky-700',
    textClass: 'text-sky-700',
    docsUrl:
      'https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api',
    requirement: 'Requires LinkedIn Marketing Developer Platform access.',
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    description: 'Tweets with images and videos via X API v2.',
    bgClass: 'bg-neutral-950',
    textClass: 'text-neutral-700',
    docsUrl: 'https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/introduction',
    requirement: 'Requires an X Developer account (Basic plan or above, ~$100/mo).',
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    description: 'Pins to your boards via Pinterest API v5.',
    bgClass: 'bg-red-600',
    textClass: 'text-red-700',
    docsUrl: 'https://developers.pinterest.com/docs/api/v5/',
    requirement: 'Requires a Pinterest Business account.',
  },
  {
    id: 'youtube_shorts',
    label: 'YouTube Shorts',
    description: 'Vertical videos under 60 seconds via YouTube Data API.',
    bgClass: 'bg-red-500',
    textClass: 'text-red-700',
    docsUrl: 'https://developers.google.com/youtube/v3/guides/uploading_a_video',
    requirement: 'Requires a Google account with a YouTube channel. Vertical video ≤ 60s.',
  },
]

// ── Props ──────────────────────────────────────────────────────────────────────

type Props = {
  connections: SocialConnectionStatus[]
  /** Flash a "just connected" message for this platform (from URL ?connected=...) */
  justConnected?: string | null
}

// ── Component ──────────────────────────────────────────────────────────────────

export function SocialConnectionsManager({ connections, justConnected }: Props) {
  const connMap = new Map(connections.map((c) => [c.platform, c]))
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null)

  function handleDisconnect(platform: string) {
    setDisconnectTarget(platform)
  }

  async function handleConfirmedDisconnect() {
    if (!disconnectTarget) return
    const platform = disconnectTarget
    setDisconnectTarget(null)
    setDisconnecting(platform)
    try {
      const res = await fetch(`/api/integrations/social/disconnect/${platform}`, {
        method: 'POST',
      })
      if (res.ok) {
        // Hard-reload so the server re-fetches the connections list
        window.location.reload()
      } else {
        alert('Disconnect failed — please try again.')
      }
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Explainer banner */}
      <div className="bg-brand-950 border border-brand-100 rounded-xl px-5 py-4">
        <h3 className="font-semibold text-brand-200 mb-1">How platform connections work</h3>
        <p className="text-sm text-brand-400 leading-relaxed">
          Connect your accounts once with a secure OAuth flow — ChefFlow never stores your password.
          Once connected, posts you mark as <strong>Queued</strong> will automatically publish at
          their scheduled time. You can disconnect any platform at any time.
        </p>
      </div>

      {/* Just-connected flash */}
      {justConnected && (
        <div className="flex items-center gap-2 bg-emerald-950 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>
            <strong className="capitalize">{justConnected.replace('_', ' ')}</strong> connected
            successfully.
          </span>
        </div>
      )}

      {/* Platform cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {PLATFORMS.map((platform) => {
          const conn = connMap.get(platform.id)
          const isConnected = conn?.isConnected ?? false
          const isDisconnecting = disconnecting === platform.id

          return (
            <div
              key={platform.id}
              className="bg-stone-900 rounded-xl border border-stone-700 p-5 space-y-3"
            >
              {/* Header row */}
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex-shrink-0 ${platform.bgClass}`}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-stone-100">{platform.label}</span>
                    <ConnectionBadge conn={conn ?? null} />
                  </div>

                  {/* Account handle / page name */}
                  {isConnected && conn && (
                    <p className="text-xs text-stone-500 mt-0.5 truncate">
                      {conn.accountHandle
                        ? conn.accountHandle
                        : conn.accountName
                          ? conn.accountName
                          : 'Connected'}
                      {conn.metaPageName && ` · Page: ${conn.metaPageName}`}
                    </p>
                  )}

                  {!isConnected && (
                    <p className="text-xs text-stone-500 mt-0.5 leading-snug">
                      {platform.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Error notice */}
              {isConnected && conn?.lastError && conn.errorCount > 0 && (
                <div className="flex items-start gap-2 bg-amber-950 border border-amber-100 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-800 leading-snug">
                    {conn.lastError} ({conn.errorCount} error{conn.errorCount !== 1 ? 's' : ''}).
                    Reconnect to reset.
                  </p>
                </div>
              )}

              {/* Token expiry warning */}
              {isConnected && conn?.tokenExpiresAt && isExpiringSoon(conn.tokenExpiresAt) && (
                <div className="flex items-center gap-2 bg-amber-950 border border-amber-100 rounded-lg px-3 py-2">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-800">
                    Access token expires {formatRelativeDate(conn.tokenExpiresAt)}. Reconnect to
                    refresh.
                  </p>
                </div>
              )}

              {/* Requirements note (shown only when not connected) */}
              {!isConnected && (
                <p className="text-xs text-amber-700 bg-amber-950 border border-amber-100 rounded-lg px-3 py-2 leading-snug">
                  {platform.requirement}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <>
                    {/* Reconnect button */}
                    <a
                      href={`/api/integrations/social/connect/${platform.id}`}
                      className="flex-1 text-center text-sm font-medium py-2 rounded-lg border border-stone-600 text-stone-300 bg-stone-900 hover:bg-stone-800 transition-colors"
                    >
                      Reconnect
                    </a>
                    {/* Disconnect button */}
                    <button
                      type="button"
                      onClick={() => handleDisconnect(platform.id)}
                      disabled={isDisconnecting}
                      className="flex items-center gap-1 text-sm font-medium py-2 px-3 rounded-lg border border-red-200 text-red-600 bg-red-950 hover:bg-red-900 transition-colors disabled:opacity-50"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  </>
                ) : (
                  <a
                    href={`/api/integrations/social/connect/${platform.id}`}
                    className="flex-1 text-center text-sm font-medium py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                  >
                    Connect {platform.label}
                  </a>
                )}

                <a
                  href={platform.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-stone-300 hover:text-stone-300 transition-colors flex-shrink-0"
                  aria-label={`${platform.label} API documentation`}
                >
                  Docs
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmModal
        open={disconnectTarget !== null}
        title={`Disconnect ${disconnectTarget ?? ''}?`}
        description="ChefFlow will no longer be able to post to this account."
        confirmLabel="Disconnect"
        variant="danger"
        loading={disconnecting !== null}
        onConfirm={handleConfirmedDisconnect}
        onCancel={() => setDisconnectTarget(null)}
      />
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ConnectionBadge({ conn }: { conn: SocialConnectionStatus | null }) {
  if (!conn?.isConnected) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-stone-800 text-stone-500">
        Not connected
      </span>
    )
  }

  const hasErrors = (conn.errorCount ?? 0) > 0
  const expiringSoon = conn.tokenExpiresAt ? isExpiringSoon(conn.tokenExpiresAt) : false

  if (hasErrors || expiringSoon) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-950 text-amber-700 ring-1 ring-inset ring-amber-800">
        Needs attention
      </span>
    )
  }

  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-950 text-emerald-700 ring-1 ring-inset ring-emerald-800">
      Connected
    </span>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isExpiringSoon(expiresAt: string): boolean {
  const ms = new Date(expiresAt).getTime() - Date.now()
  return ms > 0 && ms < 7 * 24 * 60 * 60 * 1000 // within 7 days
}

function formatRelativeDate(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'soon'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}
