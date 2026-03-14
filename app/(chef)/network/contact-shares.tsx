// Direct Contact Shares - private handoffs between connected chefs
'use client'

import { type FormEvent, useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  requestNetworkHelp,
  respondToNetworkContactShare,
  type ChefFriend,
  type NetworkContactShare,
} from '@/lib/network/actions'

interface ContactSharesProps {
  connections: ChefFriend[]
  shares: NetworkContactShare[]
}

export function ContactShares({ connections, shares: initialShares }: ContactSharesProps) {
  const [shares, setShares] = useState(initialShares)
  const [helpType, setHelpType] = useState<'date_help' | 'inquiry_help' | 'full_handover'>(
    'date_help'
  )
  const [recipientChefId, setRecipientChefId] = useState(connections[0]?.chef_id ?? '')
  const [inquiryId, setInquiryId] = useState('')
  const [inquirySummary, setInquirySummary] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [location, setLocation] = useState('')
  const [details, setDetails] = useState('')
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const received = useMemo(() => shares.filter((share) => share.direction === 'received'), [shares])
  const sent = useMemo(() => shares.filter((share) => share.direction === 'sent'), [shares])

  function resetForm() {
    setHelpType('date_help')
    setInquiryId('')
    setInquirySummary('')
    setContactName('')
    setContactPhone('')
    setContactEmail('')
    setEventDate('')
    setLocation('')
    setDetails('')
  }

  function handleShareSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!recipientChefId || !contactName.trim() || !details.trim()) {
      setError('Recipient, contact name, and details are required')
      return
    }

    if (helpType === 'date_help' && !eventDate) {
      setError('Calendar date is required for date help requests')
      return
    }

    if (helpType === 'inquiry_help' && !inquiryId.trim() && !inquirySummary.trim()) {
      setError('Add an inquiry ID or inquiry summary for inquiry help requests')
      return
    }

    startTransition(async () => {
      try {
        await requestNetworkHelp({
          recipient_chef_id: recipientChefId,
          help_type: helpType,
          calendar_date: eventDate || null,
          inquiry_id: inquiryId.trim() || null,
          inquiry_summary: inquirySummary.trim() || null,
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim() || null,
          contact_email: contactEmail.trim() || null,
          location: location.trim() || null,
          details: details.trim(),
        })

        const connection = connections.find((friend) => friend.chef_id === recipientChefId)
        const newShare: NetworkContactShare = {
          id: `local-${Date.now()}`,
          status: 'open',
          direction: 'sent',
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim() || null,
          contact_email: contactEmail.trim() || null,
          event_date: eventDate || null,
          location: location.trim() || null,
          details: details.trim(),
          response_note: null,
          created_at: new Date().toISOString(),
          responded_at: null,
          participant: {
            chef_id: recipientChefId,
            display_name: connection?.display_name ?? null,
            business_name: connection?.business_name ?? 'Connection',
            profile_image_url: connection?.profile_image_url ?? null,
          },
        }
        setShares((prev) => [newShare, ...prev])
        resetForm()
      } catch (err: any) {
        setError(err.message || 'Failed to share contact')
      }
    })
  }

  function handleRespond(shareId: string, action: 'accepted' | 'passed') {
    const responseNote = (responseNotes[shareId] || '').trim()
    setError(null)
    startTransition(async () => {
      try {
        await respondToNetworkContactShare({
          share_id: shareId,
          action,
          response_note: responseNote || null,
        })
        setShares((prev) =>
          prev.map((share) =>
            share.id === shareId
              ? {
                  ...share,
                  status: action,
                  response_note: responseNote || null,
                  responded_at: new Date().toISOString(),
                }
              : share
          )
        )
      } catch (err: any) {
        setError(err.message || 'Failed to respond to share')
      }
    })
  }

  if (connections.length === 0) {
    return (
      <p className="text-sm text-stone-500 text-center py-6">
        Connect with at least one chef to share contacts directly.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleShareSubmit}
        className="rounded-lg border border-stone-700 p-4 bg-stone-900 space-y-3"
      >
        <p className="text-sm font-semibold text-stone-100">Share A Contact</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">Request Type</label>
            <select
              value={helpType}
              onChange={(event) =>
                setHelpType(event.target.value as 'date_help' | 'inquiry_help' | 'full_handover')
              }
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              disabled={isPending}
            >
              <option value="date_help">Date Help</option>
              <option value="inquiry_help">Inquiry Help</option>
              <option value="full_handover">Full Handover</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">Send To</label>
            <select
              value={recipientChefId}
              onChange={(event) => setRecipientChefId(event.target.value)}
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              disabled={isPending}
            >
              {connections.map((connection) => (
                <option key={connection.chef_id} value={connection.chef_id}>
                  {connection.display_name || connection.business_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">Contact Name</label>
            <input
              type="text"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="Client or lead name"
              disabled={isPending}
            />
          </div>
          {helpType === 'inquiry_help' && (
            <>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">
                  Inquiry ID
                </label>
                <input
                  type="text"
                  value={inquiryId}
                  onChange={(event) => setInquiryId(event.target.value)}
                  className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  placeholder="Optional UUID"
                  disabled={isPending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">
                  Inquiry Summary
                </label>
                <input
                  type="text"
                  value={inquirySummary}
                  onChange={(event) => setInquirySummary(event.target.value)}
                  className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  placeholder="Short summary if no inquiry ID"
                  disabled={isPending}
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">Phone</label>
            <input
              type="text"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="Optional"
              disabled={isPending}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="Optional"
              disabled={isPending}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">Event Date</label>
            <input
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              disabled={isPending}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">Location</label>
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="City / area"
              disabled={isPending}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1.5">Details</label>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={4}
            className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder={
              helpType === 'full_handover'
                ? 'Full handover notes: client expectations, menu scope, budget, constraints, and all context needed to take over.'
                : 'Event type, guest count, budget, dietary needs, timing, and what you need from this chef.'
            }
            disabled={isPending}
          />
        </div>
        <div className="flex justify-end">
          <Button size="sm" type="submit" disabled={isPending}>
            Share Contact
          </Button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-950 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-lg border border-stone-700 p-4 bg-stone-900">
          <h4 className="text-sm font-semibold text-stone-100">Incoming Shares</h4>
          {received.length === 0 ? (
            <p className="text-sm text-stone-500 mt-3">No incoming shares yet.</p>
          ) : (
            <div className="space-y-3 mt-3">
              {received.map((share) => (
                <ContactShareItem
                  key={share.id}
                  share={share}
                  responseNote={responseNotes[share.id] || ''}
                  onResponseNoteChange={(value) =>
                    setResponseNotes((prev) => ({ ...prev, [share.id]: value }))
                  }
                  onRespond={handleRespond}
                  isPending={isPending}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-stone-700 p-4 bg-stone-900">
          <h4 className="text-sm font-semibold text-stone-100">Outgoing Shares</h4>
          {sent.length === 0 ? (
            <p className="text-sm text-stone-500 mt-3">No outgoing shares yet.</p>
          ) : (
            <div className="space-y-3 mt-3">
              {sent.map((share) => (
                <ContactShareItem
                  key={share.id}
                  share={share}
                  responseNote=""
                  onResponseNoteChange={() => {}}
                  onRespond={(_shareId, _action) => {}}
                  isPending={false}
                  readonly
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function ContactShareItem({
  share,
  responseNote,
  onResponseNoteChange,
  onRespond,
  isPending,
  readonly = false,
}: {
  share: NetworkContactShare
  responseNote: string
  onResponseNoteChange: (value: string) => void
  onRespond: (shareId: string, action: 'accepted' | 'passed') => void
  isPending: boolean
  readonly?: boolean
}) {
  const partnerName = share.participant.display_name || share.participant.business_name

  return (
    <article className="rounded-lg border border-stone-700 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-100">{share.contact_name}</p>
          <p className="text-xs text-stone-500 mt-0.5">
            {share.direction === 'received' ? `From ${partnerName}` : `To ${partnerName}`}
          </p>
        </div>
        <StatusBadge status={share.status} />
      </div>

      <div className="mt-2 text-xs text-stone-400 space-y-1">
        {share.contact_email && <p>Email: {share.contact_email}</p>}
        {share.contact_phone && <p>Phone: {share.contact_phone}</p>}
        {share.location && <p>Location: {share.location}</p>}
        {share.event_date && <p>Event Date: {share.event_date}</p>}
      </div>

      <p className="mt-2 text-sm text-stone-300 whitespace-pre-wrap">{share.details}</p>

      {share.response_note && (
        <p className="mt-2 text-xs text-stone-500">Response note: {share.response_note}</p>
      )}

      {!readonly && share.status === 'open' && (
        <div className="mt-3 space-y-2">
          <textarea
            value={responseNote}
            onChange={(event) => onResponseNoteChange(event.target.value)}
            rows={2}
            className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="Optional response note"
            disabled={isPending}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onRespond(share.id, 'accepted')} disabled={isPending}>
              I Can Take It
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRespond(share.id, 'passed')}
              disabled={isPending}
            >
              I Can&apos;t Take It
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}

function StatusBadge({ status }: { status: 'open' | 'accepted' | 'passed' }) {
  if (status === 'accepted') {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-700">
        Accepted
      </span>
    )
  }
  if (status === 'passed') {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-950 text-amber-700">
        Passed
      </span>
    )
  }
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-950 text-blue-700">
      Open
    </span>
  )
}
