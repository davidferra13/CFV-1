'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { HubGuestProfile, HubGuestEventHistory, HubGroup } from '@/lib/hub/types'
import { HubProfileEditor } from '@/components/hub/hub-profile-editor'
import { updateProfile } from '@/lib/hub/profile-actions'

type Tab = 'dinners' | 'groups' | 'dietary'

interface ProfileViewProps {
  profile: HubGuestProfile
  eventHistory: HubGuestEventHistory[]
  groups: (HubGroup & { memberRole: string; unreadCount: number })[]
}

export function ProfileView({ profile: initialProfile, eventHistory, groups }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('dinners')
  const [profile, setProfile] = useState(initialProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [editingDietary, setEditingDietary] = useState(false)
  const [dietaryAllergies, setDietaryAllergies] = useState('')
  const [dietaryRestrictions, setDietaryRestrictions] = useState('')
  const [dietaryPending, startDietaryTransition] = useTransition()
  const [dietaryError, setDietaryError] = useState<string | null>(null)

  const initials = profile.display_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const tabs: { id: Tab; label: string; emoji: string; count?: number }[] = [
    { id: 'dinners', label: 'My Dinners', emoji: '🍽️', count: eventHistory.length },
    { id: 'groups', label: 'My Groups', emoji: '👥', count: groups.length },
    { id: 'dietary', label: 'Dietary', emoji: '🥗' },
  ]

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Profile header */}
      <div className="border-b border-stone-800 bg-stone-900/80 px-4 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-stone-700 text-2xl font-bold text-stone-300">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                width={80}
                height={80}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <h1 className="text-xl font-bold text-stone-100">{profile.display_name}</h1>
          {profile.bio && <p className="mt-1 text-sm text-stone-400">{profile.bio}</p>}
          <div className="mt-3 flex justify-center gap-4 text-xs text-stone-500">
            <span>
              {eventHistory.length} dinner{eventHistory.length !== 1 ? 's' : ''}
            </span>
            <span>
              {groups.length} group{groups.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="mt-3 rounded-full bg-stone-800 px-4 py-1.5 text-xs font-medium text-stone-400 hover:bg-stone-700 hover:text-stone-200"
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* Edit form */}
      {isEditing && (
        <div className="mx-auto max-w-2xl px-4 py-4">
          <HubProfileEditor
            profile={profile}
            onSaved={(updated) => {
              setProfile(updated)
              setIsEditing(false)
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="mx-auto max-w-2xl">
        <div className="flex gap-1 border-b border-stone-800 px-4 pt-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-[#e88f47] bg-stone-800/50 text-stone-200'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="rounded-full bg-stone-800 px-1.5 py-0.5 text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'dinners' && (
            <div className="space-y-3">
              {eventHistory.length === 0 ? (
                <div className="py-12 text-center text-sm text-stone-600">
                  Your dinner history will appear here once you attend an event. You'll see menus,
                  dates, chefs, and more.
                </div>
              ) : (
                eventHistory.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-stone-800 bg-stone-900/50 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-stone-200">
                          {event.occasion ?? 'Private Dinner'}
                        </h3>
                        <p className="mt-0.5 text-xs text-stone-500">
                          by {event.chef_name ?? 'Chef'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-stone-400">
                          {event.event_date
                            ? new Date(event.event_date).toLocaleDateString()
                            : 'TBD'}
                        </div>
                        {event.rsvp_status && (
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
                              event.rsvp_status === 'attending'
                                ? 'bg-green-500/10 text-green-400'
                                : event.rsvp_status === 'declined'
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'bg-stone-700 text-stone-400'
                            }`}
                          >
                            {event.rsvp_status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Courses served */}
                    {Array.isArray(event.courses_served) && event.courses_served.length > 0 && (
                      <div className="mt-3 border-t border-stone-800 pt-3">
                        <p className="mb-1 text-xs font-medium text-stone-500">Menu</p>
                        <div className="space-y-1">
                          {(event.courses_served as { name?: string }[]).map((course, i) => (
                            <div key={i} className="text-xs text-stone-400">
                              {course.name ?? `Course ${i + 1}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="space-y-2">
              {groups.length === 0 ? (
                <div className="py-12 text-center text-sm text-stone-600">
                  Your dinner groups will show up here. Ask your host or chef for an invite link, or
                  get added when you RSVP to an event.
                </div>
              ) : (
                groups.map((group) => (
                  <Link
                    key={group.id}
                    href={`/hub/g/${group.group_token}`}
                    className="flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-900/50 p-4 transition-colors hover:bg-stone-800/50"
                  >
                    <span className="text-2xl">{group.emoji ?? '👥'}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate text-sm font-semibold text-stone-200">
                        {group.name}
                      </h3>
                      {group.last_message_preview && (
                        <p className="truncate text-xs text-stone-500">
                          {group.last_message_preview}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {group.unreadCount > 0 && (
                        <div className="mb-1 inline-block rounded-full bg-[#e88f47] px-2 py-0.5 text-xs font-bold text-white">
                          {group.unreadCount}
                        </div>
                      )}
                      <div className="text-xs text-stone-500">
                        {group.message_count} msg{group.message_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {activeTab === 'dietary' && (
            <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-300">Your Dietary Information</h3>
                {!editingDietary && (
                  <button
                    type="button"
                    onClick={() => {
                      setDietaryAllergies((profile.known_allergies ?? []).join(', '))
                      setDietaryRestrictions((profile.known_dietary ?? []).join(', '))
                      setDietaryError(null)
                      setEditingDietary(true)
                    }}
                    className="rounded-full bg-stone-800 px-3 py-1 text-xs text-stone-400 hover:bg-stone-700 hover:text-stone-200"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editingDietary ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500">
                      Allergies <span className="text-stone-600">(comma-separated)</span>
                    </label>
                    <input
                      value={dietaryAllergies}
                      onChange={(e) => setDietaryAllergies(e.target.value)}
                      placeholder="Shellfish, Tree nuts, Dairy"
                      className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-[#e88f47]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500">
                      Dietary Restrictions <span className="text-stone-600">(comma-separated)</span>
                    </label>
                    <input
                      value={dietaryRestrictions}
                      onChange={(e) => setDietaryRestrictions(e.target.value)}
                      placeholder="Vegetarian, Gluten-free"
                      className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-[#e88f47]"
                    />
                  </div>
                  {dietaryError && <p className="text-xs text-red-400">{dietaryError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={dietaryPending}
                      onClick={() => {
                        startDietaryTransition(async () => {
                          try {
                            const updated = await updateProfile({
                              profileToken: profile.profile_token,
                              known_allergies: dietaryAllergies
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                              known_dietary: dietaryRestrictions
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                            setProfile(updated)
                            setEditingDietary(false)
                          } catch (err) {
                            setDietaryError(err instanceof Error ? err.message : 'Failed to save')
                          }
                        })
                      }}
                      className="rounded-lg bg-[#e88f47] px-4 py-2 text-xs font-semibold text-white disabled:opacity-30"
                    >
                      {dietaryPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingDietary(false)}
                      className="rounded-lg bg-stone-800 px-4 py-2 text-xs text-stone-400 hover:bg-stone-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">
                      Allergies
                    </p>
                    {(profile.known_allergies?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.known_allergies.map((a) => (
                          <span
                            key={a}
                            className="rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-400"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-600">No allergies recorded</p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">
                      Dietary Restrictions
                    </p>
                    {(profile.known_dietary?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.known_dietary.map((d) => (
                          <span
                            key={d}
                            className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-400"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-600">No dietary restrictions recorded</p>
                    )}
                  </div>
                </div>
              )}

              <p className="mt-4 text-xs text-stone-600">
                This info is automatically shared with chefs when you RSVP to events.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-800 bg-stone-900/50 px-4 py-3 text-center">
        <span className="text-xs text-stone-600">
          Powered by <span className="font-medium text-[#e88f47]">ChefFlow</span>
        </span>
      </footer>
    </div>
  )
}
