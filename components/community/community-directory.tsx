'use client'

import { useState, useEffect, useTransition } from 'react'
import { searchChefs, type CommunityProfile } from '@/lib/community/community-actions'
import { NEUTRAL_SERVICE_AREA_PLACEHOLDER } from '@/lib/site/national-brand-copy'

type DirectoryFilters = {
  cuisine: string
  area: string
  acceptingReferrals: boolean
}

export function CommunityDirectory({
  onViewProfile,
  onSendMessage,
}: {
  onViewProfile?: (chefId: string) => void
  onSendMessage?: (chefId: string, displayName: string) => void
}) {
  const [profiles, setProfiles] = useState<CommunityProfile[]>([])
  const [filters, setFilters] = useState<DirectoryFilters>({
    cuisine: '',
    area: '',
    acceptingReferrals: false,
  })
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    loadProfiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function loadProfiles() {
    startTransition(async () => {
      try {
        const filterPayload: Parameters<typeof searchChefs>[0] = {}
        if (filters.cuisine) filterPayload.cuisine = filters.cuisine
        if (filters.area) filterPayload.area = filters.area
        if (filters.acceptingReferrals) filterPayload.acceptingReferrals = true

        const results = await searchChefs(
          Object.keys(filterPayload).length > 0 ? filterPayload : undefined
        )
        setProfiles(results)
      } catch (err) {
        console.error('[CommunityDirectory] Failed to load profiles:', err)
        setProfiles([])
      }
    })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    loadProfiles()
  }

  return (
    <div className="space-y-6">
      {/* Search/Filter Bar */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine</label>
          <input
            type="text"
            placeholder="e.g. Italian, French..."
            value={filters.cuisine}
            onChange={(e) => setFilters((f) => ({ ...f, cuisine: e.target.value }))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Area</label>
          <input
            type="text"
            placeholder={NEUTRAL_SERVICE_AREA_PLACEHOLDER}
            value={filters.area}
            onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.acceptingReferrals}
            onChange={(e) => setFilters((f) => ({ ...f, acceptingReferrals: e.target.checked }))}
            className="rounded border-gray-300"
          />
          Accepting referrals
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {isPending ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Results */}
      {isPending && profiles.length === 0 ? (
        <p className="text-sm text-gray-500">Loading chefs...</p>
      ) : profiles.length === 0 ? (
        <p className="text-sm text-gray-500">No chefs found. Try adjusting your filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{profile.display_name}</h3>
                  {profile.service_area && (
                    <p className="text-sm text-gray-500">{profile.service_area}</p>
                  )}
                </div>
                {profile.accepting_referrals && (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Open to referrals
                  </span>
                )}
              </div>

              {profile.cuisine_types.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {profile.cuisine_types.map((c) => (
                    <span
                      key={c}
                      className="inline-block rounded bg-orange-50 px-2 py-0.5 text-xs text-orange-700"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {profile.years_experience != null && (
                <p className="mt-2 text-xs text-gray-500">
                  {profile.years_experience} year{profile.years_experience !== 1 ? 's' : ''}{' '}
                  experience
                </p>
              )}

              {profile.specialties.length > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Specialties: {profile.specialties.join(', ')}
                </p>
              )}

              <div className="mt-3 flex gap-2">
                {onViewProfile && (
                  <button
                    onClick={() => onViewProfile(profile.chef_id)}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    View Profile
                  </button>
                )}
                {onSendMessage && (
                  <button
                    onClick={() => onSendMessage(profile.chef_id, profile.display_name)}
                    className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Message
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
