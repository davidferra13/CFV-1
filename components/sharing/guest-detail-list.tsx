'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  exportGuestListCSV,
  getClientGuestDetails,
  removeGuest,
  resendGuestInvite,
} from '@/lib/sharing/guest-detail-actions'

type GuestDetailListProps = {
  eventId: string
  originalGuestCount: number | null
}

type GuestDetailState = Awaited<ReturnType<typeof getClientGuestDetails>> | null

function getStatusBadge(status: string) {
  if (status === 'attending') return <Badge variant="success">Attending</Badge>
  if (status === 'declined') return <Badge variant="error">Declined</Badge>
  if (status === 'maybe') return <Badge variant="warning">Maybe</Badge>
  if (status === 'waitlisted') return <Badge variant="info">Waitlisted</Badge>
  return <Badge variant="default">Pending</Badge>
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function GuestDetailList({ eventId, originalGuestCount }: GuestDetailListProps) {
  const [data, setData] = useState<GuestDetailState>(null)
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  function refresh() {
    startTransition(() => {
      void (async () => {
        try {
          setData(await getClientGuestDetails(eventId))
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to load guest details')
        }
      })()
    })
  }

  useEffect(() => {
    refresh()
  }, [eventId])

  const filteredGuests = useMemo(() => {
    if (!data?.guests.length) return []
    const normalized = query.trim().toLowerCase()
    if (!normalized) return data.guests
    return data.guests.filter((guest) => guest.name.toLowerCase().includes(normalized))
  }, [data, query])

  function handleRemoveGuest(guestId: string, guestName: string) {
    if (!window.confirm(`Remove ${guestName} from this guest list?`)) {
      return
    }

    startTransition(() => {
      void (async () => {
        try {
          await removeGuest(eventId, guestId)
          toast.success(`${guestName} removed`)
          refresh()
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to remove guest')
        }
      })()
    })
  }

  function handleResendInvite(guestId: string, guestName: string) {
    startTransition(() => {
      void (async () => {
        try {
          const result = await resendGuestInvite(eventId, guestId)
          if (result.directUrl) {
            await navigator.clipboard.writeText(result.directUrl)
            toast.success(`Invite link copied for ${guestName}`)
          } else {
            toast.success(`Invite resent for ${guestName}`)
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to resend invite')
        }
      })()
    })
  }

  function handleDownload() {
    startTransition(() => {
      void (async () => {
        try {
          const csv = await exportGuestListCSV(eventId)
          downloadCSV(`chef-flow-guests-${eventId}.csv`, csv)
          toast.success('Guest list downloaded')
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to export guest list')
        }
      })()
    })
  }

  if (!data) {
    return <p className="text-sm text-stone-400">Loading guest responses...</p>
  }

  const effectiveAttending =
    data.summary.attending + data.guests.reduce((sum, guest) => sum + guest.plus_ones, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg bg-emerald-950 px-3 py-2 text-center">
          <div className="text-xl font-bold text-emerald-200">{data.summary.attending}</div>
          <div className="text-xs text-emerald-600">Attending</div>
        </div>
        <div className="rounded-lg bg-amber-950 px-3 py-2 text-center">
          <div className="text-xl font-bold text-amber-200">{data.summary.maybe}</div>
          <div className="text-xs text-amber-600">Maybe</div>
        </div>
        <div className="rounded-lg bg-red-950 px-3 py-2 text-center">
          <div className="text-xl font-bold text-red-200">{data.summary.declined}</div>
          <div className="text-xs text-red-600">Declined</div>
        </div>
        <div className="rounded-lg bg-stone-800 px-3 py-2 text-center">
          <div className="text-xl font-bold text-stone-300">{data.summary.pending}</div>
          <div className="text-xs text-stone-400">Pending</div>
        </div>
        <div className="rounded-lg bg-blue-950 px-3 py-2 text-center">
          <div className="text-xl font-bold text-blue-300">{data.summary.waitlisted}</div>
          <div className="text-xs text-blue-300">Waitlisted</div>
        </div>
      </div>

      {originalGuestCount ? (
        <div className="rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-400">
          <span className="font-medium text-stone-200">{effectiveAttending}</span> confirmed
          attending of <span className="font-medium text-stone-200">{originalGuestCount}</span>{' '}
          expected
        </div>
      ) : null}

      {!data.showDetails ? (
        <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-4">
          <p className="text-sm text-stone-300">
            Individual guest details are managed privately by your chef. You can still track the
            RSVP summary here.
          </p>
        </div>
      ) : data.guests.length === 0 ? (
        <p className="text-sm text-stone-500">
          No guest responses yet. Share the link above so your guests can respond.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search guest names"
              className="sm:max-w-xs"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              loading={isPending}
            >
              Download Guest List
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-stone-700">
            <div className="hidden grid-cols-[minmax(0,1.5fr)_140px_minmax(0,1.2fr)_90px_180px] gap-3 border-b border-stone-700 bg-stone-900/80 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-400 md:grid">
              <div>Guest</div>
              <div>Status</div>
              <div>Dietary Notes</div>
              <div>Plus Ones</div>
              <div>Actions</div>
            </div>

            <div className="divide-y divide-stone-800 bg-stone-950/40">
              {filteredGuests.length === 0 ? (
                <div className="px-4 py-6 text-sm text-stone-500">
                  No guests match your current search.
                </div>
              ) : (
                filteredGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.5fr)_140px_minmax(0,1.2fr)_90px_180px] md:items-center"
                  >
                    <div>
                      <div className="font-medium text-stone-100">{guest.name}</div>
                      <div className="mt-1 text-xs text-stone-500">
                        {[guest.email, guest.phone].filter(Boolean).join(' | ') ||
                          'No contact details'}
                      </div>
                      {guest.responded_at ? (
                        <div className="mt-1 text-xs text-stone-500">
                          Responded{' '}
                          {new Date(guest.responded_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      ) : null}
                    </div>

                    <div>{getStatusBadge(guest.rsvp_status)}</div>

                    <div className="text-sm text-stone-300">
                      {guest.dietary_notes || <span className="text-stone-500">None shared</span>}
                    </div>

                    <div className="text-sm text-stone-200">{guest.plus_ones}</div>

                    <div className="flex flex-wrap gap-2">
                      {guest.rsvp_status === 'pending' ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleResendInvite(guest.id, guest.name)}
                          loading={isPending}
                        >
                          Resend Invite
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveGuest(guest.id, guest.name)}
                        loading={isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
