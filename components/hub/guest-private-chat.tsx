'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getMyPrivateThreads, getOrCreatePrivateThread } from '@/lib/hub/private-message-actions'
import type { PrivateThread } from '@/lib/hub/types'
import { PrivateThreadChat } from './private-thread-chat'

interface GuestPrivateChatProps {
  groupId: string
  profileToken: string
  currentProfileId: string
  chefProfileId: string
  chefName: string
}

export function GuestPrivateChat({
  groupId,
  profileToken,
  currentProfileId,
  chefProfileId,
  chefName,
}: GuestPrivateChatProps) {
  const [thread, setThread] = useState<PrivateThread | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadThread() {
      setLoading(true)
      try {
        const result = await getMyPrivateThreads({ groupId, profileToken })
        if (!cancelled) setThread(result[0] ?? null)
      } catch {
        if (!cancelled) toast.error('Could not load private conversation')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadThread()

    return () => {
      cancelled = true
    }
  }, [groupId, profileToken])

  const startConversation = async () => {
    if (!chefProfileId || creating) return

    setCreating(true)
    try {
      const newThread = await getOrCreatePrivateThread({
        groupId,
        profileToken,
        targetProfileId: chefProfileId,
      })
      setThread(newThread)
    } catch {
      toast.error('Could not start private conversation')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return <div className="p-4 text-center text-sm text-stone-500">Loading...</div>
  }

  if (thread) {
    return (
      <div className="p-4">
        <PrivateThreadChat
          threadId={thread.id}
          profileToken={profileToken}
          currentProfileId={currentProfileId}
          otherParticipantName={chefName}
        />
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="rounded-lg border border-stone-700 bg-stone-900 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-800 text-lg font-semibold text-stone-200">
          {chefName.charAt(0).toUpperCase()}
        </div>
        <h3 className="mt-3 text-sm font-semibold text-stone-100">Message {chefName}</h3>
        <p className="mt-1 text-sm text-stone-400">
          Start a private conversation with the chef for sensitive details.
        </p>
        <button
          type="button"
          onClick={startConversation}
          disabled={creating || !chefProfileId}
          className="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? 'Starting...' : 'Start a private conversation'}
        </button>
      </div>
    </div>
  )
}
