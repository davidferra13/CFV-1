'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  getCommunityProfile,
  updateCommunityProfile,
  type CommunityProfile,
} from '@/lib/community/community-actions'

export function CommunityProfileEditor() {
  const [profile, setProfile] = useState<CommunityProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [cuisineInput, setCuisineInput] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [bio, setBio] = useState('')
  const [specialtyInput, setSpecialtyInput] = useState('')
  const [isVisible, setIsVisible] = useState(true)
  const [acceptingReferrals, setAcceptingReferrals] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const data = await getCommunityProfile()
      if (data) {
        setProfile(data)
        setDisplayName(data.display_name)
        setCuisineInput(data.cuisine_types.join(', '))
        setYearsExperience(data.years_experience?.toString() ?? '')
        setServiceArea(data.service_area ?? '')
        setBio(data.bio ?? '')
        setSpecialtyInput(data.specialties.join(', '))
        setIsVisible(data.is_visible)
        setAcceptingReferrals(data.accepting_referrals)
      }
    } catch (err) {
      console.error('[CommunityProfileEditor] Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    startTransition(async () => {
      try {
        const result = await updateCommunityProfile({
          display_name: displayName,
          cuisine_types: cuisineInput
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
          service_area: serviceArea || null,
          bio: bio || null,
          is_visible: isVisible,
          accepting_referrals: acceptingReferrals,
          specialties: specialtyInput
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        })

        if (result.success) {
          setMessage({ type: 'success', text: 'Profile saved!' })
        } else {
          setMessage({ type: 'error', text: result.error ?? 'Failed to save profile' })
        }
      } catch (err) {
        console.error('[CommunityProfileEditor] Save failed:', err)
        setMessage({ type: 'error', text: 'An unexpected error occurred' })
      }
    })
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading profile...</p>
  }

  return (
    <form onSubmit={handleSave} className="max-w-xl space-y-5">
      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Display Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          maxLength={100}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Your name as it appears to other chefs"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cuisine Types
        </label>
        <input
          type="text"
          value={cuisineInput}
          onChange={(e) => setCuisineInput(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Italian, French, Japanese (comma-separated)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Years of Experience
          </label>
          <input
            type="number"
            min={0}
            max={99}
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service Area
          </label>
          <input
            type="text"
            value={serviceArea}
            onChange={(e) => setServiceArea(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="e.g. Bay Area, NYC"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Specialties
        </label>
        <input
          type="text"
          value={specialtyInput}
          onChange={(e) => setSpecialtyInput(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Farm-to-table, Allergen-free, Meal prep (comma-separated)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        <textarea
          rows={4}
          maxLength={2000}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Tell other chefs about yourself..."
        />
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isVisible}
            onChange={(e) => setIsVisible(e.target.checked)}
            className="rounded border-gray-300"
          />
          Visible in the community directory
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={acceptingReferrals}
            onChange={(e) => setAcceptingReferrals(e.target.checked)}
            className="rounded border-gray-300"
          />
          Accepting referrals from other chefs
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
      </button>
    </form>
  )
}
