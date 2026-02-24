'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Users, MessageSquare } from 'lucide-react'
import type { SocialChannel } from '@/lib/social/chef-social-actions'
import { joinChannel, leaveChannel } from '@/lib/social/chef-social-actions'
import { Button } from '@/components/ui/button'

// Standalone join/leave button — use this when the full card chrome is already
// rendered by the parent (e.g. the channel detail page header).
export function ChannelJoinButton({
  channelId,
  isMember: initialMember,
}: {
  channelId: string
  isMember: boolean
}) {
  const [isMember, setIsMember] = useState(initialMember)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !isMember
    setIsMember(next)
    startTransition(async () => {
      if (next) await joinChannel(channelId)
      else await leaveChannel(channelId)
    })
  }

  return (
    <Button
      variant={isMember ? 'secondary' : 'primary'}
      onClick={toggle}
      disabled={pending}
      className="text-sm flex-shrink-0"
    >
      {isMember ? 'Joined' : 'Join Channel'}
    </Button>
  )
}

export function SocialChannelCard({ channel }: { channel: SocialChannel }) {
  const [isMember, setIsMember] = useState(channel.is_member)
  const [memberCount, setMemberCount] = useState(channel.member_count)
  const [pending, startTransition] = useTransition()

  function toggleMembership() {
    const next = !isMember
    setIsMember(next)
    setMemberCount((c) => (next ? c + 1 : Math.max(0, c - 1)))

    startTransition(async () => {
      if (next) {
        await joinChannel(channel.id)
      } else {
        await leaveChannel(channel.id)
      }
    })
  }

  return (
    <div
      className="bg-stone-900 rounded-2xl border border-stone-700 shadow-sm p-4 flex items-start gap-4 hover:shadow-md transition-shadow"
      style={{ borderLeft: channel.color ? `3px solid ${channel.color}` : undefined }}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ backgroundColor: channel.color ? `${channel.color}20` : '#f5f5f4' }}
      >
        {channel.icon ?? '💬'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/network/channels/${channel.slug}`}
            className="font-semibold text-stone-100 hover:underline text-sm"
          >
            {channel.name}
          </Link>
          {channel.is_official && (
            <span className="text-xs bg-amber-900 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
              Official
            </span>
          )}
        </div>
        {channel.description && (
          <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{channel.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {memberCount.toLocaleString()} members
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {channel.post_count.toLocaleString()} posts
          </span>
        </div>
      </div>

      {/* Join/Leave button */}
      <Button
        variant={isMember ? 'secondary' : 'primary'}
        onClick={toggleMembership}
        disabled={pending}
        className="text-xs px-3 py-1.5 h-auto flex-shrink-0"
      >
        {isMember ? 'Joined' : 'Join'}
      </Button>
    </div>
  )
}

export function SocialChannelGrid({ channels }: { channels: SocialChannel[] }) {
  const categories = Array.from(new Set(channels.map((c) => c.category)))

  const categoryLabels: Record<string, string> = {
    cuisine: '🍽 Cuisine',
    technique: '📚 Technique',
    business: '💼 Business',
    tools: '🔧 Tools',
    community: '🤝 Community',
    general: '💬 General',
  }

  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
            {categoryLabels[cat] ?? cat}
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {channels
              .filter((c) => c.category === cat)
              .map((ch) => (
                <SocialChannelCard key={ch.id} channel={ch} />
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
