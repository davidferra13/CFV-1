'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import type {
  HubGroup,
  HubGroupMember,
  HubPinnedNote,
  HubMedia,
  HubGroupEvent,
  MealBoardEntry,
} from '@/lib/hub/types'
import type { HubAvailability } from '@/lib/hub/availability-actions'
import { ThemedWrapper } from '@/components/hub/themed-wrapper'
import { HubFeed } from '@/components/hub/hub-feed'
import { HubMemberList } from '@/components/hub/hub-member-list'
import { HubNotesBoard } from '@/components/hub/hub-notes-board'
import { HubPhotoGallery } from '@/components/hub/hub-photo-gallery'
import { HubAvailabilityGrid } from '@/components/hub/hub-availability-grid'
import { HubMessageSearch } from '@/components/hub/hub-message-search'
import { HubGroupSettings } from '@/components/hub/hub-group-settings'
import { WeeklyMealBoard } from '@/components/hub/weekly-meal-board'
import { toggleMuteCircle, updateMemberNotificationPreferences } from '@/lib/hub/group-actions'
import { NotificationPreferences } from '@/components/hub/notification-preferences'
import { CircleClientStatus } from '@/components/hub/circle-client-status'
import { LifecycleClientView } from '@/components/hub/lifecycle-client-view'
import { HubQuickActions } from '@/components/hub/hub-quick-actions'
import type { GuestCriticalPathResult } from '@/lib/lifecycle/critical-path'

type Tab =
  | 'chat'
  | 'meals'
  | 'events'
  | 'photos'
  | 'notes'
  | 'schedule'
  | 'members'
  | 'search'
  | 'settings'

interface HubGroupViewProps {
  group: HubGroup
  members: HubGroupMember[]
  notes: HubPinnedNote[]
  media: HubMedia[]
  availability: HubAvailability[]
  groupEvents: HubGroupEvent[]
  mealBoardEntries: MealBoardEntry[]
  profileToken?: string
  guestStatus?: GuestCriticalPathResult | null
  linkedEventId?: string | null
  lifecycleStages?: {
    stageNumber: number
    stageName: string
    checkpoints: { label: string; status: string; value?: string }[]
  }[]
}

export function HubGroupView({
  group,
  members,
  notes,
  media,
  availability,
  groupEvents,
  mealBoardEntries,
  profileToken: profileTokenProp,
  guestStatus,
  linkedEventId,
  lifecycleStages,
}: HubGroupViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>(((group as any).default_tab as Tab) || 'chat')
  const [localGroup, setLocalGroup] = useState<HubGroup>(group)
  const [profileToken, setProfileToken] = useState<string | null>(profileTokenProp ?? null)
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)
  const [currentMember, setCurrentMember] = useState<HubGroupMember | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [mutePending, startMuteTransition] = useTransition()
  const [showNotifPrefs, setShowNotifPrefs] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  // Show welcome card on first visit
  useEffect(() => {
    const key = `hub-welcome-${group.id}`
    if (!localStorage.getItem(key)) {
      setShowWelcome(true)
    }
  }, [group.id])

  const dismissWelcome = () => {
    localStorage.setItem(`hub-welcome-${group.id}`, '1')
    setShowWelcome(false)
  }

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
        setIsMuted(member.notifications_muted)
      }
    }
  }, [members, profileTokenProp])

  const isOwnerOrAdmin = currentMember
    ? ['owner', 'admin', 'chef'].includes(currentMember.role)
    : false

  const baseTabs: { id: Tab; label: string; emoji: string; count?: number }[] = [
    { id: 'chat', label: 'Chat', emoji: '💬' },
    { id: 'meals', label: 'Meals', emoji: '🍽️' },
    { id: 'members', label: 'Members', emoji: '👥', count: members.length },
    { id: 'photos', label: 'Photos', emoji: '📸', count: media.length },
    // Conditional tabs: only show when they have content
    ...(groupEvents.length > 0
      ? [{ id: 'events' as Tab, label: 'Events', emoji: '🍽️', count: groupEvents.length }]
      : []),
    ...(availability.length > 0
      ? [{ id: 'schedule' as Tab, label: 'Schedule', emoji: '📅', count: availability.length }]
      : []),
    ...(notes.length > 0
      ? [{ id: 'notes' as Tab, label: 'Notes', emoji: '📝', count: notes.length }]
      : []),
    { id: 'search', label: 'Search', emoji: '🔍' },
  ]

  const tabs = isOwnerOrAdmin
    ? [...baseTabs, { id: 'settings' as Tab, label: 'Settings', emoji: '⚙️' }]
    : baseTabs

  const memberAvatars = members.slice(0, 5)

  return (
    <ThemedWrapper theme={localGroup.theme} className="flex min-h-screen flex-col bg-stone-950">
      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-900/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            {localGroup.emoji && <span className="text-2xl">{localGroup.emoji}</span>}
            <div className="flex-1 min-w-0">
              <h1 className="truncate text-lg font-bold text-stone-100">{localGroup.name}</h1>
              {localGroup.description && (
                <p className="truncate text-xs text-stone-500">{localGroup.description}</p>
              )}
            </div>

            {/* Notification bell (opens preferences) */}
            {profileToken && currentMember && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifPrefs(!showNotifPrefs)}
                  className="rounded-full bg-stone-800 p-1.5 text-stone-400 hover:bg-stone-700 hover:text-stone-200"
                  title="Notification settings"
                >
                  {isMuted ? (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                    </svg>
                  )}
                </button>

                {/* Notification preferences dropdown */}
                {showNotifPrefs && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifPrefs(false)} />
                    <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-stone-700 bg-stone-900 p-4 shadow-xl">
                      <NotificationPreferences
                        groupId={group.id}
                        profileToken={profileToken!}
                        initialPrefs={{
                          notifications_muted: isMuted,
                          notify_email: currentMember.notify_email ?? true,
                          notify_push: currentMember.notify_push ?? true,
                          quiet_hours_start: currentMember.quiet_hours_start ?? null,
                          quiet_hours_end: currentMember.quiet_hours_end ?? null,
                          digest_mode: currentMember.digest_mode ?? 'instant',
                        }}
                        onSave={async (prefs) => {
                          const result = await updateMemberNotificationPreferences({
                            groupId: group.id,
                            profileToken: profileToken!,
                            prefs,
                          })
                          if (result.success && 'notifications_muted' in prefs) {
                            setIsMuted(prefs.notifications_muted as boolean)
                          }
                          return result
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* My Profile link */}
            {profileToken && currentMember?.profile?.profile_token && (
              <Link
                href={`/hub/me/${currentMember.profile.profile_token}`}
                className="rounded-full bg-stone-800 px-3 py-1 text-xs text-stone-400 hover:bg-stone-700 hover:text-stone-200"
              >
                My Profile
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

      {/* Guest Status Banner (persistent, above content) */}
      {guestStatus && (guestStatus.confirmed.length > 0 || guestStatus.missing.length > 0) && (
        <div className="mx-auto w-full max-w-2xl">
          <CircleClientStatus status={guestStatus} />
        </div>
      )}

      {/* Lifecycle Progress (client-visible checkpoints) */}
      {lifecycleStages && lifecycleStages.length > 0 && (
        <div className="mx-auto w-full max-w-2xl px-4 mt-3">
          <LifecycleClientView stages={lifecycleStages} />
        </div>
      )}

      {/* Persistent quick actions - visible on every tab, not buried in Chat */}
      {profileToken && linkedEventId && (
        <div className="mx-auto w-full max-w-2xl px-4 pt-3">
          <HubQuickActions groupId={group.id} profileToken={profileToken} eventId={linkedEventId} />
        </div>
      )}

      {/* Join prompt for guests without a profile token */}
      {!profileToken && (
        <div className="sticky bottom-0 z-20 border-t border-stone-700 bg-stone-900/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <p className="text-sm text-stone-400">
              Join this circle to chat, update your details, and see the full plan.
            </p>
            <Link
              href={`/hub/join/${group.group_token}`}
              className="shrink-0 rounded-lg bg-[var(--hub-primary,#e88f47)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Join
            </Link>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden">
        {showWelcome && (
          <div className="m-4 rounded-xl border border-stone-700 bg-stone-800/80 p-4">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold text-stone-200">
                Welcome to your dinner circle
              </h3>
              <button
                type="button"
                onClick={dismissWelcome}
                title="Dismiss welcome"
                className="rounded p-1 text-stone-500 hover:text-stone-300"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-stone-400">
              <li>💬 Chat with your group and the chef</li>
              <li>📸 Share and browse photos from events</li>
              <li>🥗 Update your dietary needs so the chef can plan</li>
              <li>👥 See who else is in your dinner circle</li>
            </ul>
          </div>
        )}

        {activeTab === 'chat' && (
          <HubFeed
            groupId={group.id}
            profileToken={profileToken}
            currentProfileId={currentProfileId}
            isOwnerOrAdmin={isOwnerOrAdmin}
          />
        )}

        {activeTab === 'meals' && (
          <WeeklyMealBoard
            groupId={group.id}
            initialEntries={mealBoardEntries}
            profileToken={profileToken}
            isChefOrAdmin={isOwnerOrAdmin}
          />
        )}

        {activeTab === 'events' && (
          <div className="p-4">
            <h3 className="mb-4 text-sm font-semibold text-stone-300">Events</h3>
            {groupEvents.length === 0 ? (
              <div className="py-12 text-center text-sm text-stone-600">
                No events scheduled yet. When a date is set and details are confirmed, event info,
                menus, and RSVPs will appear here.
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
          <HubMemberList
            members={members}
            groupId={group.id}
            currentProfileId={currentProfileId}
            profileToken={profileToken}
            isOwnerOrAdmin={isOwnerOrAdmin}
            shareLink={typeof window !== 'undefined' ? window.location.href : undefined}
          />
        )}

        {activeTab === 'search' && <HubMessageSearch groupId={group.id} />}

        {activeTab === 'settings' && isOwnerOrAdmin && profileToken && (
          <div className="p-4">
            <HubGroupSettings
              group={localGroup}
              profileToken={profileToken}
              onUpdated={(updated) => setLocalGroup(updated)}
            />
          </div>
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
