// Client RSVP Summary - Shows RSVP progress on client's event detail page
// Displays who has RSVPed, counts, and guest list

'use client'

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
}

interface ClientRSVPSummaryProps {
  guests: Guest[]
  summary: RSVPSummary
  originalGuestCount: number | null
}

export function ClientRSVPSummary({ guests, summary, originalGuestCount }: ClientRSVPSummaryProps) {
  if (guests.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        No RSVPs yet. Share the link above so your guests can respond.
      </p>
    )
  }

  const effectiveAttending = summary.attending_count + summary.plus_one_count

  // Aggregate dietary needs from all attending/maybe guests
  const dietaryMap = new Map<string, string[]>()
  const allergyMap = new Map<string, string[]>()

  for (const guest of guests) {
    const isRelevant = guest.rsvp_status === 'attending' || guest.rsvp_status === 'maybe'
    if (!isRelevant) continue

    if (guest.dietary_restrictions) {
      for (const restriction of guest.dietary_restrictions) {
        if (!restriction || restriction.trim() === '') continue
        const key = restriction.trim().toLowerCase()
        if (!dietaryMap.has(key)) dietaryMap.set(key, [])
        dietaryMap.get(key)!.push(guest.full_name)
      }
    }

    if (guest.allergies) {
      for (const allergy of guest.allergies) {
        if (!allergy || allergy.trim() === '') continue
        const key = allergy.trim().toLowerCase()
        if (!allergyMap.has(key)) allergyMap.set(key, [])
        allergyMap.get(key)!.push(guest.full_name)
      }
    }
  }

  const hasDietaryData = dietaryMap.size > 0 || allergyMap.size > 0

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center px-3 py-2 bg-emerald-950 rounded-lg">
          <div className="text-xl font-bold text-emerald-700">{summary.attending_count}</div>
          <div className="text-xs text-emerald-600">Attending</div>
        </div>
        <div className="text-center px-3 py-2 bg-amber-950 rounded-lg">
          <div className="text-xl font-bold text-amber-700">{summary.maybe_count}</div>
          <div className="text-xs text-amber-600">Maybe</div>
        </div>
        <div className="text-center px-3 py-2 bg-red-950 rounded-lg">
          <div className="text-xl font-bold text-red-700">{summary.declined_count}</div>
          <div className="text-xs text-red-600">Declined</div>
        </div>
        <div className="text-center px-3 py-2 bg-stone-800 rounded-lg">
          <div className="text-xl font-bold text-stone-300">{summary.pending_count}</div>
          <div className="text-xs text-stone-400">Pending</div>
        </div>
        <div className="text-center px-3 py-2 bg-brand-950 rounded-lg">
          <div className="text-xl font-bold text-brand-300">{summary.waitlisted_count ?? 0}</div>
          <div className="text-xs text-brand-300">Waitlisted</div>
        </div>
      </div>

      {/* Effective count vs original estimate */}
      {originalGuestCount && (
        <div className="text-sm text-stone-400 bg-stone-800 px-4 py-2 rounded-lg">
          <span className="font-medium">{effectiveAttending}</span> confirmed attending
          {summary.plus_one_count > 0 && (
            <span className="text-stone-500"> (incl. {summary.plus_one_count} plus-ones)</span>
          )}{' '}
          of <span className="font-medium">{originalGuestCount}</span> expected
        </div>
      )}

      {/* Table Dietary Needs */}
      {hasDietaryData && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-stone-300">Table Dietary Needs</h4>

          {allergyMap.size > 0 && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">
                Allergies
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(allergyMap.entries()).map(([allergy, names]) => (
                  <div
                    key={allergy}
                    className="rounded-md bg-red-950/50 border border-red-900/30 px-2.5 py-1.5"
                  >
                    <span className="text-sm font-medium text-red-300 capitalize">{allergy}</span>
                    <span className="text-xs text-red-400/70 ml-1.5">
                      ({names.length === 1 ? names[0] : `${names.length} guests`})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dietaryMap.size > 0 && (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                Dietary Restrictions
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(dietaryMap.entries()).map(([restriction, names]) => (
                  <div
                    key={restriction}
                    className="rounded-md bg-amber-950/50 border border-amber-900/30 px-2.5 py-1.5"
                  >
                    <span className="text-sm font-medium text-amber-300 capitalize">
                      {restriction}
                    </span>
                    <span className="text-xs text-amber-400/70 ml-1.5">
                      ({names.length === 1 ? names[0] : `${names.length} guests`})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guest List */}
      <div className="divide-y divide-stone-800">
        {guests.map((guest) => (
          <div key={guest.id} className="py-3 flex items-center justify-between">
            <div>
              <div className="font-medium text-stone-100 text-sm">
                {guest.full_name}
                {guest.plus_one && <span className="text-xs text-stone-500 ml-1">(+1)</span>}
              </div>
              {guest.email && <div className="text-xs text-stone-500">{guest.email}</div>}
              {guest.notes && (
                <div className="text-xs text-stone-500 mt-0.5 italic">
                  &quot;{guest.notes}&quot;
                </div>
              )}
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
                ? 'Waitlisted'
                : guest.rsvp_status === 'attending'
                  ? 'Attending'
                  : guest.rsvp_status === 'declined'
                    ? 'Declined'
                    : guest.rsvp_status === 'maybe'
                      ? 'Maybe'
                      : 'Pending'}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
