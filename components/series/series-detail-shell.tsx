'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { SeriesPost, SeriesHost, SeriesConfig } from '@/lib/series'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type SeriesData = {
  id: string
  name: string
  description: string | null
  groupToken: string
  slug: string | null
  config: SeriesConfig
  isActive: boolean
  createdAt: string
  myHost: SeriesHost | null
}

type TabKey = 'feed' | 'hosts' | 'settings'

interface SeriesDetailShellProps {
  series: SeriesData
  posts: SeriesPost[]
  hosts: SeriesHost[]
}

const POST_TYPE_LABELS: Record<string, string> = {
  update: 'Update',
  sourcing: 'Sourcing',
  menu_preview: 'Menu Preview',
  behind_scenes: 'Behind the Scenes',
  announcement: 'Announcement',
  recap: 'Recap',
  transparency: 'Transparency',
  milestone: 'Milestone',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function SeriesDetailShell({ series, posts, hosts }: SeriesDetailShellProps) {
  const [tab, setTab] = useState<TabKey>('feed')

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'feed', label: 'Feed' },
    { key: 'hosts', label: 'Hosts' },
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Link
            href="/series"
            className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
          >
            Series
          </Link>
          <span className="text-stone-600">/</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-stone-100">{series.name}</h1>
        {series.config.tagline && (
          <p className="mt-1 text-sm text-stone-400">{series.config.tagline}</p>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-stone-800/50 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-stone-700 text-stone-100' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'feed' && <FeedTab posts={posts} />}
      {tab === 'hosts' && <HostsTab hosts={hosts} />}
      {tab === 'settings' && <SettingsTab series={series} />}
    </div>
  )
}

/* ---------- Feed Tab ---------- */

function FeedTab({ posts }: { posts: SeriesPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-8 text-center">
        <p className="text-sm text-stone-400">No posts yet. Share an update with your circle.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {post.authorAvatarUrl ? (
                  <img
                    src={post.authorAvatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-700 text-xs font-medium text-stone-300">
                    {(post.authorName ?? 'H')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-100 truncate">
                    {post.authorName ?? 'Host'}
                  </p>
                  <p className="text-xs text-stone-500">
                    {post.authorRole ? `${post.authorRole} · ` : ''}
                    {formatDateTime(post.publishedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {post.pinned && (
                  <Badge variant="info" className="text-xs">
                    Pinned
                  </Badge>
                )}
                <Badge variant="default" className="text-xs">
                  {POST_TYPE_LABELS[post.postType] ?? post.postType}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {post.title && <p className="mb-1 font-medium text-stone-100">{post.title}</p>}
            <p className="text-sm text-stone-300 whitespace-pre-line">{post.body}</p>
            {post.imageUrls.length > 0 && (
              <p className="mt-2 text-xs text-stone-500">
                {post.imageUrls.length} {post.imageUrls.length === 1 ? 'image' : 'images'}
              </p>
            )}
            {post.linkUrl && (
              <a
                href={post.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-amber-500 hover:text-amber-400"
              >
                {post.linkLabel ?? post.linkUrl}
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/* ---------- Hosts Tab ---------- */

function HostsTab({ hosts }: { hosts: SeriesHost[] }) {
  if (hosts.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-8 text-center">
        <p className="text-sm text-stone-400">No hosts found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {hosts.map((host) => (
        <Card key={host.id}>
          <CardContent className="flex items-center gap-4 py-4">
            {host.avatarUrl ? (
              <img src={host.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-700 text-sm font-medium text-stone-300">
                {host.displayName[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-100 truncate">{host.displayName}</p>
              <p className="text-xs text-stone-400">{host.displayRole}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={host.status === 'active' ? 'success' : 'warning'} className="text-xs">
                {host.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="pt-2">
        <p className="text-xs text-stone-500">
          Permissions per host:{' '}
          {hosts
            .filter((h) => h.status === 'active')
            .map((h) => {
              const perms = Object.entries(h.permissions)
                .filter(([, v]) => v)
                .map(([k]) =>
                  k
                    .replace('can', '')
                    .replace(/([A-Z])/g, ' $1')
                    .trim()
                )
              return perms.length > 0 ? `${h.displayName}: ${perms.join(', ')}` : null
            })
            .filter(Boolean)
            .join(' | ')}
        </p>
      </div>
    </div>
  )
}

/* ---------- Settings Tab ---------- */

function SettingsTab({ series }: { series: SeriesData }) {
  const { config } = series

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 py-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-stone-500">
              Name
            </label>
            <p className="mt-1 text-sm text-stone-100">{series.name}</p>
          </div>

          {series.description && (
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-stone-500">
                Description
              </label>
              <p className="mt-1 text-sm text-stone-300">{series.description}</p>
            </div>
          )}

          {config.tagline && (
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-stone-500">
                Tagline
              </label>
              <p className="mt-1 text-sm text-stone-300">{config.tagline}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-stone-500">
              URL Slug
            </label>
            <p className="mt-1 text-sm text-stone-300">{series.slug ?? 'Not set'}</p>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-stone-500">
              Group Token
            </label>
            <p className="mt-1 font-mono text-xs text-stone-400">{series.groupToken}</p>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-stone-500">
              Created
            </label>
            <p className="mt-1 text-sm text-stone-300">{formatDate(series.createdAt)}</p>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-stone-500">
              Approval Mode
            </label>
            <p className="mt-1 text-sm text-stone-300 capitalize">{config.approvalMode}</p>
          </div>

          {config.maxMembers && (
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-stone-500">
                Max Members
              </label>
              <p className="mt-1 text-sm text-stone-300">{config.maxMembers}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
