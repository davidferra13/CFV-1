'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getMyPrivateThreads } from '@/lib/hub/private-message-actions'
import type { PrivateThread } from '@/lib/hub/types'
import { PrivateThreadChat } from './private-thread-chat'
import { PrivateThreadList } from './private-thread-list'

interface PrivateMessagesTabProps {
  groupId: string
  chefProfileToken: string
  chefProfileId: string
}

export function PrivateMessagesTab({
  groupId,
  chefProfileToken,
  chefProfileId,
}: PrivateMessagesTabProps) {
  const [threads, setThreads] = useState<PrivateThread[]>([])
  const [selectedThread, setSelectedThread] = useState<PrivateThread | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadThreads() {
      setLoading(true)
      try {
        const result = await getMyPrivateThreads({ groupId, profileToken: chefProfileToken })
        if (!cancelled) setThreads(result)
      } catch {
        if (!cancelled) toast.error('Could not load private conversations')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadThreads()

    return () => {
      cancelled = true
    }
  }, [chefProfileToken, groupId])

  if (loading) {
    return <div className="py-8 text-center text-sm text-stone-500">Loading...</div>
  }

  if (selectedThread) {
    const otherParticipant =
      selectedThread.chef_profile_id === chefProfileId
        ? selectedThread.member_profile
        : selectedThread.chef_profile

    return (
      <PrivateThreadChat
        threadId={selectedThread.id}
        profileToken={chefProfileToken}
        currentProfileId={chefProfileId}
        otherParticipantName={otherParticipant?.display_name ?? 'Private conversation'}
        onBack={() => setSelectedThread(null)}
      />
    )
  }

  return (
    <PrivateThreadList
      threads={threads}
      currentProfileId={chefProfileId}
      onSelectThread={setSelectedThread}
      selectedThreadId={null}
    />
  )
}
