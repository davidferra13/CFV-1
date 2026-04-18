'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { CannabisPortalHeader } from '@/components/cannabis/cannabis-portal-header'
import { updateChefCannabisGuestProfile } from '@/lib/chef/cannabis-actions'

type DashboardEvent = {
  id: string
  occasion: string | null
  event_date: string
  serve_time: string | null
  status: string | null
}

type GuestRow = {
  id: string
  fullName: string
  attendingStatus: 'yes' | 'no' | 'no_response'
  cannabisParticipation: 'participate' | 'not_consume' | 'undecided' | 'no_response'
  familiarityLevel: string | null
  edibleFamiliarity: string | null
  preferredDoseNote: string | null
  dietaryNotes: string | null
  accessibilityNotes: string | null
  discussInPerson: boolean
  additionalNote: string | null
  comfortNotes: string | null
  consumptionStyle: string[]
  updatedAt: string
  hasResponded: boolean
  profileRaw: any
  isEditable: boolean
}

type DashboardData = {
  events: DashboardEvent[]
  selectedEvent: DashboardEvent | null
  summary: {
    totalInvited: number
    totalAttending: number
    participating: number
    notConsuming: number
    undecided: number
    missingResponses: number
  } | null
  guests: GuestRow[]
  editCutoffIso: string | null
  editWindowOpen: boolean
}

type FilterKey =
  | 'participating'
  | 'not_consume'
  | 'undecided'
  | 'no_response'
  | 'has_dietary'
  | 'has_accessibility'
  | 'discuss'

type SortKey =
  | 'fullName'
  | 'attendingStatus'
  | 'cannabisParticipation'
  | 'familiarityLevel'
  | 'edibleFamiliarity'
  | 'updatedAt'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'participating', label: 'Participating' },
  { key: 'not_consume', label: 'Not Consuming' },
  { key: 'undecided', label: 'Undecided' },
  { key: 'no_response', label: 'No Response' },
  { key: 'has_dietary', label: 'Has Dietary Notes' },
  { key: 'has_accessibility', label: 'Has Accessibility Notes' },
  { key: 'discuss', label: 'Discuss In Person' },
]

const CONSUMPTION_OPTIONS = [
  'smoking',
  'edibles',
  'tincture',
  'other',
  'infused_course',
  'paired_noninfused',
  'skip_infusion',
  'unsure',
] as const

function pillColor(value: GuestRow['cannabisParticipation']) {
  if (value === 'participate') return 'rgba(74,124,78,0.22)'
  if (value === 'not_consume') return 'rgba(42,92,76,0.22)'
  if (value === 'undecided') return 'rgba(130,104,58,0.25)'
  return 'rgba(88,88,88,0.25)'
}

function labelize(value?: string | null) {
  if (!value) return '-'
  return value.replace(/_/g, ' ')
}

function formatUpdated(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return format(date, 'MMM d, p')
}

export function CannabisRsvpsDashboardClient({ initialData }: { initialData: DashboardData }) {
  const data = initialData
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selectedGuest, setSelectedGuest] = useState<GuestRow | null>(null)
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [copied, setCopied] = useState(false)

  const selectedEvent = data.selectedEvent
  const summary = data.summary

  const filteredGuests = useMemo(() => {
    const rows = data.guests.filter((guest) => {
      if (activeFilters.has('participating') && guest.cannabisParticipation !== 'participate')
        return false
      if (activeFilters.has('not_consume') && guest.cannabisParticipation !== 'not_consume')
        return false
      if (activeFilters.has('undecided') && guest.cannabisParticipation !== 'undecided')
        return false
      if (activeFilters.has('no_response') && guest.cannabisParticipation !== 'no_response')
        return false
      if (activeFilters.has('has_dietary') && !guest.dietaryNotes) return false
      if (activeFilters.has('has_accessibility') && !guest.accessibilityNotes) return false
      if (activeFilters.has('discuss') && !guest.discussInPerson) return false
      return true
    })

    const sorted = [...rows]
    sorted.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1
      const left = a[sortKey]
      const right = b[sortKey]

      if (sortKey === 'updatedAt') {
        return (
          (new Date(left as string).getTime() - new Date(right as string).getTime()) * direction
        )
      }

      return String(left ?? '').localeCompare(String(right ?? '')) * direction
    })

    return sorted
  }, [activeFilters, data.guests, sortDirection, sortKey])

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(key)
    setSortDirection('asc')
  }

  const handleEventChange = (eventId: string) => {
    const next = new URLSearchParams(searchParams?.toString() ?? '')
    next.set('eventId', eventId)
    router.push(`${pathname}?${next.toString()}`)
  }

  const copyReminder = async () => {
    if (!summary || summary.missingResponses <= 0 || !selectedEvent) return

    const text = `${summary.missingResponses} guests are still pending for ${selectedEvent.occasion || 'this event'} on ${selectedEvent.event_date}. Please submit your RSVP update in your personal guest portal.`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <>
      <div className="px-4 sm:px-6 py-8 max-w-[1200px] mx-auto">
        <CannabisPortalHeader
          title="Cannabis Event RSVPs"
          subtitle="Review guest participation and intake details."
          backHref="/cannabis"
          backLabel="Cannabis Hub"
          actions={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-[260px]">
              <select
                value={selectedEvent?.id || ''}
                onChange={(event) => handleEventChange(event.target.value)}
                className="text-xs rounded-lg px-3 py-2 min-w-[180px]"
                style={{
                  background: '#0b130b',
                  border: '1px solid rgba(74,124,78,0.22)',
                  color: '#d9eedc',
                }}
              >
                {data.events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {(event.occasion || 'Private Dinner') + ' - ' + event.event_date}
                  </option>
                ))}
              </select>
              {/* Export PDF disabled: endpoint is a stub (returns 404).
                  Re-enable when /api/cannabis/rsvps/[eventId]/summary is built. */}
              <button
                type="button"
                disabled
                className="px-3 py-2 rounded-lg text-xs font-semibold text-center cursor-not-allowed opacity-70"
                style={{
                  background: 'rgba(74,124,78,0.16)',
                  border: '1px solid rgba(74,124,78,0.25)',
                  color: '#8fb791',
                }}
              >
                Generate Control Packet
              </button>
            </div>
          }
        />

        {!selectedEvent || !summary ? (
          <div
            className="rounded-xl px-6 py-10 text-center"
            style={{
              background: 'linear-gradient(135deg, #0f1a0f 0%, #131f14 100%)',
              border: '1px solid rgba(74,124,78,0.2)',
            }}
          >
            <p className="text-sm" style={{ color: '#6aaa6e' }}>
              No cannabis-enabled events found yet.
            </p>
            <Link
              href="/events/new"
              className="inline-block mt-3 text-xs underline"
              style={{ color: '#8bc34a' }}
            >
              Create a cannabis-enabled event
            </Link>
          </div>
        ) : (
          <>
            <div
              className="rounded-xl p-4 mb-4"
              style={{
                background: 'linear-gradient(135deg, #0f1a0f 0%, #131f14 100%)',
                border: '1px solid rgba(74,124,78,0.2)',
              }}
            >
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#4a7c4e' }}>
                Event Summary
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
                <p className="text-sm font-semibold" style={{ color: '#e8f5e9' }}>
                  {selectedEvent.occasion || 'Private Dinner'}
                </p>
                <p className="text-xs" style={{ color: '#6aaa6e' }}>
                  {format(new Date(selectedEvent.event_date), 'EEEE, MMM d, yyyy')}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                <StatCell label="Total invited" value={summary.totalInvited} />
                <StatCell label="Attending" value={summary.totalAttending} />
                <StatCell label="Participating" value={summary.participating} />
                <StatCell label="Not consuming" value={summary.notConsuming} />
                <StatCell label="Undecided" value={summary.undecided} />
                <StatCell label="Missing" value={summary.missingResponses} emphasize />
              </div>
            </div>

            {summary.missingResponses > 0 && (
              <div
                className="rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                style={{
                  background: 'rgba(90,122,45,0.14)',
                  border: '1px solid rgba(90,122,45,0.28)',
                }}
              >
                <p className="text-sm" style={{ color: '#d2e3c0' }}>
                  {summary.missingResponses} guests have not responded.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyReminder}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      background: '#1e3b20',
                      border: '1px solid rgba(74,124,78,0.25)',
                      color: copied ? '#9cd9a0' : '#d8ebda',
                    }}
                  >
                    {copied ? 'Reminder Copied' : 'Copy Reminder Link'}
                  </button>
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold opacity-70 cursor-not-allowed"
                    style={{
                      background: 'rgba(15,20,15,0.55)',
                      border: '1px solid rgba(74,124,78,0.2)',
                      color: '#9db9a0',
                    }}
                  >
                    Resend Reminder
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {FILTERS.map((filter) => {
                const active = activeFilters.has(filter.key)
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => toggleFilter(filter.key)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: active ? 'rgba(74,124,78,0.28)' : 'rgba(15,20,15,0.48)',
                      border: `1px solid ${active ? 'rgba(139,195,74,0.5)' : 'rgba(74,124,78,0.2)'}`,
                      color: active ? '#d9efd5' : '#9ab29d',
                    }}
                  >
                    {filter.label}
                  </button>
                )
              })}
            </div>

            <div
              className="rounded-xl overflow-hidden hidden md:block"
              style={{
                background: 'linear-gradient(135deg, #0f1a0f 0%, #131f14 100%)',
                border: '1px solid rgba(74,124,78,0.2)',
              }}
            >
              <table className="w-full text-sm">
                <thead style={{ background: 'rgba(8,15,8,0.85)' }}>
                  <tr>
                    <SortHeader label="Guest Name" onClick={() => toggleSort('fullName')} />
                    <SortHeader label="Attending" onClick={() => toggleSort('attendingStatus')} />
                    <SortHeader
                      label="Participation"
                      onClick={() => toggleSort('cannabisParticipation')}
                    />
                    <SortHeader
                      label="Familiarity"
                      onClick={() => toggleSort('familiarityLevel')}
                    />
                    <SortHeader label="Edibles" onClick={() => toggleSort('edibleFamiliarity')} />
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[#719474]">
                      Preferred Dose
                    </th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[#719474]">
                      Dietary
                    </th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[#719474]">
                      Accessibility
                    </th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[#719474]">
                      Discuss
                    </th>
                    <SortHeader label="Last Updated" onClick={() => toggleSort('updatedAt')} />
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.map((guest) => (
                    <tr
                      key={guest.id}
                      onClick={() => setSelectedGuest(guest)}
                      className="cursor-pointer transition-colors hover:bg-[#132116]"
                      style={{
                        borderTop: '1px solid rgba(74,124,78,0.1)',
                      }}
                    >
                      <td className="px-3 py-3 text-[#e4f2e5]">{guest.fullName}</td>
                      <td className="px-3 py-3 text-[#b7ceb9]">
                        {labelize(guest.attendingStatus)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-xs"
                          style={{
                            background: pillColor(guest.cannabisParticipation),
                            color: '#d6ebd8',
                          }}
                        >
                          {labelize(guest.cannabisParticipation)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[#b7ceb9]">
                        {labelize(guest.familiarityLevel)}
                      </td>
                      <td className="px-3 py-3 text-[#b7ceb9]">
                        {labelize(guest.edibleFamiliarity)}
                      </td>
                      <td className="px-3 py-3 text-[#97b89c]">
                        {guest.preferredDoseNote ? '*' : '-'}
                      </td>
                      <td className="px-3 py-3 text-[#97b89c]">{guest.dietaryNotes ? '*' : '-'}</td>
                      <td className="px-3 py-3 text-[#97b89c]">
                        {guest.accessibilityNotes ? '*' : '-'}
                      </td>
                      <td className="px-3 py-3 text-[#97b89c]">
                        {guest.discussInPerson ? 'Yes' : '-'}
                      </td>
                      <td className="px-3 py-3 text-[#97b89c]">{formatUpdated(guest.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-2">
              {filteredGuests.map((guest) => (
                <button
                  key={guest.id}
                  type="button"
                  onClick={() => setSelectedGuest(guest)}
                  className="w-full text-left rounded-xl p-3"
                  style={{
                    background: 'linear-gradient(135deg, #0f1a0f 0%, #131f14 100%)',
                    border: '1px solid rgba(74,124,78,0.2)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium" style={{ color: '#e4f2e5' }}>
                      {guest.fullName}
                    </p>
                    <span
                      className="inline-flex px-2 py-0.5 rounded-full text-xs-tight"
                      style={{
                        background: pillColor(guest.cannabisParticipation),
                        color: '#d6ebd8',
                      }}
                    >
                      {labelize(guest.cannabisParticipation)}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#9eb8a2' }}>
                    {labelize(guest.attendingStatus)} | Updated {formatUpdated(guest.updatedAt)}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <GuestDrawer
        eventId={selectedEvent?.id || null}
        guest={selectedGuest}
        onClose={() => setSelectedGuest(null)}
      />
    </>
  )
}

function SortHeader({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <th className="px-3 py-2 text-left">
      <button
        type="button"
        onClick={onClick}
        className="text-xs uppercase tracking-wider text-[#719474] hover:text-[#d0e6d2]"
      >
        {label}
      </button>
    </th>
  )
}

function StatCell({
  label,
  value,
  emphasize = false,
}: {
  label: string
  value: number
  emphasize?: boolean
}) {
  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{
        background: emphasize ? 'rgba(115,90,40,0.2)' : 'rgba(10,18,10,0.5)',
        border: `1px solid ${emphasize ? 'rgba(115,90,40,0.4)' : 'rgba(74,124,78,0.16)'}`,
      }}
    >
      <p className="text-xs-tight uppercase tracking-wider" style={{ color: '#799c7c' }}>
        {label}
      </p>
      <p className="text-lg font-semibold leading-tight" style={{ color: '#e4f2e5' }}>
        {value}
      </p>
    </div>
  )
}

function GuestDrawer({
  eventId,
  guest,
  onClose,
}: {
  eventId: string | null
  guest: GuestRow | null
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    attendingStatus: 'yes',
    cannabisParticipation: 'undecided',
    familiarityLevel: '',
    edibleFamiliarity: '',
    preferredDoseNote: '',
    comfortNotes: '',
    dietaryNotes: '',
    accessibilityNotes: '',
    additionalNote: '',
    discussInPersonFlag: false,
    consumptionStyle: [] as string[],
  })

  useEffect(() => {
    if (!guest) return
    setError(null)
    setSuccess(false)
    setForm({
      attendingStatus: guest.attendingStatus === 'no' ? 'no' : 'yes',
      cannabisParticipation:
        guest.cannabisParticipation === 'no_response' ? 'undecided' : guest.cannabisParticipation,
      familiarityLevel: guest.familiarityLevel || '',
      edibleFamiliarity: guest.edibleFamiliarity || '',
      preferredDoseNote: guest.preferredDoseNote || '',
      comfortNotes: guest.comfortNotes || '',
      dietaryNotes: guest.dietaryNotes || '',
      accessibilityNotes: guest.accessibilityNotes || '',
      additionalNote: guest.additionalNote || '',
      discussInPersonFlag: guest.discussInPerson,
      consumptionStyle: guest.consumptionStyle || [],
    })
  }, [guest])

  if (!guest) return null

  const editable = guest.isEditable && !!eventId

  const save = () => {
    if (!eventId) return
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        await updateChefCannabisGuestProfile({
          eventId,
          guestId: guest.id,
          attendingStatus: form.attendingStatus as 'yes' | 'no',
          cannabisParticipation: form.cannabisParticipation as
            | 'participate'
            | 'not_consume'
            | 'undecided',
          familiarityLevel: (form.familiarityLevel || null) as any,
          edibleFamiliarity: (form.edibleFamiliarity || null) as any,
          preferredDoseNote: form.preferredDoseNote || null,
          comfortNotes: form.comfortNotes || null,
          dietaryNotes: form.dietaryNotes || null,
          accessibilityNotes: form.accessibilityNotes || null,
          additionalNote: form.additionalNote || null,
          discussInPersonFlag: form.discussInPersonFlag,
          consumptionStyle: form.consumptionStyle as any,
        })
        setSuccess(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save guest intake')
      }
    })
  }

  const toggleStyle = (style: string) => {
    setForm((prev) => {
      const exists = prev.consumptionStyle.includes(style)
      return {
        ...prev,
        consumptionStyle: exists
          ? prev.consumptionStyle.filter((item) => item !== style)
          : [...prev.consumptionStyle, style],
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 pointer-events-auto"
        aria-label="Close guest drawer"
      />
      <div
        className="absolute right-0 top-0 h-full w-full max-w-[520px] pointer-events-auto transition-transform duration-300"
        style={{
          background: 'linear-gradient(180deg, #0e1a0f 0%, #101d11 100%)',
          borderLeft: '1px solid rgba(74,124,78,0.28)',
          boxShadow: '-20px 0 40px rgba(0,0,0,0.4)',
        }}
      >
        <div className="h-full overflow-y-auto p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold" style={{ color: '#e8f5e9' }}>
                {guest.fullName}
              </p>
              <p className="text-xs mt-1" style={{ color: '#7fa282' }}>
                Updated {formatUpdated(guest.updatedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-2 py-1 rounded"
              style={{ color: '#8fb791', border: '1px solid rgba(74,124,78,0.22)' }}
            >
              Close
            </button>
          </div>

          {!editable && (
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{
                background: 'rgba(90,90,90,0.2)',
                border: '1px solid rgba(90,90,90,0.3)',
                color: '#c8d4ca',
              }}
            >
              Edit window has closed. This intake is now read-only.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldLabel label="Attending">
              <select
                value={form.attendingStatus}
                disabled={!editable}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, attendingStatus: event.target.value }))
                }
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </FieldLabel>
            <FieldLabel label="Participation">
              <select
                value={form.cannabisParticipation}
                disabled={!editable}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cannabisParticipation: event.target.value }))
                }
              >
                <option value="participate">Participate</option>
                <option value="not_consume">Not consume</option>
                <option value="undecided">Undecided</option>
              </select>
            </FieldLabel>
            <FieldLabel label="Familiarity">
              <select
                value={form.familiarityLevel}
                disabled={!editable}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, familiarityLevel: event.target.value }))
                }
              >
                <option value="">-</option>
                <option value="first_time">First-time</option>
                <option value="occasional">Occasional</option>
                <option value="regular">Regular</option>
                <option value="new">New</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="experienced">Experienced</option>
              </select>
            </FieldLabel>
            <FieldLabel label="Edible Familiarity">
              <select
                value={form.edibleFamiliarity}
                disabled={!editable}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, edibleFamiliarity: event.target.value }))
                }
              >
                <option value="">-</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unsure">Unsure</option>
                <option value="none">None</option>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </FieldLabel>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#7a9f7d' }}>
              Consumption Style
            </p>
            <div className="flex flex-wrap gap-2">
              {CONSUMPTION_OPTIONS.map((option) => {
                const active = form.consumptionStyle.includes(option)
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={!editable}
                    onClick={() => toggleStyle(option)}
                    className="px-3 py-1.5 rounded-full text-xs"
                    style={{
                      background: active ? 'rgba(74,124,78,0.28)' : 'rgba(12,20,12,0.6)',
                      color: active ? '#ddf0de' : '#95b196',
                      border: `1px solid ${active ? 'rgba(139,195,74,0.45)' : 'rgba(74,124,78,0.2)'}`,
                    }}
                  >
                    {labelize(option)}
                  </button>
                )
              })}
            </div>
          </div>

          <FieldLabel label="Preferred Dose Note">
            <textarea
              rows={2}
              value={form.preferredDoseNote}
              disabled={!editable}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, preferredDoseNote: event.target.value }))
              }
            />
          </FieldLabel>

          <FieldLabel label="Comfort Notes">
            <textarea
              rows={2}
              value={form.comfortNotes}
              disabled={!editable}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, comfortNotes: event.target.value }))
              }
            />
          </FieldLabel>

          <FieldLabel label="Dietary Notes">
            <textarea
              rows={2}
              value={form.dietaryNotes}
              disabled={!editable}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, dietaryNotes: event.target.value }))
              }
            />
          </FieldLabel>

          <FieldLabel label="Accessibility Notes">
            <textarea
              rows={2}
              value={form.accessibilityNotes}
              disabled={!editable}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, accessibilityNotes: event.target.value }))
              }
            />
          </FieldLabel>

          <FieldLabel label="Additional Note">
            <textarea
              rows={2}
              value={form.additionalNote}
              disabled={!editable}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, additionalNote: event.target.value }))
              }
            />
          </FieldLabel>

          <label className="flex items-center gap-2 text-sm" style={{ color: '#cde0ce' }}>
            <input
              type="checkbox"
              checked={form.discussInPersonFlag}
              disabled={!editable}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, discussInPersonFlag: event.target.checked }))
              }
            />
            Discuss in person
          </label>

          {error && (
            <p
              className="text-xs rounded-lg px-3 py-2"
              style={{
                background: 'rgba(90,60,40,0.32)',
                color: '#efcfb8',
                border: '1px solid rgba(140,100,70,0.4)',
              }}
            >
              {error}
            </p>
          )}
          {success && <p className="text-xs text-[#9dd5a3]">Saved.</p>}

          <button
            type="button"
            onClick={save}
            disabled={!editable || isPending}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold disabled:cursor-not-allowed"
            style={{
              background: editable
                ? 'linear-gradient(135deg, #2d5a30 0%, #4a7c4e 100%)'
                : 'rgba(45,45,45,0.45)',
              color: editable ? '#e8f5e9' : '#9da59e',
            }}
          >
            {isPending ? 'Saving...' : 'Save Intake Updates'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: '#7a9f7d' }}>
        {label}
      </p>
      {children}
    </label>
  )
}
