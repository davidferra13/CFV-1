'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, ExternalLink } from '@/components/ui/icons'
import { sendDietaryOutreach, getDietaryOutreachStatus } from '@/lib/dietary-outreach/actions'
import type { GuestOutreachInfo, DietaryOutreachStatus } from '@/lib/dietary-outreach/types'

const STATUS_CONFIG: Record<
  DietaryOutreachStatus | 'not_sent',
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  not_sent: { label: 'Not Sent', variant: 'default' },
  sent: { label: 'Sent', variant: 'warning' },
  opened: { label: 'Opened', variant: 'info' },
  responded: { label: 'Responded', variant: 'success' },
  expired: { label: 'Expired', variant: 'error' },
}

type DietaryOutreachPanelProps = {
  eventId: string
}

type OutreachGuest = GuestOutreachInfo & {
  token?: string | null
  public_form_url?: string | null
  dietary_confirmed_at?: string | null
  allergy_severity?: string | null
  spice_tolerance?: string | null
}

export function DietaryOutreachPanel({ eventId }: DietaryOutreachPanelProps) {
  const [guests, setGuests] = useState<OutreachGuest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSending, startSendTransition] = useTransition()

  const fetchStatus = useCallback(async () => {
    try {
      const result = await getDietaryOutreachStatus(eventId)
      if (result.success) {
        setGuests(result.guests as OutreachGuest[])
        setError(null)
      } else {
        setError(result.error || 'Failed to load outreach status')
      }
    } catch {
      setError('Failed to load outreach status')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  function handleSend() {
    startSendTransition(async () => {
      try {
        const result = await sendDietaryOutreach(eventId)
        if (result.success) {
          const parts: string[] = []
          if (result.sent > 0) {
            parts.push(`Sent to ${result.sent} guest${result.sent !== 1 ? 's' : ''}`)
          }
          if (result.skipped > 0) parts.push(`${result.skipped} already contacted`)
          toast.success(parts.join(', ') || 'Outreach complete')
          await fetchStatus()
        } else {
          toast.error(result.error || 'Failed to send dietary outreach')
        }
      } catch {
        toast.error('Failed to send dietary outreach')
      }
    })
  }

  if (loading) {
    return (
      <div className="bg-stone-900/50 border border-stone-700/50 rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-48 bg-stone-700/50 rounded" />
          <div className="h-8 w-56 bg-stone-700/50 rounded" />
          <div className="h-16 bg-stone-700/50 rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-stone-900/50 border border-stone-700/50 rounded-lg p-4">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    )
  }

  const guestsWithEmail = guests.filter((g) => g.email)
  const noEmailGuests = guests.length > 0 && guestsWithEmail.length === 0
  const respondedCount = guests.filter((g) => g.status === 'responded').length
  const withKnownDietary = guests.filter(
    (g) => g.dietary_restrictions.length > 0 || g.allergies.length > 0
  ).length
  const missingDietary = guests.length - withKnownDietary

  return (
    <div className="bg-stone-900/50 border border-stone-700/50 rounded-lg p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-100">Dietary Outreach</h3>
          <p className="mt-1 text-xs text-stone-500">
            {guests.length > 0
              ? `${respondedCount}/${guests.length} responded, ${missingDietary} missing dietary info`
              : 'Collect per-guest dietary information before service.'}
          </p>
        </div>
        {guestsWithEmail.length > 0 && (
          <Button onClick={handleSend} disabled={isSending} loading={isSending} size="sm">
            <Mail size={16} />
            Send Dietary Confirmation
          </Button>
        )}
      </div>

      {noEmailGuests && (
        <p className="text-sm text-stone-400">
          No guests with email addresses. Add emails to send dietary confirmations.
        </p>
      )}

      {guests.length === 0 && (
        <p className="text-sm text-stone-400">No guests added to this event yet.</p>
      )}

      {guests.length > 0 && (
        <div className="space-y-2">
          {guests.map((guest) => {
            const config = STATUS_CONFIG[guest.status]
            const publicFormUrl = getPublicFormUrl(guest)
            return (
              <div
                key={guest.guest_id}
                className="rounded-lg border border-stone-800/80 bg-stone-950/30 p-3"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-stone-100">{guest.guest_name}</p>
                      <Badge variant={config.variant}>{config.label}</Badge>
                      {guest.responded_at && (
                        <span className="text-xs text-stone-500">
                          Responded {formatDate(guest.responded_at)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-stone-500">
                      {guest.email || 'No email address'}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {publicFormUrl ? (
                      <a
                        href={publicFormUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-stone-700 px-3 text-xs font-medium text-stone-300 hover:border-stone-600 hover:bg-stone-800/70"
                      >
                        <ExternalLink size={14} />
                        Open Guest Form
                      </a>
                    ) : (
                      <p className="max-w-[220px] text-xs text-stone-500 md:text-right">
                        {getPublicFormUnavailableText(guest)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <DietaryValue label="Allergies" values={guest.allergies} />
                  <DietaryValue label="Dietary" values={guest.dietary_restrictions} />
                </div>

                {(guest.allergy_severity || guest.spice_tolerance) && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-500">
                    {guest.allergy_severity && (
                      <span>Severity: {formatTokenLabel(guest.allergy_severity)}</span>
                    )}
                    {guest.spice_tolerance && (
                      <span>Spice: {formatTokenLabel(guest.spice_tolerance)}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DietaryValue({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-md bg-stone-900/70 px-3 py-2">
      <p className="text-[11px] font-medium uppercase text-stone-500">{label}</p>
      {values.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span
              key={value}
              className="rounded-md border border-stone-700 bg-stone-800/80 px-2 py-1 text-xs text-stone-200"
            >
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-xs text-stone-500">None reported</p>
      )}
    </div>
  )
}

function getPublicFormUrl(guest: OutreachGuest) {
  if (guest.public_form_url) return guest.public_form_url
  if (guest.token) return `/dietary-confirm/${guest.token}`
  return null
}

function getPublicFormUnavailableText(guest: OutreachGuest) {
  if (!guest.email) return 'Unavailable until this guest has an email address.'
  if (guest.status === 'not_sent') return 'Send outreach to create the guest form link.'
  return 'Secure form link was sent by email; the status action does not expose the token.'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatTokenLabel(value: string) {
  return value.replace(/_/g, ' ')
}
