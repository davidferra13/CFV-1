'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { HubGuestProfile, HubGuestEventHistory, HubGroup } from '@/lib/hub/types'
import { HubProfileEditor } from '@/components/hub/hub-profile-editor'
import { updateProfile } from '@/lib/hub/profile-actions'

type Tab = 'upcoming' | 'dinners' | 'groups' | 'dietary'
type SpiceTolerance = NonNullable<HubGuestProfile['spice_tolerance']>

const spiceToleranceLabels: Record<SpiceTolerance, string> = {
  mild: 'Mild',
  medium: 'Medium',
  hot: 'Hot',
  extra_hot: 'Extra Hot',
}

const spiceToleranceOptions: { value: SpiceTolerance; label: string }[] = [
  { value: 'mild', label: 'Mild' },
  { value: 'medium', label: 'Medium' },
  { value: 'hot', label: 'Hot' },
  { value: 'extra_hot', label: 'Extra Hot' },
]

function parseCommaSeparated(value: string) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

interface UpcomingEvent {
  id: string
  occasion: string | null
  event_date: string | null
  location_city: string | null
  share_token: string
  chef_name: string | null
  circle_name: string | null
  circle_token: string | null
  ticket_types: { name: string; price_cents: number; capacity: number | null; sold_count: number }[]
}

interface ProfileViewProps {
  profile: HubGuestProfile
  eventHistory: HubGuestEventHistory[]
  upcomingEvents: UpcomingEvent[]
  groups: (HubGroup & { memberRole: string; unreadCount: number })[]
}

export function ProfileView({
  profile: initialProfile,
  eventHistory,
  upcomingEvents,
  groups,
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>(
    upcomingEvents.length > 0 ? 'upcoming' : 'dinners'
  )
  const [profile, setProfile] = useState(initialProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [editingDietary, setEditingDietary] = useState(false)
  const [dietaryAllergies, setDietaryAllergies] = useState('')
  const [dietaryRestrictions, setDietaryRestrictions] = useState('')
  const [dietaryDislikes, setDietaryDislikes] = useState((profile.dislikes ?? []).join(', '))
  const [dietaryFavorites, setDietaryFavorites] = useState((profile.favorites ?? []).join(', '))
  const [spiceTolerance, setSpiceTolerance] = useState<HubGuestProfile['spice_tolerance']>(
    profile.spice_tolerance
  )
  const [cuisinePreferences, setCuisinePreferences] = useState(
    (profile.cuisine_preferences ?? []).join(', ')
  )
  const [dietaryPending, startDietaryTransition] = useTransition()
  const [dietaryError, setDietaryError] = useState<string | null>(null)

  const initials = profile.display_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const tabs: { id: Tab; label: string; emoji: string; count?: number }[] = [
    {
      id: 'upcoming',
      label: 'Upcoming',
      emoji: '🔥',
      count: upcomingEvents.length > 0 ? upcomingEvents.length : undefined,
    },
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
          {activeTab === 'upcoming' && (
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <div className="py-12 text-center text-sm text-stone-600">
                  No upcoming dinners from your circles right now. When a chef in one of your
                  circles posts a new event, it will appear here.
                </div>
              ) : (
                upcomingEvents.map((event) => {
                  // Calculate price range and availability
                  let priceDisplay = ''
                  let spotsDisplay = ''
                  if (event.ticket_types.length > 0) {
                    const prices = event.ticket_types.map((t) => t.price_cents)
                    const min = Math.min(...prices)
                    const max = Math.max(...prices)
                    priceDisplay =
                      min === max
                        ? `$${(min / 100).toFixed(0)}`
                        : `$${(min / 100).toFixed(0)} - $${(max / 100).toFixed(0)}`

                    const totalCap = event.ticket_types.reduce((s, t) => s + (t.capacity ?? 0), 0)
                    const totalSold = event.ticket_types.reduce((s, t) => s + t.sold_count, 0)
                    const remaining = totalCap - totalSold
                    if (totalCap > 0) {
                      spotsDisplay = remaining > 0 ? `${remaining} spots left` : 'Sold out'
                    }
                  }

                  return (
                    <a
                      key={event.id}
                      href={`/e/${event.share_token}`}
                      className="block rounded-xl border border-stone-800 bg-stone-900/50 p-4 transition-colors hover:border-[#e88f47]/50 hover:bg-stone-800/50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-stone-200">
                            {event.occasion ?? 'Upcoming Dinner'}
                          </h3>
                          <p className="mt-0.5 text-xs text-stone-500">
                            by {event.chef_name ?? 'Chef'}
                            {event.circle_name ? ` in ${event.circle_name}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-stone-300">
                            {event.event_date
                              ? new Date(event.event_date + 'T12:00:00').toLocaleDateString(
                                  'en-US',
                                  {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                  }
                                )
                              : 'Date TBD'}
                          </div>
                          {event.location_city && (
                            <div className="mt-0.5 text-xs text-stone-500">
                              {event.location_city}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-stone-800 pt-3">
                        <div className="flex gap-3 text-xs">
                          {priceDisplay && (
                            <span className="text-stone-400">{priceDisplay}/person</span>
                          )}
                          {spotsDisplay && (
                            <span
                              className={
                                spotsDisplay === 'Sold out' ? 'text-red-400' : 'text-green-400'
                              }
                            >
                              {spotsDisplay}
                            </span>
                          )}
                        </div>
                        <span className="rounded-full bg-[#78350f] px-3 py-1 text-xs font-medium text-white">
                          {spotsDisplay === 'Sold out' ? 'Sold Out' : 'Get Tickets'}
                        </span>
                      </div>
                    </a>
                  )
                })
              )}
            </div>
          )}

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
                      setDietaryDislikes((profile.dislikes ?? []).join(', '))
                      setDietaryFavorites((profile.favorites ?? []).join(', '))
                      setSpiceTolerance(profile.spice_tolerance)
                      setCuisinePreferences((profile.cuisine_preferences ?? []).join(', '))
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
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500">
                      Dislikes <span className="text-stone-600">(comma-separated)</span>
                    </label>
                    <textarea
                      value={dietaryDislikes}
                      onChange={(e) => setDietaryDislikes(e.target.value)}
                      placeholder="e.g. cilantro, blue cheese, liver"
                      rows={2}
                      className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-[#e88f47]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500">
                      Favorites <span className="text-stone-600">(comma-separated)</span>
                    </label>
                    <textarea
                      value={dietaryFavorites}
                      onChange={(e) => setDietaryFavorites(e.target.value)}
                      placeholder="e.g. truffle, wagyu, fresh pasta"
                      rows={2}
                      className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 outline-none ring-1 ring-stone-700 placeholder:text-stone-500 focus:ring-[#e88f47]"
                    />
                  </div>
                  <div>
                    <p className="mb-1 block text-xs font-medium text-stone-500">Spice Tolerance</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {spiceToleranceOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSpiceTolerance(option.value)}
                          className={`rounded-lg px-3 py-2 text-xs font-medium ring-1 transition-colors ${
                            spiceTolerance === option.value
                              ? 'bg-[#e88f47] text-white ring-[#e88f47]'
                              : 'bg-stone-800 text-stone-400 ring-stone-700 hover:bg-stone-700 hover:text-stone-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-stone-500">
                      Cuisine Preferences <span className="text-stone-600">(comma-separated)</span>
                    </label>
                    <textarea
                      value={cuisinePreferences}
                      onChange={(e) => setCuisinePreferences(e.target.value)}
                      placeholder="e.g. Italian, Japanese, French"
                      rows={2}
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
                              known_allergies: parseCommaSeparated(dietaryAllergies),
                              known_dietary: parseCommaSeparated(dietaryRestrictions),
                              dislikes: parseCommaSeparated(dietaryDislikes),
                              favorites: parseCommaSeparated(dietaryFavorites),
                              spice_tolerance: spiceTolerance,
                              cuisine_preferences: parseCommaSeparated(cuisinePreferences),
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
                        {(profile.known_allergies ?? []).map((a) => (
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
                        {(profile.known_dietary ?? []).map((d) => (
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

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">
                      Dislikes
                    </p>
                    {(profile.dislikes?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(profile.dislikes ?? []).map((dislike) => (
                          <span
                            key={dislike}
                            className="rounded-full bg-orange-600/10 px-3 py-1 text-xs text-orange-400"
                          >
                            {dislike}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-500">Not specified</p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">
                      Favorites
                    </p>
                    {(profile.favorites?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(profile.favorites ?? []).map((favorite) => (
                          <span
                            key={favorite}
                            className="rounded-full bg-emerald-600/10 px-3 py-1 text-xs text-emerald-400"
                          >
                            {favorite}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-500">Not specified</p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">
                      Spice Tolerance
                    </p>
                    {profile.spice_tolerance ? (
                      <p className="text-xs text-stone-300">
                        {spiceToleranceLabels[profile.spice_tolerance]}
                      </p>
                    ) : (
                      <p className="text-xs text-stone-500">Not specified</p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">
                      Cuisine Preferences
                    </p>
                    {(profile.cuisine_preferences?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(profile.cuisine_preferences ?? []).map((cuisine) => (
                          <span
                            key={cuisine}
                            className="rounded-full bg-blue-600/10 px-3 py-1 text-xs text-blue-400"
                          >
                            {cuisine}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-500">Not specified</p>
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
