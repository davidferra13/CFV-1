'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { HubFeed } from '@/components/hub/hub-feed'
import type { HubGroup, HubGroupMember } from '@/lib/hub/types'
import {
  leaveIntroductionBridgeAsSource,
  markIntroductionBridgeComplete,
} from '@/lib/network/intro-bridge-actions'

interface HubBridgeViewProps {
  group: HubGroup
  members: HubGroupMember[]
  profileToken: string | null
  currentProfileId: string | null
  bridgeId: string | null
  introMode: string | null
  bridgeStatus: string | null
  isSourceChef: boolean
  isTargetChef: boolean
  targetCircleToken: string | null
  clientDisplayName: string | null
}

export function HubBridgeView({
  group,
  members,
  profileToken,
  currentProfileId,
  bridgeId,
  introMode,
  bridgeStatus,
  isSourceChef,
  isTargetChef,
  targetCircleToken,
  clientDisplayName,
}: HubBridgeViewProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const modeBadgeClass =
    introMode === 'transfer'
      ? 'bg-red-900/40 text-red-300 border-red-700/50'
      : introMode === 'observer'
        ? 'bg-blue-900/40 text-blue-300 border-blue-700/50'
        : 'bg-amber-900/40 text-amber-300 border-amber-700/50'

  function handleLeaveBridge() {
    if (!bridgeId) return
    startTransition(async () => {
      try {
        const result = await leaveIntroductionBridgeAsSource({ bridgeId })
        if (result.success) {
          toast.success('You have left the intro thread.')
          router.push('/network?tab=collab')
        } else {
          toast.error(result.error || 'Failed to leave.')
        }
      } catch {
        toast.error('Failed to leave intro thread.')
      }
    })
  }

  function handleMarkComplete() {
    if (!bridgeId) return
    startTransition(async () => {
      try {
        const result = await markIntroductionBridgeComplete({ bridgeId })
        if (result.success) {
          toast.success('Introduction marked complete.')
          router.refresh()
        } else {
          toast.error(result.error || 'Failed to mark complete.')
        }
      } catch {
        toast.error('Failed to mark complete.')
      }
    })
  }

  const isChef = isSourceChef || isTargetChef
  const isActive = bridgeStatus === 'active'

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-stone-100">
              {group.name || `Introduction: ${clientDisplayName || 'Client'}`}
            </h1>
            <p className="text-sm text-stone-400 mt-0.5">
              Temporary intro thread between chefs and client
            </p>
          </div>
          <div className="flex items-center gap-2">
            {introMode && (
              <span className={`text-xs border rounded-full px-2.5 py-0.5 ${modeBadgeClass}`}>
                {introMode}
              </span>
            )}
            {bridgeStatus && bridgeStatus !== 'active' && (
              <span className="text-xs border rounded-full px-2.5 py-0.5 bg-stone-800 text-stone-400 border-stone-600">
                {bridgeStatus.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Participants */}
        <div className="flex items-center gap-2 mt-3">
          {members.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-800 px-2.5 py-1 text-xs text-stone-300"
            >
              {m.profile?.avatar_url ? (
                <img
                  src={m.profile.avatar_url}
                  alt=""
                  className="h-4 w-4 rounded-full object-cover"
                />
              ) : (
                <span className="h-4 w-4 rounded-full bg-stone-700 flex items-center justify-center text-xxs">
                  {(m.profile?.display_name || '?').charAt(0)}
                </span>
              )}
              {m.profile?.display_name?.split(' ')[0] || 'Unknown'}
              {m.role === 'chef' && <span className="text-amber-400 text-xxs">(chef)</span>}
            </span>
          ))}
        </div>

        {/* Action strip */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-700">
          {targetCircleToken && (
            <Link href={`/hub/g/${targetCircleToken}`} target="_blank">
              <Button variant="primary" size="sm">
                Open Dinner Circle
              </Button>
            </Link>
          )}

          {isChef && isActive && (
            <Button variant="ghost" size="sm" onClick={handleMarkComplete} disabled={pending}>
              Mark Intro Complete
            </Button>
          )}

          {isSourceChef && isActive && introMode === 'transfer' && (
            <Button variant="ghost" size="sm" onClick={handleLeaveBridge} disabled={pending}>
              Leave Intro Thread
            </Button>
          )}

          {isChef && (
            <Link href="/network?tab=collab">
              <Button variant="ghost" size="sm">
                Back to Network
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Message feed */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 overflow-hidden h-[calc(100vh-300px)]">
        <HubFeed
          groupId={group.id}
          profileToken={profileToken}
          currentProfileId={currentProfileId}
          isOwnerOrAdmin={isChef}
        />
      </div>
    </div>
  )
}
