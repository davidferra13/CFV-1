'use client'

import { useState, useEffect } from 'react'
import type { HubGroup, HubGroupMember, HubPinnedNote } from '@/lib/hub/types'
import { ThemedWrapper } from '@/components/hub/themed-wrapper'
import { HubFeed } from '@/components/hub/hub-feed'
import { HubMemberList } from '@/components/hub/hub-member-list'
import { HubNotesBoard } from '@/components/hub/hub-notes-board'

type Tab = 'chat' | 'events' | 'photos' | 'notes' | 'members'

interface HubGroupViewProps {
  group: HubGroup
  members: HubGroupMember[]
  notes: HubPinnedNote[]
}

export function HubGroupView({ group, members, notes }: HubGroupViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [profileToken, setProfileToken] = useState<string | null>(null)
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)
  const [currentMember, setCurrentMember] = useState<HubGroupMember | null>(null)

  // Read profile token from cookie
  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find((c) => c.startsWith('hub_profile_token='))
      ?.split('=')[1]

    if (token) {
      setProfileToken(token)
      // Find matching member
      const member = members.find((m) => m.profile?.profile_token === token)
      if (member) {
        setCurrentProfileId(member.profile_id)
        setCurrentMember(member)
      }
    }
  }, [members])

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'chat', label: 'Chat', emoji: '💬' },
    { id: 'events', label: 'Events', emoji: '🍽️' },
    { id: 'photos', label: 'Photos', emoji: '📸' },
    { id: 'notes', label: 'Notes', emoji: '📝' },
    { id: 'members', label: 'Members', emoji: '👥' },
  ]

  const memberAvatars = members.slice(0, 5)

  return (
    <ThemedWrapper theme={group.theme} className="flex min-h-screen flex-col bg-stone-950">
      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-900/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            {group.emoji && <span className="text-2xl">{group.emoji}</span>}
            <div className="flex-1 min-w-0">
              <h1 className="truncate text-lg font-bold text-stone-100">{group.name}</h1>
              {group.description && (
                <p className="truncate text-xs text-stone-500">{group.description}</p>
              )}
            </div>

            {/* Member avatars */}
            <div className="flex -space-x-2">
              {memberAvatars.map((m) => {
                const initial = (m.profile?.display_name ?? '?')[0].toUpperCase()
                return (
                  <div
                    key={m.id}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-stone-900 bg-stone-700 text-xs font-medium text-stone-300"
                    title={m.profile?.display_name}
                  >
                    {initial}
                  </div>
                )
              })}
              {members.length > 5 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-stone-900 bg-stone-800 text-xs text-stone-500">
                  +{members.length - 5}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-3 flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[var(--hub-primary,#e88f47)] text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden">
        {activeTab === 'chat' && (
          <HubFeed
            groupId={group.id}
            profileToken={profileToken}
            currentProfileId={currentProfileId}
          />
        )}

        {activeTab === 'events' && (
          <div className="p-4">
            <h3 className="mb-4 text-sm font-semibold text-stone-300">🍽️ Events</h3>
            <div className="py-8 text-center text-sm text-stone-600">
              Events linked to this group will appear here.
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="p-4">
            <h3 className="mb-4 text-sm font-semibold text-stone-300">📸 Photos</h3>
            <div className="py-8 text-center text-sm text-stone-600">
              Shared photos will appear here.
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <HubNotesBoard
            groupId={group.id}
            notes={notes}
            profileToken={profileToken}
            canPost={currentMember?.can_post ?? false}
          />
        )}

        {activeTab === 'members' && (
          <HubMemberList members={members} currentProfileId={currentProfileId} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800 bg-stone-900/50 px-4 py-2 text-center">
        <span className="text-xs text-stone-600">
          Powered by <span className="font-medium text-[var(--hub-primary,#e88f47)]">ChefFlow</span>
        </span>
      </footer>
    </ThemedWrapper>
  )
}
