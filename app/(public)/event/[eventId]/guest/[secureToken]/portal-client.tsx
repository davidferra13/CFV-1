'use client'

import { useMemo, useState, useTransition } from 'react'
import { format, differenceInDays, differenceInHours } from 'date-fns'
import {
  saveGuestEventPortalRSVP,
  sendGuestMessage,
  updateGuestAboutMe,
  confirmGuestDietary,
  getPublishedGuestDocuments,
  getPreEventContent,
} from '@/lib/sharing/actions'

type PortalState = 'ready' | 'cancelled' | 'expired' | 'revoked' | 'invalid'

type ReadyPortal = {
  state: 'ready'
  event: {
    id: string
    title: string
    occasion: string | null
    eventDate: string
    serveTime: string | null
    arrivalTime: string | null
    location: {
      address: string
      city: string
      state: string
      zip: string
      notes: string | null
    }
    hostName: string
    hostMessage: string | null
    serviceStyle: string | null
    cannabisEnabled: boolean
    menuFinalized: boolean
    menus: {
      id: string
      name: string
      description: string | null
      service_style: string | null
      dishes: {
        id: string
        course_number: number
        course_name: string
        description: string | null
        dietary_tags: string[]
        allergen_flags: string[]
      }[]
    }[]
    visibility: Record<string, boolean>
    guestList: { full_name: string; rsvp_status: string }[]
  }
  guest: {
    fullName: string
    email: string | null
    attendingStatus: 'yes' | 'no' | 'maybe'
    dietaryNotes: string
    accessibilityNotes: string
    menuPreferenceNote: string
    additionalNote: string
    ageConfirmed: boolean
    participationStatus: 'participate' | 'not_consume' | 'undecided'
    familiarityLevel: string
    consumptionMethod: string
    edibleExperience: string
    preferredDoseNote: string
    comfortNotes: string
    discussInPerson: boolean
    voluntaryAcknowledgment: boolean
    alcoholAcknowledgment: boolean
    transportationAcknowledgment: boolean
    finalConfirmation: boolean
    updatedAt: string
  }
  lifecycle: {
    editCutoff: string
    archiveAt: string
    canEdit: boolean
    archiveMode: boolean
  }
}

type PortalPayload =
  | ReadyPortal
  | { state: 'cancelled'; event: { title: string; eventDate: string; serveTime: string | null } }
  | { state: 'expired' | 'revoked' | 'invalid' }

type FamiliarityValue =
  | 'first_time'
  | 'occasional'
  | 'experienced'
  | 'regular'
  | 'new'
  | 'light'
  | 'moderate'

type ConsumptionValue =
  | 'smoking'
  | 'edibles'
  | 'tincture'
  | 'other'
  | 'infused_course'
  | 'paired_noninfused'
  | 'skip_infusion'
  | 'unsure'

type EdibleValue = 'yes' | 'no' | 'unsure' | 'none' | 'low' | 'moderate' | 'high'

const familiarityOptions = [
  { value: '', label: 'Select (optional)' },
  { value: 'first_time', label: 'First-time' },
  { value: 'occasional', label: 'Occasional' },
  { value: 'experienced', label: 'Experienced' },
  { value: 'regular', label: 'Regular' },
]

const consumptionOptions = [
  { value: '', label: 'Select (optional)' },
  { value: 'smoking', label: 'Smoking' },
  { value: 'edibles', label: 'Edibles' },
  { value: 'tincture', label: 'Tincture' },
  { value: 'other', label: 'Other' },
]

const edibleOptions = [
  { value: '', label: 'Select (optional)' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Unsure' },
]

function formatTimeLabel(value?: string | null) {
  if (!value) return null
  return value.slice(0, 5)
}

export function GuestEventPortalClient({
  eventId,
  secureToken,
  portal,
}: {
  eventId: string
  secureToken: string
  portal: PortalPayload
}) {
  if (portal.state !== 'ready') {
    return <PortalFailure portal={portal} />
  }

  return <GuestPortalForm eventId={eventId} secureToken={secureToken} portal={portal} />
}

function PortalFailure({ portal }: { portal: PortalPayload }) {
  const title =
    portal.state === 'cancelled'
      ? 'Event Canceled'
      : portal.state === 'expired'
        ? 'Link Expired'
        : portal.state === 'revoked'
          ? 'Link Unavailable'
          : 'Link Not Found'

  const message =
    portal.state === 'cancelled'
      ? 'This event has been canceled. Contact your host for updates.'
      : portal.state === 'expired'
        ? 'This guest portal link has expired.'
        : portal.state === 'revoked'
          ? 'This guest portal is no longer active.'
          : 'This guest portal link is invalid.'

  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{
        background: 'linear-gradient(135deg, #131816 0%, #101513 100%)',
        border: '1px solid rgba(96,128,102,0.22)',
      }}
    >
      <h1 className="text-2xl font-semibold text-stone-100">{title}</h1>
      <p className="mt-3 text-sm text-stone-300">{message}</p>
    </div>
  )
}

function GuestPortalForm({
  eventId,
  secureToken,
  portal,
}: {
  eventId: string
  secureToken: string
  portal: ReadyPortal
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [cannabisInfoOpen, setCannabisInfoOpen] = useState(true)
  const [savedSummary, setSavedSummary] = useState<{
    attending_status: 'yes' | 'no' | 'maybe'
    cannabis_participation: 'participate' | 'not_consume' | 'undecided'
    editCutoff: string
  } | null>(null)

  const [form, setForm] = useState({
    full_name: portal.guest.fullName || '',
    attending_status: (portal.guest.attendingStatus || 'yes') as 'yes' | 'no' | 'maybe',
    dietary_notes: portal.guest.dietaryNotes || '',
    accessibility_notes: portal.guest.accessibilityNotes || '',
    menu_preference_note: portal.guest.menuPreferenceNote || '',
    additional_note: portal.guest.additionalNote || '',
    final_confirmation: portal.guest.finalConfirmation || false,
    age_confirmed: portal.guest.ageConfirmed || false,
    cannabis_participation: (portal.guest.participationStatus || 'undecided') as
      | 'participate'
      | 'not_consume'
      | 'undecided',
    familiarity_level: portal.guest.familiarityLevel || '',
    consumption_method: portal.guest.consumptionMethod || '',
    edible_experience: portal.guest.edibleExperience || '',
    preferred_dose_note: portal.guest.preferredDoseNote || '',
    comfort_notes: portal.guest.comfortNotes || '',
    discuss_in_person_flag: portal.guest.discussInPerson || false,
    voluntary_acknowledgment: portal.guest.voluntaryAcknowledgment || false,
    alcohol_acknowledgment: portal.guest.alcoholAcknowledgment || false,
    transportation_acknowledgment: portal.guest.transportationAcknowledgment || false,
  })

  const cutoffLabel = useMemo(
    () => format(new Date(portal.lifecycle.editCutoff), 'PPP p'),
    [portal.lifecycle.editCutoff]
  )

  const showCannabisSections = portal.event.cannabisEnabled && form.attending_status !== 'no'
  const showCannabisSurvey =
    showCannabisSections && form.age_confirmed && form.cannabis_participation !== 'not_consume'

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!portal.lifecycle.canEdit) return

    setLoading(true)
    setError('')
    setSubmitted(false)

    try {
      const familiarityLevel = form.familiarity_level
        ? (form.familiarity_level as FamiliarityValue)
        : undefined
      const consumptionMethod = form.consumption_method
        ? (form.consumption_method as ConsumptionValue)
        : undefined
      const edibleExperience = form.edible_experience
        ? (form.edible_experience as EdibleValue)
        : undefined

      const result = await saveGuestEventPortalRSVP({
        eventId,
        secureToken,
        full_name: form.full_name,
        attending_status: form.attending_status,
        dietary_notes: form.dietary_notes || undefined,
        accessibility_notes: form.accessibility_notes || undefined,
        menu_preference_note: form.menu_preference_note || undefined,
        additional_note: form.additional_note || undefined,
        final_confirmation: form.final_confirmation,
        age_confirmed: form.age_confirmed,
        cannabis_participation: form.cannabis_participation,
        familiarity_level: familiarityLevel,
        consumption_method: consumptionMethod,
        edible_experience: edibleExperience,
        preferred_dose_note: form.preferred_dose_note || undefined,
        comfort_notes: form.comfort_notes || undefined,
        discuss_in_person_flag: form.discuss_in_person_flag,
        voluntary_acknowledgment: form.voluntary_acknowledgment,
        alcohol_acknowledgment: form.alcohol_acknowledgment,
        transportation_acknowledgment: form.transportation_acknowledgment,
      })

      setSavedSummary({
        attending_status: result.attending_status,
        cannabis_participation: result.cannabis_participation,
        editCutoff: result.editCutoff,
      })
      setSubmitted(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save RSVP')
    } finally {
      setLoading(false)
    }
  }

  if (submitted && savedSummary) {
    return (
      <PostRSVPExperience
        eventId={eventId}
        secureToken={secureToken}
        portal={portal}
        savedSummary={savedSummary}
        onEdit={() => setSubmitted(false)}
      />
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, #101614 0%, #0c1210 100%)',
          border: '1px solid rgba(89,118,95,0.22)',
        }}
      >
        <h1 className="text-3xl font-semibold text-stone-100">{portal.event.title}</h1>
        <p className="mt-2 text-sm text-stone-300">Hosted by {portal.event.hostName}</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-stone-300">
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500">Date</p>
            <p>{format(new Date(portal.event.eventDate), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500">Time</p>
            <p>
              {formatTimeLabel(portal.event.arrivalTime) ||
                formatTimeLabel(portal.event.serveTime) ||
                'TBD'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wider text-stone-500">Location</p>
            <p>
              {portal.event.location.address}, {portal.event.location.city},{' '}
              {portal.event.location.state} {portal.event.location.zip}
            </p>
            {portal.event.location.notes && (
              <p className="mt-1 text-stone-300">{portal.event.location.notes}</p>
            )}
          </div>
          {portal.event.hostMessage && (
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wider text-stone-500">Host Message</p>
              <p>{portal.event.hostMessage}</p>
            </div>
          )}
        </div>
      </section>

      <section
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, #101614 0%, #0c1210 100%)',
          border: '1px solid rgba(89,118,95,0.22)',
        }}
      >
        <h2 className="text-xl font-semibold text-stone-100">What to Expect</h2>
        <div className="mt-3 space-y-2 text-sm text-stone-300">
          <p>Multi-course seated dining experience.</p>
          <p>Estimated service duration based on your event timeline.</p>
          <p>Optional cannabis-infused components are intentional and identified at service.</p>
          <p>You may attend and enjoy the full dinner experience without consuming cannabis.</p>
          <p>This is a private dining experience designed around clarity and comfort.</p>
        </div>
      </section>

      {portal.event.visibility.show_guest_list && portal.event.guestList.length > 0 && (
        <section
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, #101614 0%, #0c1210 100%)',
            border: '1px solid rgba(89,118,95,0.22)',
          }}
        >
          <h2 className="text-xl font-semibold text-stone-100">Guest List</h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-stone-300">
            {portal.event.guestList.map((guest) => (
              <div
                key={`${guest.full_name}-${guest.rsvp_status}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 bg-[#0e1412]"
              >
                <span>{guest.full_name}</span>
                <span className="text-stone-300">{guest.rsvp_status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, #101614 0%, #0c1210 100%)',
          border: '1px solid rgba(89,118,95,0.22)',
        }}
      >
        <h2 className="text-xl font-semibold text-stone-100">Menu</h2>
        {portal.event.menuFinalized ? (
          <div className="mt-3 space-y-4">
            {portal.event.menus.map((menu) => (
              <div key={menu.id} className="rounded-lg p-4 bg-[#0e1412]">
                <p className="text-stone-100 font-medium text-lg">{menu.name}</p>
                {menu.description && (
                  <p className="mt-1 text-sm text-stone-300">{menu.description}</p>
                )}
                {menu.dishes.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-[#1e2d25] pt-3">
                    {menu.dishes.map((dish) => (
                      <div key={dish.id} className="pl-3 border-l-2 border-[#2e4d36]">
                        <p className="text-xs uppercase tracking-wider text-stone-500">
                          Course {dish.course_number}
                        </p>
                        <p className="text-stone-100 font-medium">{dish.course_name}</p>
                        {dish.description && (
                          <p className="text-sm text-stone-400 mt-0.5">{dish.description}</p>
                        )}
                        {(dish.dietary_tags.length > 0 || dish.allergen_flags.length > 0) && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {dish.dietary_tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full bg-[#1a2e22] text-[#8fc99a]"
                              >
                                {tag}
                              </span>
                            ))}
                            {dish.allergen_flags.map((flag) => (
                              <span
                                key={flag}
                                className="text-xs px-2 py-0.5 rounded-full bg-[#2e1a1a] text-[#e8a0a0]"
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-lg p-4 bg-[#0e1412] text-sm text-stone-300">
            <p className="font-medium text-stone-100">Menu in development</p>
            <p className="mt-1">
              Chef is building the final menu now.{' '}
              {portal.event.serviceStyle
                ? `Culinary direction: ${portal.event.serviceStyle.replace(/_/g, ' ')}.`
                : 'Chef will share final direction once complete.'}
            </p>
          </div>
        )}
        <div className="mt-4">
          <label className="text-sm font-medium text-stone-200">
            Optional menu preference note
          </label>
          <textarea
            value={form.menu_preference_note}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, menu_preference_note: event.target.value }))
            }
            disabled={!portal.lifecycle.canEdit}
            rows={2}
            className="mt-2 w-full rounded-lg bg-[#0b120f] border border-[#2e3d34] px-3 py-2 text-sm text-stone-100"
          />
        </div>
      </section>

      <section
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, #101614 0%, #0c1210 100%)',
          border: '1px solid rgba(89,118,95,0.22)',
        }}
      >
        <h2 className="text-xl font-semibold text-stone-100">RSVP</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-200">Full name</label>
            <input
              type="text"
              required
              value={form.full_name}
              disabled={!portal.lifecycle.canEdit}
              onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
              className="mt-2 w-full rounded-lg bg-[#0b120f] border border-[#2e3d34] px-3 py-2 text-sm text-stone-100"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-stone-200">Attending</p>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {[
                { value: 'yes', label: 'Yes' },
                { value: 'maybe', label: 'Maybe' },
                { value: 'no', label: 'No' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={!portal.lifecycle.canEdit}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      attending_status: option.value as 'yes' | 'no' | 'maybe',
                    }))
                  }
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: form.attending_status === option.value ? '#689b6f' : '#2e3d34',
                    background: form.attending_status === option.value ? '#1a2a22' : '#0b120f',
                    color: '#e5ece6',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {form.attending_status !== 'no' && (
            <>
              <div>
                <label className="text-sm font-medium text-stone-200">
                  Dietary restrictions or allergies
                </label>
                <textarea
                  value={form.dietary_notes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, dietary_notes: event.target.value }))
                  }
                  disabled={!portal.lifecycle.canEdit}
                  rows={2}
                  className="mt-2 w-full rounded-lg bg-[#0b120f] border border-[#2e3d34] px-3 py-2 text-sm text-stone-100"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-200">Accessibility needs</label>
                <textarea
                  value={form.accessibility_notes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, accessibility_notes: event.target.value }))
                  }
                  disabled={!portal.lifecycle.canEdit}
                  rows={2}
                  className="mt-2 w-full rounded-lg bg-[#0b120f] border border-[#2e3d34] px-3 py-2 text-sm text-stone-100"
                />
              </div>
            </>
          )}
        </div>
      </section>

      {showCannabisSections && (
        <>
          <section
            className="rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, #112017 0%, #0d1712 100%)',
              border: '1px solid rgba(92,138,106,0.25)',
            }}
          >
            <button
              type="button"
              onClick={() => setCannabisInfoOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-xl font-semibold text-stone-100">Optional Cannabis Experience</h2>
              <span className="text-stone-300 text-sm">{cannabisInfoOpen ? 'Hide' : 'Show'}</span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${cannabisInfoOpen ? 'max-h-[520px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}
            >
              <div className="space-y-2 text-sm text-stone-300">
                <p>Participation is voluntary and optional.</p>
                <p>No food is infused by default.</p>
                <p>Infusion occurs only with clear acknowledgment and agreement.</p>
                <p>You may opt out at any time.</p>
                <p>Avoid combining cannabis with alcohol.</p>
                <p>Please arrange safe transportation.</p>
                <p>Adult-use only. Guests must be 21+.</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg p-3 bg-[#0e1813]">
              <a href="/cannabis/public" className="text-sm font-medium text-[#b8dfbe] underline">
                Cannabis About / What to Expect
              </a>
            </div>
          </section>

          <section
            className="rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, #101614 0%, #0c1210 100%)',
              border: '1px solid rgba(89,118,95,0.22)',
            }}
          >
            <h2 className="text-xl font-semibold text-stone-100">Participation</h2>
            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-2 text-sm text-stone-200">
                <input
                  type="checkbox"
                  checked={form.age_confirmed}
                  disabled={!portal.lifecycle.canEdit}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, age_confirmed: event.target.checked }))
                  }
                />
                I confirm I am 21+.
              </label>

              <div>
                <p className="text-sm font-medium text-stone-200">Participation preference</p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { value: 'participate', label: 'Participating' },
                    { value: 'not_consume', label: 'Not Participating' },
                    { value: 'undecided', label: 'Undecided' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={!portal.lifecycle.canEdit || !form.age_confirmed}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          cannabis_participation: option.value as
                            | 'participate'
                            | 'not_consume'
                            | 'undecided',
                        }))
                      }
                      className="rounded-lg border px-3 py-2 text-sm"
                      style={{
                        borderColor:
                          form.cannabis_participation === option.value ? '#689b6f' : '#2e3d34',
                        background:
                          form.cannabis_participation === option.value ? '#1a2a22' : '#0b120f',
                        color: form.age_confirmed ? '#e5ece6' : '#8f9a93',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {!form.age_confirmed && (
                  <p className="mt-2 text-xs text-stone-500">
                    Confirm 21+ above to unlock participation options.
                  </p>
                )}
              </div>

              <p className="text-xs text-stone-300">
                You may update your response until {cutoffLabel}.
              </p>

              <div
                className={`overflow-hidden transition-all duration-300 ${showCannabisSurvey ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="pt-2 space-y-4">
                  <p className="text-sm text-stone-300">
                    Optional. Helps the chef prepare thoughtfully.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-stone-200">
                        Familiarity level
                      </label>
                      <select
                        value={form.familiarity_level}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, familiarity_level: event.target.value }))
                        }
                        disabled={!portal.lifecycle.canEdit}
                        className="mt-2 w-full rounded-lg bg-[#0b120f] border border-[#2e3d34] px-3 py-2 text-sm text-stone-100"
                      >
                        {familiarityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-stone-200">
                        Typical consumption method
                      </label>
                      <select
                        value={form.consumption_method}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, consumption_method: event.target.value }))
                        }
                        disabled={!portal.lifecycle.canEdit}
                        className="mt-2 w-full rounded-lg bg-[#0b120f] border border-[#2e3d34] px-3 py-2 text-sm text-stone-100"
                      >
                        {consumptionOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-stone-200">
                        Experience with edibles
                      </label>
                      <select
                        value={form.edible_experience}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, edible_experience: event.target.value }))
                        }
                        disabled={!portal.lifecycle.canEdit}
                        className="mt-2 w-full rounded-lg bg-[#0b120f] border border-[#2e3d34] px-3 py-2 text-sm text-stone-100"
                      >
                        {edibleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-stone-200">
                        Preferred dose (if known)
                      </label>
                      <input
                        type="text"
                        value={form.preferred_dose_note}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, preferred_dose_note: event.target.value }))
                        }
                        disabled={!portal.lifecycle.canEdit}
                        className="mt-2 w-full rounded-lg bg-[#0b120f] border border-[#2e3d34] px-3 py-2 text-sm text-stone-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-stone-200">Comfort notes</label>
                    <textarea
                      value={form.comfort_notes}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, comfort_notes: event.target.value }))
                      }
                      disabled={!portal.lifecycle.canEdit}
                      rows={2}
                      className="mt-2 w-full rounded-lg bg-[#0b120f] border border-[#2e3d34] px-3 py-2 text-sm text-stone-100"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-stone-200">
                    <input
                      type="checkbox"
                      checked={form.discuss_in_person_flag}
                      disabled={!portal.lifecycle.canEdit}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          discuss_in_person_flag: event.target.checked,
                        }))
                      }
                    />
                    Prefer to discuss in person
                  </label>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <section
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, #101614 0%, #0c1210 100%)',
          border: '1px solid rgba(89,118,95,0.22)',
        }}
      >
        <h2 className="text-xl font-semibold text-stone-100">Leave a Note for the Chef</h2>
        <textarea
          value={form.additional_note}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, additional_note: event.target.value }))
          }
          disabled={!portal.lifecycle.canEdit}
          rows={3}
          className="mt-3 w-full rounded-lg bg-[#0b120f] border border-[#2e3d34] px-3 py-2 text-sm text-stone-100"
        />
      </section>

      {showCannabisSections && (
        <section
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, #101614 0%, #0c1210 100%)',
            border: '1px solid rgba(89,118,95,0.22)',
          }}
        >
          <h2 className="text-xl font-semibold text-stone-100">Personal Responsibility</h2>
          <div className="mt-3 space-y-2 text-sm text-stone-200">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.voluntary_acknowledgment}
                disabled={!portal.lifecycle.canEdit}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, voluntary_acknowledgment: event.target.checked }))
                }
              />
              Participation is voluntary.
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.alcohol_acknowledgment}
                disabled={!portal.lifecycle.canEdit}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, alcohol_acknowledgment: event.target.checked }))
                }
              />
              I will avoid combining cannabis with alcohol.
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.transportation_acknowledgment}
                disabled={!portal.lifecycle.canEdit}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    transportation_acknowledgment: event.target.checked,
                  }))
                }
              />
              I will ensure safe transportation.
            </label>
          </div>
        </section>
      )}

      <section
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, #101614 0%, #0c1210 100%)',
          border: '1px solid rgba(89,118,95,0.22)',
        }}
      >
        <h2 className="text-xl font-semibold text-stone-100">Final Confirmation</h2>
        {!portal.lifecycle.canEdit && (
          <p className="mt-3 text-sm text-stone-300">
            Editing has closed for this event.
            {portal.lifecycle.archiveMode && ' This portal is now archival and read-only.'}
          </p>
        )}
        <label className="mt-3 flex items-center gap-2 text-sm text-stone-200">
          <input
            type="checkbox"
            checked={form.final_confirmation}
            disabled={!portal.lifecycle.canEdit}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, final_confirmation: event.target.checked }))
            }
          />
          I have reviewed the event information above.
        </label>
        {error && <p className="mt-3 text-sm text-amber-200">{error}</p>}
        <button
          type="submit"
          disabled={loading || !portal.lifecycle.canEdit}
          className="mt-4 w-full rounded-lg px-4 py-3 text-sm font-semibold text-stone-100 disabled:opacity-55"
          style={{ background: 'linear-gradient(135deg, #2b5d39 0%, #3f8451 100%)' }}
        >
          {loading ? 'Saving...' : 'Submit RSVP'}
        </button>
        {portal.lifecycle.canEdit && (
          <p className="mt-2 text-xs text-stone-500">
            You can update your response until {cutoffLabel}.
          </p>
        )}
      </section>
    </form>
  )
}

// ============================================================
// Post-RSVP Experience (countdown + messaging + docs + about me)
// ============================================================

function PostRSVPExperience({
  eventId,
  secureToken,
  portal,
  savedSummary,
  onEdit,
}: {
  eventId: string
  secureToken: string
  portal: ReadyPortal
  savedSummary: {
    attending_status: 'yes' | 'no' | 'maybe'
    cannabis_participation: string
    editCutoff: string
  }
  onEdit: () => void
}) {
  const eventDate = new Date(portal.event.eventDate)
  const now = new Date()
  const daysUntil = differenceInDays(eventDate, now)
  const hoursUntil = differenceInHours(eventDate, now)

  const isUpcoming = daysUntil >= 0

  return (
    <div className="space-y-6">
      {/* RSVP Confirmation + Countdown */}
      <section
        className="rounded-2xl p-8"
        style={{
          background: 'linear-gradient(135deg, #111a15 0%, #0d1411 100%)',
          border: '1px solid rgba(96,138,104,0.22)',
        }}
      >
        <h1 className="text-2xl font-semibold text-stone-100">
          {isUpcoming ? "You're All Set!" : 'RSVP Recorded'}
        </h1>
        <p className="mt-3 text-sm text-stone-300">
          <span className="font-medium">Attending:</span>{' '}
          {savedSummary.attending_status === 'yes' ? 'Yes' : savedSummary.attending_status === 'maybe' ? 'Maybe' : 'No'}
          {portal.event.cannabisEnabled && (
            <>
              {' | '}
              <span className="font-medium">Participation:</span>{' '}
              {savedSummary.cannabis_participation.replace(/_/g, ' ')}
            </>
          )}
        </p>

        {isUpcoming && savedSummary.attending_status === 'yes' && (
          <div className="mt-4 rounded-xl p-4 bg-[#0e1813] text-center">
            <p className="text-3xl font-bold text-emerald-400">
              {daysUntil > 0
                ? `${daysUntil} day${daysUntil === 1 ? '' : 's'}`
                : `${hoursUntil} hours`}
            </p>
            <p className="text-sm text-stone-400 mt-1">until your event</p>
            <p className="text-xs text-stone-500 mt-2">
              {format(eventDate, 'EEEE, MMMM d, yyyy')}
              {portal.event.arrivalTime && ` at ${portal.event.arrivalTime.slice(0, 5)}`}
            </p>
          </div>
        )}

        <p className="mt-3 text-xs text-stone-500">
          You can update your response until {format(new Date(savedSummary.editCutoff), 'PPP p')}.
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-stone-100"
            style={{ background: 'rgba(74,124,78,0.34)' }}
          >
            Update Response
          </button>
          {portal.event.cannabisEnabled && (
            <a
              href="/cannabis/public"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-stone-100 text-center"
              style={{ background: 'rgba(44,83,55,0.42)' }}
            >
              Cannabis What to Expect
            </a>
          )}
        </div>
      </section>

      {/* Pre-Event Info (loaded dynamically) */}
      {isUpcoming && savedSummary.attending_status === 'yes' && (
        <PreEventInfoSection eventId={eventId} secureToken={secureToken} />
      )}

      {/* Shared Documents */}
      <GuestDocumentsSection eventId={eventId} secureToken={secureToken} isPreEvent={isUpcoming} />

      {/* Message the Chef */}
      {savedSummary.attending_status === 'yes' && (
        <GuestMessageSection eventId={eventId} secureToken={secureToken} />
      )}

      {/* About Me */}
      {portal.event.visibility.show_guest_list && savedSummary.attending_status === 'yes' && (
        <GuestAboutMeSection eventId={eventId} secureToken={secureToken} />
      )}

      {/* Guest List (if visible) */}
      {portal.event.visibility.show_guest_list && portal.event.guestList.length > 0 && (
        <section
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, #101614 0%, #0c1210 100%)',
            border: '1px solid rgba(89,118,95,0.22)',
          }}
        >
          <h2 className="text-xl font-semibold text-stone-100">Who's Coming</h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-stone-300">
            {portal.event.guestList.map((guest) => (
              <div
                key={`${guest.full_name}-${guest.rsvp_status}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 bg-[#0e1412]"
              >
                <span>{guest.full_name}</span>
                <span
                  className={
                    guest.rsvp_status === 'attending'
                      ? 'text-emerald-400'
                      : guest.rsvp_status === 'declined'
                        ? 'text-red-400'
                        : 'text-stone-500'
                  }
                >
                  {guest.rsvp_status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// --- Pre-Event Info Section ---
function PreEventInfoSection({ eventId, secureToken }: { eventId: string; secureToken: string }) {
  const [content, setContent] = useState<Record<string, string> | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()

  function load() {
    startTransition(async () => {
      try {
        const data = await getPreEventContent(eventId, secureToken)
        setContent(data)
        setLoaded(true)
      } catch {
        setLoaded(true)
      }
    })
  }

  if (!loaded) {
    load()
    return null
  }

  if (!content || Object.values(content).every((v) => !v)) return null

  const items = [
    { label: 'Parking', value: content.parking_info },
    { label: 'Dress Code', value: content.dress_code },
    { label: 'What to Expect', value: content.what_to_expect },
    { label: 'Arrival', value: content.arrival_instructions },
    { label: 'From Your Host', value: content.custom_message },
  ].filter((item) => item.value)

  if (items.length === 0) return null

  return (
    <section
      className="rounded-2xl p-6"
      style={{
        background: 'linear-gradient(135deg, #101614 0%, #0c1210 100%)',
        border: '1px solid rgba(89,118,95,0.22)',
      }}
    >
      <h2 className="text-xl font-semibold text-stone-100">Before You Arrive</h2>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-xs uppercase tracking-wider text-stone-500">{item.label}</p>
            <p className="text-sm text-stone-300 mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// --- Guest Documents Section ---
function GuestDocumentsSection({
  eventId,
  secureToken,
  isPreEvent,
}: {
  eventId: string
  secureToken: string
  isPreEvent: boolean
}) {
  const [docs, setDocs] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()

  function load() {
    startTransition(async () => {
      try {
        const data = await getPublishedGuestDocuments(eventId, secureToken)
        setDocs(data)
        setLoaded(true)
      } catch {
        setLoaded(true)
      }
    })
  }

  if (!loaded) {
    load()
    return null
  }

  const filtered = docs.filter((d) => (isPreEvent ? d.is_pre_event : !d.is_pre_event))
  if (filtered.length === 0) return null

  return (
    <section
      className="rounded-2xl p-6"
      style={{
        background: 'linear-gradient(135deg, #101614 0%, #0c1210 100%)',
        border: '1px solid rgba(89,118,95,0.22)',
      }}
    >
      <h2 className="text-xl font-semibold text-stone-100">
        {isPreEvent ? 'Event Info' : 'From Your Chef'}
      </h2>
      <div className="mt-3 space-y-3">
        {filtered.map((doc: any) => (
          <div key={doc.id} className="rounded-lg p-3 bg-[#0e1412]">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a2e22] text-[#8fc99a]">
                {doc.document_type.replace(/_/g, ' ')}
              </span>
              <p className="text-stone-100 font-medium">{doc.title}</p>
            </div>
            {doc.description && <p className="text-sm text-stone-400 mt-1">{doc.description}</p>}
            {doc.content_text && (
              <p className="text-sm text-stone-300 mt-2 whitespace-pre-line">{doc.content_text}</p>
            )}
            {doc.file_url && (
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-400 underline mt-2 inline-block"
              >
                View document
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// --- Guest Message Section ---
function GuestMessageSection({ eventId, secureToken }: { eventId: string; secureToken: string }) {
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    if (!message.trim()) return
    startTransition(async () => {
      try {
        await sendGuestMessage({ eventId, secureToken, message: message.trim() })
        setSent(true)
        setMessage('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send')
      }
    })
  }

  return (
    <section
      className="rounded-2xl p-6"
      style={{
        background: 'linear-gradient(135deg, #101614 0%, #0c1210 100%)',
        border: '1px solid rgba(89,118,95,0.22)',
      }}
    >
      <h2 className="text-xl font-semibold text-stone-100">Message the Chef</h2>
      <p className="mt-1 text-xs text-stone-500">
        Questions about the menu, allergies, or anything else? Send a quick note.
      </p>
      {sent ? (
        <div className="mt-3 rounded-lg p-3 bg-[#0e1813] text-sm text-emerald-400">
          Message sent! The chef will see it on their event dashboard.
          <button
            type="button"
            onClick={() => setSent(false)}
            className="block mt-2 text-xs text-stone-400 underline"
          >
            Send another message
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Hi Chef, I just found out I have a shellfish allergy..."
            className="w-full rounded-lg bg-[#0b120f] border border-[#2e3d34] px-3 py-2 text-sm text-stone-100 placeholder-stone-600"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-stone-500">{message.length}/2000</span>
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending || !message.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-stone-100 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2b5d39 0%, #3f8451 100%)' }}
            >
              {isPending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-amber-300">{error}</p>}
        </div>
      )}
    </section>
  )
}

// --- Guest About Me Section ---
function GuestAboutMeSection({ eventId, secureToken }: { eventId: string; secureToken: string }) {
  const [aboutMe, setAboutMe] = useState('')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      try {
        await updateGuestAboutMe({ eventId, secureToken, aboutMe: aboutMe.trim() })
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch (err) {
        console.error('[GuestPortal] About me save failed:', err)
      }
    })
  }

  return (
    <section
      className="rounded-2xl p-6"
      style={{
        background: 'linear-gradient(135deg, #101614 0%, #0c1210 100%)',
        border: '1px solid rgba(89,118,95,0.22)',
      }}
    >
      <h2 className="text-xl font-semibold text-stone-100">About You</h2>
      <p className="mt-1 text-xs text-stone-500">
        Optional. Share a quick intro so other guests know who you are.
      </p>
      <textarea
        value={aboutMe}
        onChange={(e) => setAboutMe(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Food lover, wine enthusiast, first time at a private dinner..."
        className="mt-3 w-full rounded-lg bg-[#0b120f] border border-[#2e3d34] px-3 py-2 text-sm text-stone-100 placeholder-stone-600"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-stone-500">{aboutMe.length}/500</span>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-emerald-400">Saved!</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-100 disabled:opacity-50"
            style={{ background: 'rgba(74,124,78,0.34)' }}
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </section>
  )
}
