'use client'

import { useState } from 'react'
import { submitCannabisRequest } from '@/lib/cannabis/client-portal-actions'

type PortalData = {
  authorized: true
  accessStatus: {
    hasTierAccess: boolean
    hasAgePermission: boolean
    ageStatus: string | null
  }
  events: Array<{
    id: string
    event_date: string
    serve_time: string | null
    occasion: string | null
    guest_count: number | null
    status: string
    quoted_price_cents: number | null
    location_city: string | null
    location_state: string | null
  }>
  requests: Array<{
    id: string
    status: string
    preferred_date: string | null
    guest_count: number | null
    desired_intensity: string | null
    created_at: string
    reviewed_at: string | null
  }>
  stats: {
    totalCannabisEvents: number
    upcomingCannabisEvents: number
    totalCannabisSpendCents: number
    totalCannabisCovers: number
  }
}

export function CannabisPortalDashboard({ data }: { data: PortalData }) {
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmitRequest(formData: FormData) {
    setSubmitting(true)
    try {
      await submitCannabisRequest({
        preferredDate: (formData.get('preferredDate') as string) || undefined,
        guestCount: formData.get('guestCount') ? Number(formData.get('guestCount')) : undefined,
        locationNotes: (formData.get('locationNotes') as string) || undefined,
        formatPreference: (formData.get('formatPreference') as string) || undefined,
        menuPreferences: (formData.get('menuPreferences') as string) || undefined,
        cannabisExperienceGoal: (formData.get('cannabisExperienceGoal') as string) || undefined,
        desiredIntensity: (formData.get('desiredIntensity') as any) || undefined,
        notes: (formData.get('notes') as string) || undefined,
      })
      setSubmitted(true)
      setShowRequestForm(false)
    } catch (err: any) {
      alert(err.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Cannabis Dining</h1>
        <p className="text-muted-foreground mt-1">Your private cannabis dining experience portal</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Experiences" value={String(data.stats.totalCannabisEvents)} />
        <StatCard label="Upcoming" value={String(data.stats.upcomingCannabisEvents)} />
        <StatCard label="Total Covers" value={String(data.stats.totalCannabisCovers)} />
        <StatCard label="Invested" value={formatCurrency(data.stats.totalCannabisSpendCents)} />
      </div>

      {/* Request Section */}
      <section className="border rounded-lg p-6 bg-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Request a Cannabis Dinner</h2>
          {!showRequestForm && !submitted && (
            <button
              onClick={() => setShowRequestForm(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
            >
              New Request
            </button>
          )}
        </div>

        {submitted && (
          <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-green-800 dark:text-green-200 text-sm">
              Request submitted. Your chef will review it shortly.
            </p>
          </div>
        )}

        {showRequestForm && (
          <form action={handleSubmitRequest} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Preferred Date</label>
                <input
                  type="date"
                  name="preferredDate"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Guest Count</label>
                <input
                  type="number"
                  name="guestCount"
                  min={1}
                  max={50}
                  placeholder="e.g. 8"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input
                type="text"
                name="locationNotes"
                placeholder="Your home, venue, or other"
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Desired Intensity</label>
              <select
                name="desiredIntensity"
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                <option value="micro">Micro-dose</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="full">Full experience</option>
                <option value="custom">Custom (describe below)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Experience Goal</label>
              <textarea
                name="cannabisExperienceGoal"
                rows={2}
                placeholder="What kind of experience are you looking for?"
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Menu Preferences</label>
              <textarea
                name="menuPreferences"
                rows={2}
                placeholder="Cuisine, dietary needs, dishes you love..."
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Additional Notes</label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Anything else your chef should know"
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={() => setShowRequestForm(false)}
                className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Existing Requests */}
        {data.requests.length > 0 && !showRequestForm && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Your Requests</h3>
            {data.requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 border rounded-md text-sm"
              >
                <div>
                  <span className="font-medium">
                    {req.preferred_date ? formatDate(req.preferred_date) : 'Flexible date'}
                  </span>
                  {req.guest_count && (
                    <span className="text-muted-foreground ml-2">{req.guest_count} guests</span>
                  )}
                </div>
                <RequestStatusBadge status={req.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Event History */}
      {data.events.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Your Cannabis Dinners</h2>
          <div className="space-y-3">
            {data.events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{event.occasion || 'Cannabis Dinner'}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(event.event_date)}
                    {event.location_city && ` in ${event.location_city}, ${event.location_state}`}
                  </p>
                </div>
                <div className="text-right">
                  <EventStatusBadge status={event.status} />
                  {event.guest_count && (
                    <p className="text-xs text-muted-foreground mt-1">{event.guest_count} guests</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

function RequestStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    submitted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    declined: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    converted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  }
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

function EventStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    proposed: 'bg-blue-100 text-blue-800',
    accepted: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    confirmed: 'bg-green-100 text-green-800',
    in_progress: 'bg-amber-100 text-amber-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100'}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}
