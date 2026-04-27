'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { EventDetailTab } from '@/components/events/event-detail-mobile-nav'
import { EventDetailSection } from '@/components/events/event-detail-mobile-nav'
import { HubFeed } from '@/components/hub/hub-feed'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createCircleForEvent } from '@/lib/hub/chef-circle-actions'
import { getGroupByToken } from '@/lib/hub/group-actions'

type EventDetailChatTabProps = {
  activeTab: EventDetailTab
  eventId: string
  hubGroupToken: string | null
  hubProfileToken: string | null
}

export function EventDetailChatTab({
  activeTab,
  eventId,
  hubGroupToken,
  hubProfileToken,
}: EventDetailChatTabProps) {
  const [token, setToken] = useState(hubGroupToken)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!hubGroupToken)
  const [isPending, startTransition] = useTransition()

  // Fetch group data when token is available
  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      try {
        const group = await getGroupByToken(token!)
        if (cancelled) return
        if (group) {
          setGroupId(group.id)
        }
      } catch {
        // Non-blocking
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  // Resolve chef profile ID from token
  useEffect(() => {
    if (!hubProfileToken || !groupId) return
    let cancelled = false
    async function resolveProfile() {
      try {
        const { getGroupMembers } = await import('@/lib/hub/group-actions')
        const members = await getGroupMembers(groupId!)
        if (cancelled) return
        const match = members.find(
          (m: { profile?: { profile_token?: string }; profile_id: string }) =>
            m.profile?.profile_token === hubProfileToken
        )
        if (match) {
          setProfileId(match.profile_id)
        }
      } catch {
        // Non-blocking
      }
    }
    resolveProfile()
    return () => {
      cancelled = true
    }
  }, [hubProfileToken, groupId])

  function handleCreateCircle() {
    startTransition(async () => {
      try {
        const result = await createCircleForEvent(eventId)
        setToken(result.groupToken)
        setLoading(true)
      } catch {
        toast.error('Failed to create dinner circle')
      }
    })
  }

  return (
    <EventDetailSection tab="chat" activeTab={activeTab}>
      <div className="space-y-4 mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-200">Circle Chat</h2>
          {token && groupId && (
            <Link href={`/hub/g/${token}`} className="text-xs text-brand-500 hover:text-brand-400">
              View full circle &rarr;
            </Link>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <Card className="border-stone-700 p-8 text-center">
            <p className="text-stone-500 text-sm">Loading circle chat...</p>
          </Card>
        )}

        {/* No circle yet */}
        {!loading && !groupId && (
          <Card className="border-stone-700 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-stone-100">No circle yet</h3>
                <p className="text-sm text-stone-400 max-w-lg">
                  Start the dinner circle to chat with your client and coordinate everything for
                  this event in one thread.
                </p>
              </div>
              <Button variant="primary" onClick={handleCreateCircle} disabled={isPending}>
                {isPending ? 'Starting...' : 'Start Dinner Circle'}
              </Button>
            </div>
          </Card>
        )}

        {/* Circle chat feed */}
        {!loading && groupId && token && (
          <Card className="border-stone-700 overflow-hidden">
            <div className="h-[500px] flex flex-col">
              <HubFeed
                groupId={groupId}
                groupToken={token}
                profileToken={hubProfileToken}
                currentProfileId={profileId}
                isOwnerOrAdmin
              />
            </div>
          </Card>
        )}
      </div>
    </EventDetailSection>
  )
}
