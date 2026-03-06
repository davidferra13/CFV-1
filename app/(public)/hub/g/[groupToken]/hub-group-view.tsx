'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type {
  HubGroup,
  HubGroupMember,
  HubPinnedNote,
  HubMedia,
  HubGroupEvent,
} from '@/lib/hub/types'
import type { HubAvailability } from '@/lib/hub/availability-actions'
import { ThemedWrapper } from '@/components/hub/themed-wrapper'
import { HubFeed } from '@/components/hub/hub-feed'
import { HubMemberList } from '@/components/hub/hub-member-list'
import { HubNotesBoard } from '@/components/hub/hub-notes-board'
import { HubPhotoGallery } from '@/components/hub/hub-photo-gallery'
import { HubAvailabilityGrid } from '@/components/hub/hub-availability-grid'
import { HubMessageSearch } from '@/components/hub/hub-message-search'

type Tab = 'chat' | 'events' | 'photos' | 'notes' | 'schedule' | 'members' | 'search'

interface HubGroupViewProps {
  group: HubGroup
  members: HubGroupMember[]
  notes: HubPinnedNote[]
  media: HubMedia[]
  availability: HubAvailability[]
  groupEvents: HubGroupEvent[]
  profileToken?: string
}

export function HubGroupView({
  group,
  members,
  notes,
  media,
  availability,
  groupEvents,
  profileToken: profileTokenProp,
}: HubGroupViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [profileToken, setProfileToken] = useState<string | null>(profileTokenProp ?? null)
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)
  const [currentMember, setCurrentMember] = useState<HubGroupMember | null>(null)

  // Read profile token from prop or cookie, and sync cookie for child components
  useEffect(() => {
    let token = profileTokenProp ?? null

    // Fall back to cookie if no prop provided (public hub route)
    if (!token) {
      token =
        document.cookie
          .split('; ')
          .find((c) => c.startsWith('hub_profile_token='))
          ?.split('=')[1] ?? null
    }

    if (token) {
      // Set cookie client-side so child hub components can read it
      document.cookie = `hub_profile_token=${token}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
      setProfileToken(token)
      // Find matching member
      const member = members.find((m) => m.profile?.profile_token === token)
      if (member) {
        setCurrentProfileId(member.profile_id)
        setCurrentMember(member)
      }
    }
  }, [members, profileTokenProp])

  const tabs: { id: Tab; label: string; emoji: string; count?: number }[] = [
    { id: 'chat', label: 'Chat', emoji: '💬' },
    { id: 'events', label: 'Events', emoji: '🍽️', count: groupEvents.length },
    { id: 'photos', label: 'Photos', emoji: '📸', count: media.length },
    { id: 'schedule', label: 'Schedule', emoji: '📅', count: availability.length },
    { id: 'notes', label: 'Notes', emoji: '📝', count: notes.length },
    { id: 'members', label: 'Members', emoji: '👥', count: members.length },
    { id: 'search', label: 'Search', emoji: '🔍' },
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

            {/* My Hub link */}
            {profileToken && currentMember?.profile?.profile_token && (
              <Link
                href={`/hub/me/${currentMember.profile.profile_token}`}
                className="rounded-full bg-stone-800 px-3 py-1 text-xs text-stone-400 hover:bg-stone-700 hover:text-stone-200"
              >
                My Hub
              </Link>
            )}

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
          <div className="mt-3 flex gap-1 overflow-x-auto scrollbar-none">
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
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs leading-none">
                    {tab.count}
                  </span>
                )}
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
            <h3 className="mb-4 text-sm font-semibold text-stone-300">Events</h3>
            {groupEvents.length === 0 ? (
              <div className="py-12 text-center text-sm text-stone-600">
                No events linked yet. Events will appear here when your group plans a dinner!
              </div>
            ) : (
              <div className="space-y-3">
                {groupEvents.map((ge) => (
                  <div
                    key={ge.id}
                    className="rounded-xl border border-stone-800 bg-stone-900/50 p-4"
                  >
                    <p className="text-sm text-stone-300">
                      Event linked on {new Date(ge.added_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <HubPhotoGallery
            groupId={group.id}
            media={media}
            profileToken={profileToken}
            canPost={currentMember?.can_post ?? false}
          />
        )}

        {activeTab === 'schedule' && (
          <HubAvailabilityGrid
            groupId={group.id}
            availabilityPolls={availability}
            profileToken={profileToken}
            canPost={currentMember?.can_post ?? false}
          />
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

        {activeTab === 'search' && <HubMessageSearch groupId={group.id} />}
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
