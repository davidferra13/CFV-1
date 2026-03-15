'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  searchMentors,
  requestMentorship,
  type MentorSearchResult,
} from '@/lib/community/mentorship-actions'

const EXPERTISE_FILTERS = [
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
]

export function MentorSearch() {
  const [isPending, startTransition] = useTransition()
  const [mentors, setMentors] = useState<MentorSearchResult[]>([])
  const [selectedExpertise, setSelectedExpertise] = useState<string>('')
  const [requestingId, setRequestingId] = useState<string | null>(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  function doSearch() {
    startTransition(async () => {
      try {
        const results = await searchMentors(
          selectedExpertise ? { expertise: selectedExpertise } : undefined
        )
        setMentors(results)
      } catch {
        setFeedback({ type: 'error', message: 'Failed to search mentors' })
      }
    })
  }

  // Initial load
  useEffect(() => {
    doSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFilterChange(expertise: string) {
    setSelectedExpertise(expertise)
    // Trigger search after state update
    startTransition(async () => {
      try {
        const results = await searchMentors(
          expertise ? { expertise } : undefined
        )
        setMentors(results)
      } catch {
        setFeedback({ type: 'error', message: 'Failed to search mentors' })
      }
    })
  }

  function handleRequestSubmit(mentorId: string) {
    if (!requestMessage.trim()) {
      setFeedback({
        type: 'error',
        message: 'Please include a message with your request',
      })
      return
    }

    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await requestMentorship(mentorId, requestMessage)
        if (result.success) {
          setFeedback({
            type: 'success',
            message: 'Mentorship request sent!',
          })
          setRequestingId(null)
          setRequestMessage('')
        } else {
          setFeedback({
            type: 'error',
            message: result.error || 'Failed to send request',
          })
        }
      } catch {
        setFeedback({
          type: 'error',
          message: 'Something went wrong. Please try again.',
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Expertise
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleFilterChange('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !selectedExpertise
                ? 'bg-orange-100 text-orange-800 border border-orange-300'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {EXPERTISE_FILTERS.map((area) => (
            <button
              key={area}
              onClick={() => handleFilterChange(area)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedExpertise === area
                  ? 'bg-orange-100 text-orange-800 border border-orange-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <p
          className={`text-sm rounded-lg px-3 py-2 ${
            feedback.type === 'success'
              ? 'text-green-600 bg-green-50'
              : 'text-red-600 bg-red-50'
          }`}
        >
          {feedback.message}
        </p>
      )}

      {/* Results */}
      {isPending && mentors.length === 0 && (
        <p className="text-sm text-gray-500">Searching...</p>
      )}

      {!isPending && mentors.length === 0 && (
        <p className="text-sm text-gray-500">
          No mentors found. Try a different filter or check back later.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {mentors.map((mentor) => (
          <div
            key={mentor.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900">
                  {mentor.display_name || mentor.business_name || 'Chef'}
                </h3>
                {mentor.business_name && mentor.display_name && (
                  <p className="text-sm text-gray-500">
                    {mentor.business_name}
                  </p>
                )}
              </div>
              {mentor.years_experience != null && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {mentor.years_experience} yrs
                </span>
              )}
            </div>

            {mentor.expertise_areas.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {mentor.expertise_areas.map((area) => (
                  <span
                    key={area}
                    className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full"
                  >
                    {area}
                  </span>
                ))}
              </div>
            )}

            {mentor.goals && (
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                {mentor.goals}
              </p>
            )}

            {mentor.availability && (
              <p className="mt-1 text-xs text-gray-500">
                Available: {mentor.availability}
              </p>
            )}

            {/* Request Button / Form */}
            <div className="mt-4">
              {requestingId === mentor.chef_id ? (
                <div className="space-y-2">
                  <textarea
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Introduce yourself and explain what you'd like to learn..."
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={() => handleRequestSubmit(mentor.chef_id)}
                      disabled={isPending}
                    >
                      {isPending ? 'Sending...' : 'Send Request'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setRequestingId(null)
                        setRequestMessage('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => setRequestingId(mentor.chef_id)}
                >
                  Request Mentorship
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
