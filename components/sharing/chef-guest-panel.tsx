// Chef Guest Panel - Shows RSVP intelligence on chef's event detail page
// Displays RSVP progress, aggregated dietary/allergy info, visibility controls, guest notes

'use client'

import { useState } from 'react'
import { updateGuestVisibility } from '@/lib/sharing/actions'
import {
  getDefaultPublicShareVisibilitySettings,
  type PublicShareVisibilitySettings,
} from '@/lib/sharing/public-contract'
import { Badge } from '@/components/ui/badge'

interface Guest {
  id: string
  full_name: string
  email: string | null
  rsvp_status: string
  attendance_queue_status?: string | null
  dietary_restrictions: string[] | null
  allergies: string[] | null
  notes: string | null
  plus_one: boolean
}

interface RSVPSummary {
  total_guests: number
  attending_count: number
  declined_count: number
  maybe_count: number
  pending_count: number
  waitlisted_count?: number
  plus_one_count: number
  all_dietary_restrictions: string[] | null
  all_allergies: string[] | null
}

type VisibilitySettings = PublicShareVisibilitySettings

interface ChefGuestPanelProps {
  eventShareId: string | null
  guests: Guest[]
  summary: RSVPSummary
  originalGuestCount: number | null
  visibility: VisibilitySettings | null
}

const VISIBILITY_LABELS: Record<keyof VisibilitySettings, string> = {
  show_date_time: 'Date & Time',
  show_location: 'Location',
  show_occasion: 'Occasion',
  show_guest_count: 'Guest Count',
  show_service_style: 'Service Style',
  show_menu: 'Menu',
  show_dietary_info: 'Dietary Info',
  show_special_requests: 'Special Requests',
  show_guest_list: 'Guest List',
  show_chef_name: 'Your Name',
}

export function ChefGuestPanel({
  eventShareId,
  guests,
  summary,
  originalGuestCount,
  visibility: initialVisibility,
}: ChefGuestPanelProps) {
  const defaultVisibility = getDefaultPublicShareVisibilitySettings()
  const [visibility, setVisibility] = useState<VisibilitySettings>(
    initialVisibility ? { ...defaultVisibility, ...initialVisibility } : defaultVisibility
  )
  const [saving, setSaving] = useState(false)

  const effectiveAttending = summary.attending_count + summary.plus_one_count

  async function handleToggle(key: keyof VisibilitySettings) {
    if (!eventShareId) return
    const newValue = !visibility[key]
    const updated = { ...visibility, [key]: newValue }
    setVisibility(updated)

    setSaving(true)
    try {
      await updateGuestVisibility(eventShareId, { [key]: newValue })
    } catch {
      // Revert on error
      setVisibility(visibility)
    } finally {
      setSaving(false)
    }
  }

  if (guests.length === 0 && !eventShareId) {
    return (
      <p className="text-sm text-stone-500">
        No share link has been created for this event yet. The client can create one from their
        event page.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {/* RSVP Progress */}
      {summary.total_guests > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-stone-300">RSVP Progress</h4>
            <span className="text-xs text-stone-500">
              {summary.total_guests - summary.pending_count} of {summary.total_guests} responded
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-stone-800 rounded-full h-3 overflow-hidden mb-3">
            <div className="h-full flex">
              {summary.attending_count > 0 && (
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${(summary.attending_count / summary.total_guests) * 100}%` }}
                />
              )}
              {summary.maybe_count > 0 && (
                <div
                  className="bg-amber-400 h-full"
                  style={{ width: `${(summary.maybe_count / summary.total_guests) * 100}%` }}
                />
              )}
              {summary.declined_count > 0 && (
                <div
                  className="bg-red-400 h-full"
                  style={{ width: `${(summary.declined_count / summary.total_guests) * 100}%` }}
                />
              )}
            </div>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div>
              <span className="font-bold text-emerald-700">{summary.attending_count}</span>
              <span className="text-stone-500 ml-1">Attending</span>
            </div>
            <div>
              <span className="font-bold text-amber-700">{summary.maybe_count}</span>
              <span className="text-stone-500 ml-1">Maybe</span>
            </div>
            <div>
              <span className="font-bold text-red-700">{summary.declined_count}</span>
              <span className="text-stone-500 ml-1">Declined</span>
            </div>
            <div>
              <span className="font-bold text-stone-300">{summary.pending_count}</span>
              <span className="text-stone-500 ml-1">Pending</span>
            </div>
            <div>
              <span className="font-bold text-brand-300">{summary.waitlisted_count ?? 0}</span>
              <span className="text-stone-500 ml-1">Waitlisted</span>
            </div>
          </div>

          {/* Effective vs estimated */}
          {originalGuestCount && (
            <div className="mt-2 px-3 py-2 bg-stone-800 rounded-lg text-xs text-stone-300">
              Effective headcount:{' '}
              <span className="font-semibold text-stone-100">{effectiveAttending}</span>
              {summary.plus_one_count > 0 && (
                <span> (incl. {summary.plus_one_count} plus-ones)</span>
              )}{' '}
              / Original estimate: <span className="font-semibold">{originalGuestCount}</span>
            </div>
          )}
        </div>
      )}

      {/* Aggregated Dietary Intelligence */}
      {summary.all_dietary_restrictions?.length || summary.all_allergies?.length ? (
        <div>
          <h4 className="text-sm font-medium text-stone-300 mb-2">Dietary Intelligence</h4>
          {summary.all_dietary_restrictions && summary.all_dietary_restrictions.length > 0 && (
            <div className="mb-2">
              <span className="text-xs text-stone-500">Restrictions:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {summary.all_dietary_restrictions.map((r) => (
                  <span
                    key={r}
                    className="px-2 py-0.5 bg-amber-950 text-amber-700 rounded-full text-xs font-medium"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
          {summary.all_allergies && summary.all_allergies.length > 0 && (
            <div>
              <span className="text-xs text-stone-500">Allergies:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {summary.all_allergies.map((a) => (
                  <span
                    key={a}
                    className="px-2 py-0.5 bg-red-950 text-red-700 rounded-full text-xs font-medium"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Guest List with Notes */}
      {guests.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-stone-300 mb-2">Guest Responses</h4>
          <div className="divide-y divide-stone-800">
            {guests.map((guest) => (
              <div key={guest.id} className="py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-100">{guest.full_name}</span>
                    {guest.plus_one && <span className="text-xs text-stone-300">(+1)</span>}
                  </div>
                  <Badge
                    variant={
                      guest.attendance_queue_status === 'waitlisted'
                        ? 'info'
                        : guest.rsvp_status === 'attending'
                          ? 'success'
                          : guest.rsvp_status === 'declined'
                            ? 'error'
                            : guest.rsvp_status === 'maybe'
                              ? 'warning'
                              : 'default'
                    }
                  >
                    {guest.attendance_queue_status === 'waitlisted'
                      ? 'waitlisted'
                      : guest.rsvp_status}
                  </Badge>
                </div>
                {/* Individual dietary/allergy info */}
                {((guest.dietary_restrictions?.length ?? 0) > 0 ||
                  (guest.allergies?.length ?? 0) > 0) && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {guest.dietary_restrictions?.map((d) => (
                      <span
                        key={d}
                        className="px-1.5 py-0.5 bg-amber-950 text-amber-600 rounded text-xxs"
                      >
                        {d}
                      </span>
                    ))}
                    {guest.allergies?.map((a) => (
                      <span
                        key={a}
                        className="px-1.5 py-0.5 bg-red-950 text-red-600 rounded text-xxs"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
                {guest.notes && (
                  <p className="text-xs text-stone-500 mt-1 italic">&quot;{guest.notes}&quot;</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visibility Controls */}
      {eventShareId && (
        <div>
          <h4 className="text-sm font-medium text-stone-300 mb-2">
            Guest Page Visibility
            {saving && <span className="text-xs text-stone-300 ml-2">Saving...</span>}
          </h4>
          <p className="text-xs text-stone-500 mb-3">
            Control what guests can see on the shared event page.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(VISIBILITY_LABELS) as [keyof VisibilitySettings, string][]).map(
              ([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibility[key]}
                    onChange={() => handleToggle(key)}
                    className="w-3.5 h-3.5 text-brand-600 rounded border-stone-600 focus:ring-brand-500"
                  />
                  <span className="text-stone-300">{label}</span>
                </label>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
