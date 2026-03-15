'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  updateMentorshipProfile,
  type MentorshipProfile,
  type MentorshipRole,
} from '@/lib/community/mentorship-actions'

const EXPERTISE_OPTIONS = [
  'Private Chef',
  'Catering',
  'Meal Prep',
  'Fine Dining',
  'Farm-to-Table',
  'Pastry & Baking',
  'Menu Development',
  'Food Costing',
  'Business Operations',
  'Marketing',
  'Client Relations',
  'Dietary Specializations',
  'Wine & Beverage',
  'Food Photography',
  'Kitchen Management',
]

interface MentorshipProfileFormProps {
  profile: MentorshipProfile | null
  onSaved?: () => void
}

export function MentorshipProfileForm({
  profile,
  onSaved,
}: MentorshipProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [role, setRole] = useState<MentorshipRole>(profile?.role || 'mentee')
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>(
    profile?.expertise_areas || []
  )
  const [goals, setGoals] = useState(profile?.goals || '')
  const [availability, setAvailability] = useState(profile?.availability || '')
  const [yearsExperience, setYearsExperience] = useState(
    profile?.years_experience?.toString() || ''
  )
  const [maxMentees, setMaxMentees] = useState(
    profile?.max_mentees?.toString() || '3'
  )
  const [isActive, setIsActive] = useState(profile?.is_active ?? true)

  function toggleExpertise(area: string) {
    setExpertiseAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        const result = await updateMentorshipProfile({
          role,
          expertise_areas: expertiseAreas,
          goals: goals || undefined,
          availability: availability || undefined,
          years_experience: yearsExperience
            ? parseInt(yearsExperience, 10)
            : undefined,
          max_mentees:
            role !== 'mentee' && maxMentees
              ? parseInt(maxMentees, 10)
              : undefined,
          is_active: isActive,
        })

        if (!result.success) {
          setError(result.error || 'Failed to save profile')
          return
        }

        setSuccess(true)
        onSaved?.()
      } catch (err) {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Role Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          I want to be a...
        </label>
        <div className="flex gap-2">
          {(['mentor', 'mentee', 'both'] as MentorshipRole[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                role === r
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Expertise Areas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Expertise Areas
        </label>
        <div className="flex flex-wrap gap-2">
          {EXPERTISE_OPTIONS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => toggleExpertise(area)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                expertiseAreas.includes(area)
                  ? 'bg-orange-100 text-orange-800 border border-orange-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {/* Goals */}
      <div>
        <label
          htmlFor="goals"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {role === 'mentor' ? 'What can you help with?' : 'What are your goals?'}
        </label>
        <textarea
          id="goals"
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder={
            role === 'mentor'
              ? 'Describe what you can teach or guide others on...'
              : 'Describe what you want to learn or improve...'
          }
        />
      </div>

      {/* Availability */}
      <div>
        <label
          htmlFor="availability"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Availability
        </label>
        <input
          id="availability"
          type="text"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="e.g. Weekday evenings, 2 hours/week"
        />
      </div>

      {/* Years Experience */}
      <div>
        <label
          htmlFor="yearsExperience"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Years of Experience
        </label>
        <input
          id="yearsExperience"
          type="number"
          min="0"
          max="60"
          value={yearsExperience}
          onChange={(e) => setYearsExperience(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Years in the industry"
        />
      </div>

      {/* Max Mentees (mentors only) */}
      {role !== 'mentee' && (
        <div>
          <label
            htmlFor="maxMentees"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Maximum Mentees
          </label>
          <input
            id="maxMentees"
            type="number"
            min="1"
            max="20"
            value={maxMentees}
            onChange={(e) => setMaxMentees(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            How many mentees can you take on at once?
          </p>
        </div>
      )}

      {/* Active Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isActive ? 'bg-orange-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-gray-700">
          Profile is {isActive ? 'active' : 'hidden'} and{' '}
          {isActive ? 'visible to others' : 'not visible'}
        </span>
      </div>

      {/* Error/Success */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
          Profile saved successfully!
        </p>
      )}

      {/* Submit */}
      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
      </Button>
    </form>
  )
}
