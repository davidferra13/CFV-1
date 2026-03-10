'use client'

// Site Visit Assessment Form
// Multi-section venue evaluation for event locations.

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  createSiteAssessment,
  updateSiteAssessment,
  getSiteAssessmentsByVenue,
  type SiteAssessmentInput,
} from '@/lib/events/site-assessment-actions'
import { trackAction, setActiveForm, trackError } from '@/lib/ai/remy-activity-tracker'

type SiteAssessment = {
  id: string
  event_id: string
  venue_name: string
  visit_date: string | null
  visited_by: string | null
  kitchen_size: string | null
  has_oven: boolean
  has_stovetop: boolean
  has_refrigeration: boolean
  has_freezer: boolean
  has_dishwasher: boolean
  outlet_count: number | null
  water_access: boolean
  parking_notes: string | null
  loading_dock: boolean
  load_in_path_notes: string | null
  elevator_access: boolean
  access_start_time: string | null
  access_end_time: string | null
  max_capacity: number | null
  outdoor_space: boolean
  weather_exposure: boolean
  restroom_access: boolean
  storage_space_notes: string | null
  noise_restrictions: string | null
  venue_contact_name: string | null
  venue_contact_phone: string | null
  venue_contact_email: string | null
  photos_json: any
  general_notes: string | null
}

type Props = {
  eventId: string
  existingAssessment: SiteAssessment | null
  defaultVenueName?: string
}

const KITCHEN_SIZES = [
  { value: '', label: 'Select size' },
  { value: 'none', label: 'No kitchen' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'commercial', label: 'Commercial' },
]

export function SiteAssessmentForm({ eventId, existingAssessment, defaultVenueName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [previousAssessments, setPreviousAssessments] = useState<any[]>([])
  const [showPrevious, setShowPrevious] = useState(false)

  const [form, setForm] = useState({
    venue_name: existingAssessment?.venue_name ?? defaultVenueName ?? '',
    visit_date: existingAssessment?.visit_date ?? '',
    visited_by: existingAssessment?.visited_by ?? '',

    kitchen_size: existingAssessment?.kitchen_size ?? '',
    has_oven: existingAssessment?.has_oven ?? false,
    has_stovetop: existingAssessment?.has_stovetop ?? false,
    has_refrigeration: existingAssessment?.has_refrigeration ?? false,
    has_freezer: existingAssessment?.has_freezer ?? false,
    has_dishwasher: existingAssessment?.has_dishwasher ?? false,
    outlet_count: existingAssessment?.outlet_count?.toString() ?? '',
    water_access: existingAssessment?.water_access ?? true,

    parking_notes: existingAssessment?.parking_notes ?? '',
    loading_dock: existingAssessment?.loading_dock ?? false,
    load_in_path_notes: existingAssessment?.load_in_path_notes ?? '',
    elevator_access: existingAssessment?.elevator_access ?? false,
    access_start_time: existingAssessment?.access_start_time ?? '',
    access_end_time: existingAssessment?.access_end_time ?? '',

    max_capacity: existingAssessment?.max_capacity?.toString() ?? '',
    outdoor_space: existingAssessment?.outdoor_space ?? false,
    weather_exposure: existingAssessment?.weather_exposure ?? false,
    restroom_access: existingAssessment?.restroom_access ?? true,
    storage_space_notes: existingAssessment?.storage_space_notes ?? '',
    noise_restrictions: existingAssessment?.noise_restrictions ?? '',

    venue_contact_name: existingAssessment?.venue_contact_name ?? '',
    venue_contact_phone: existingAssessment?.venue_contact_phone ?? '',
    venue_contact_email: existingAssessment?.venue_contact_email ?? '',

    general_notes: existingAssessment?.general_notes ?? '',
  })

  useEffect(() => {
    setActiveForm(existingAssessment ? 'Edit Site Assessment' : 'New Site Assessment')
    return () => setActiveForm(null)
  }, [existingAssessment])

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function checkPreviousAssessments() {
    if (!form.venue_name.trim()) return
    try {
      const results = await getSiteAssessmentsByVenue(form.venue_name.trim())
      // Exclude the current assessment if editing
      const filtered = existingAssessment
        ? results.filter((r: any) => r.id !== existingAssessment.id)
        : results
      setPreviousAssessments(filtered)
      if (filtered.length > 0) {
        setShowPrevious(true)
      }
    } catch {
      // Non-blocking
    }
  }

  function prefillFromPrevious(prev: any) {
    setForm({
      ...form,
      kitchen_size: prev.kitchen_size ?? '',
      has_oven: prev.has_oven ?? false,
      has_stovetop: prev.has_stovetop ?? false,
      has_refrigeration: prev.has_refrigeration ?? false,
      has_freezer: prev.has_freezer ?? false,
      has_dishwasher: prev.has_dishwasher ?? false,
      outlet_count: prev.outlet_count?.toString() ?? '',
      water_access: prev.water_access ?? true,
      parking_notes: prev.parking_notes ?? '',
      loading_dock: prev.loading_dock ?? false,
      load_in_path_notes: prev.load_in_path_notes ?? '',
      elevator_access: prev.elevator_access ?? false,
      access_start_time: prev.access_start_time ?? '',
      access_end_time: prev.access_end_time ?? '',
      max_capacity: prev.max_capacity?.toString() ?? '',
      outdoor_space: prev.outdoor_space ?? false,
      weather_exposure: prev.weather_exposure ?? false,
      restroom_access: prev.restroom_access ?? true,
      storage_space_notes: prev.storage_space_notes ?? '',
      noise_restrictions: prev.noise_restrictions ?? '',
      venue_contact_name: prev.venue_contact_name ?? '',
      venue_contact_phone: prev.venue_contact_phone ?? '',
      venue_contact_email: prev.venue_contact_email ?? '',
      general_notes: prev.general_notes ?? '',
    })
    setShowPrevious(false)
    trackAction('Pre-filled site assessment from previous visit', form.venue_name)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    const input: SiteAssessmentInput = {
      venue_name: form.venue_name,
      visit_date: form.visit_date || null,
      visited_by: form.visited_by || null,
      kitchen_size: (form.kitchen_size || null) as any,
      has_oven: form.has_oven,
      has_stovetop: form.has_stovetop,
      has_refrigeration: form.has_refrigeration,
      has_freezer: form.has_freezer,
      has_dishwasher: form.has_dishwasher,
      outlet_count: form.outlet_count ? parseInt(form.outlet_count) : null,
      water_access: form.water_access,
      parking_notes: form.parking_notes || null,
      loading_dock: form.loading_dock,
      load_in_path_notes: form.load_in_path_notes || null,
      elevator_access: form.elevator_access,
      access_start_time: form.access_start_time || null,
      access_end_time: form.access_end_time || null,
      max_capacity: form.max_capacity ? parseInt(form.max_capacity) : null,
      outdoor_space: form.outdoor_space,
      weather_exposure: form.weather_exposure,
      restroom_access: form.restroom_access,
      storage_space_notes: form.storage_space_notes || null,
      noise_restrictions: form.noise_restrictions || null,
      venue_contact_name: form.venue_contact_name || null,
      venue_contact_phone: form.venue_contact_phone || null,
      venue_contact_email: form.venue_contact_email || null,
      general_notes: form.general_notes || null,
    }

    startTransition(async () => {
      try {
        if (existingAssessment) {
          await updateSiteAssessment(existingAssessment.id, input)
          trackAction('Updated site assessment', form.venue_name)
          setSuccessMsg('Assessment updated')
        } else {
          await createSiteAssessment(eventId, input)
          trackAction('Created site assessment', form.venue_name)
          setSuccessMsg('Assessment saved')
        }
        router.refresh()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Save failed'
        setError(msg)
        trackError(msg, 'Site assessment form')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Venue Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Venue Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Venue Name</label>
              <div className="flex gap-2">
                <Input
                  value={form.venue_name}
                  onChange={(e) => update('venue_name', e.target.value)}
                  onBlur={checkPreviousAssessments}
                  placeholder="e.g. The Hillside Estate"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Visit Date</label>
              <Input
                type="date"
                value={form.visit_date}
                onChange={(e) => update('visit_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Visited By</label>
              <Input
                value={form.visited_by}
                onChange={(e) => update('visited_by', e.target.value)}
                placeholder="Your name or staff name"
              />
            </div>
          </div>

          {/* Previous Assessment Pre-fill */}
          {showPrevious && previousAssessments.length > 0 && (
            <div className="bg-stone-800 rounded-lg p-3 space-y-2">
              <p className="text-sm text-amber-500 font-medium">
                Found {previousAssessments.length} previous assessment(s) for this venue
              </p>
              {previousAssessments.map((prev: any) => (
                <div key={prev.id} className="flex items-center justify-between text-sm">
                  <span className="text-stone-400">
                    {prev.events?.title ?? 'Unknown event'} (
                    {prev.visit_date ?? prev.events?.event_date ?? '?'})
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => prefillFromPrevious(prev)}
                  >
                    Use this data
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPrevious(false)}
                className="text-stone-500"
              >
                Dismiss
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kitchen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kitchen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Kitchen Size</label>
              <select
                value={form.kitchen_size}
                onChange={(e) => update('kitchen_size', e.target.value)}
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
              >
                {KITCHEN_SIZES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Outlets</label>
              <Input
                type="number"
                value={form.outlet_count}
                onChange={(e) => update('outlet_count', e.target.value)}
                placeholder="Count"
                min="0"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {[
              { field: 'has_oven', label: 'Oven' },
              { field: 'has_stovetop', label: 'Stovetop' },
              { field: 'has_refrigeration', label: 'Refrigeration' },
              { field: 'has_freezer', label: 'Freezer' },
              { field: 'has_dishwasher', label: 'Dishwasher' },
              { field: 'water_access', label: 'Water Access' },
            ].map(({ field, label }) => (
              <label key={field} className="flex items-center gap-2 text-sm text-stone-300">
                <input
                  type="checkbox"
                  checked={(form as any)[field]}
                  onChange={(e) => update(field, e.target.checked)}
                  className="rounded border-stone-600"
                />
                {label}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Access & Logistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Earliest Arrival
              </label>
              <Input
                type="time"
                value={form.access_start_time}
                onChange={(e) => update('access_start_time', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                Latest Departure
              </label>
              <Input
                type="time"
                value={form.access_end_time}
                onChange={(e) => update('access_end_time', e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {[
              { field: 'loading_dock', label: 'Loading Dock' },
              { field: 'elevator_access', label: 'Elevator Access' },
            ].map(({ field, label }) => (
              <label key={field} className="flex items-center gap-2 text-sm text-stone-300">
                <input
                  type="checkbox"
                  checked={(form as any)[field]}
                  onChange={(e) => update(field, e.target.checked)}
                  className="rounded border-stone-600"
                />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Parking Notes</label>
            <textarea
              value={form.parking_notes}
              onChange={(e) => update('parking_notes', e.target.value)}
              rows={2}
              placeholder="Street parking, lot, valet, loading zone..."
              className="w-full rounded-lg border border-stone-600 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Load-In Path Notes
            </label>
            <textarea
              value={form.load_in_path_notes}
              onChange={(e) => update('load_in_path_notes', e.target.value)}
              rows={2}
              placeholder="Side entrance, stairs, ramp, distance from parking..."
              className="w-full rounded-lg border border-stone-600 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Space */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Space & Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Max Capacity</label>
              <Input
                type="number"
                value={form.max_capacity}
                onChange={(e) => update('max_capacity', e.target.value)}
                placeholder="Guest count limit"
                min="0"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {[
              { field: 'outdoor_space', label: 'Outdoor Space' },
              { field: 'weather_exposure', label: 'Weather Exposure' },
              { field: 'restroom_access', label: 'Restroom Access' },
            ].map(({ field, label }) => (
              <label key={field} className="flex items-center gap-2 text-sm text-stone-300">
                <input
                  type="checkbox"
                  checked={(form as any)[field]}
                  onChange={(e) => update(field, e.target.checked)}
                  className="rounded border-stone-600"
                />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Storage Space</label>
            <textarea
              value={form.storage_space_notes}
              onChange={(e) => update('storage_space_notes', e.target.value)}
              rows={2}
              placeholder="Dry storage, walk-in cooler, pantry..."
              className="w-full rounded-lg border border-stone-600 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Noise Restrictions
            </label>
            <textarea
              value={form.noise_restrictions}
              onChange={(e) => update('noise_restrictions', e.target.value)}
              rows={2}
              placeholder="Quiet hours, decibel limits, HOA rules..."
              className="w-full rounded-lg border border-stone-600 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Venue Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Venue Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Contact Name</label>
              <Input
                value={form.venue_contact_name}
                onChange={(e) => update('venue_contact_name', e.target.value)}
                placeholder="Venue manager"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Phone</label>
              <Input
                value={form.venue_contact_phone}
                onChange={(e) => update('venue_contact_phone', e.target.value)}
                placeholder="(555) 123-4567"
                type="tel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Email</label>
              <Input
                value={form.venue_contact_email}
                onChange={(e) => update('venue_contact_email', e.target.value)}
                placeholder="venue@example.com"
                type="email"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={form.general_notes}
            onChange={(e) => update('general_notes', e.target.value)}
            rows={4}
            placeholder="Any other observations, concerns, or details about this venue..."
            className="w-full rounded-lg border border-stone-600 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </CardContent>
      </Card>

      {/* Submit */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMsg && <p className="text-sm text-green-500">{successMsg}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : existingAssessment ? 'Update Assessment' : 'Save Assessment'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
