'use client'

import { useState, useTransition, useEffect } from 'react'
import type { EventDetailTab } from '@/components/events/event-detail-mobile-nav'
import { EventDetailSection } from '@/components/events/event-detail-mobile-nav'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import {
  createTicketType,
  updateTicketType,
  deleteTicketType,
  createCompTicket,
  createWalkInTicket,
  refundTicket,
  toggleEventTicketing,
  updateTicketAttendance,
} from '@/lib/tickets/actions'
import { exportGuestListCSV } from '@/lib/tickets/export-actions'
import { resendTicketConfirmation } from '@/lib/tickets/resend-confirmation-actions'
import { notifyPastGuests, getPastGuestCount } from '@/lib/tickets/past-guest-notify-actions'
import { sendThankYouEmails } from '@/lib/tickets/thank-you-actions'
import type { EventTicketType, EventTicket, EventTicketSummary } from '@/lib/tickets/types'
import { TicketWaitlistPanel } from '@/components/tickets/ticket-waitlist-panel'
import { DistributionPanel } from '@/components/tickets/distribution-panel'
import { RevenueSplitPanel } from '@/components/tickets/revenue-split-panel'
import { CoHostDashboard } from '@/components/tickets/cohost-dashboard'
import { WeatherAlertPanel } from '@/components/events/weather-alert-panel'
import { DayOfChecklistPanel } from '@/components/events/day-of-checklist-panel'
import { PrepTimelinePanel } from '@/components/events/prep-timeline-panel'

type Props = {
  activeTab: EventDetailTab
  eventId: string
  eventStatus: string
  eventDate: string | null
  eventLatitude?: number | null
  eventLongitude?: number | null
  ticketTypes: EventTicketType[]
  tickets: EventTicket[]
  summary: EventTicketSummary | null
  shareToken: string | null
  hasCollaborators?: boolean
}

export function EventDetailTicketsTab({
  activeTab,
  eventId,
  eventStatus,
  eventDate,
  eventLatitude,
  eventLongitude,
  ticketTypes,
  tickets,
  summary,
  shareToken,
  hasCollaborators,
}: Props) {
  const [showCreateType, setShowCreateType] = useState(false)
  const [showAddGuest, setShowAddGuest] = useState<'comp' | 'walkin' | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Create ticket type form state
  const [typeName, setTypeName] = useState('')
  const [typePrice, setTypePrice] = useState('')
  const [typeCapacity, setTypeCapacity] = useState('')
  const [typeDescription, setTypeDescription] = useState('')

  // Add guest form state
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestQty, setGuestQty] = useState(1)
  const [guestNotes, setGuestNotes] = useState('')
  const [walkInPaid, setWalkInPaid] = useState('')

  const [pastGuestCount, setPastGuestCount] = useState<number | null>(null)
  const [notifySent, setNotifySent] = useState<number | null>(null)
  const [thankYouSent, setThankYouSent] = useState<number | null>(null)

  useEffect(() => {
    getPastGuestCount(eventId)
      .then(setPastGuestCount)
      .catch(() => {})
  }, [eventId])

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const publicUrl = shareToken ? `${appUrl}/e/${shareToken}` : null

  const totalSold = summary?.tickets_sold ?? 0
  const totalRevenue = summary?.revenue_cents ?? 0
  const totalCapacity = ticketTypes.reduce((s, t) => s + (t.capacity ?? 0), 0)
  const expectedArrivals = tickets
    .filter((ticket) => ticket.payment_status === 'paid')
    .reduce((sum, ticket) => sum + ticket.quantity, 0)
  const checkedIn = tickets
    .filter((ticket) => ticket.payment_status === 'paid' && ticket.attended === true)
    .reduce((sum, ticket) => sum + ticket.quantity, 0)
  const missingArrivals = Math.max(0, expectedArrivals - checkedIn)

  function resetTypeForm() {
    setTypeName('')
    setTypePrice('')
    setTypeCapacity('')
    setTypeDescription('')
    setShowCreateType(false)
  }

  function resetGuestForm() {
    setGuestName('')
    setGuestEmail('')
    setGuestQty(1)
    setGuestNotes('')
    setWalkInPaid('')
    setShowAddGuest(null)
  }

  function handleCreateType() {
    if (!typeName.trim()) return
    const priceCents = Math.round(parseFloat(typePrice || '0') * 100)
    if (isNaN(priceCents) || priceCents < 0) return

    setError(null)
    startTransition(async () => {
      try {
        await createTicketType({
          eventId,
          name: typeName.trim(),
          description: typeDescription.trim() || null,
          priceCents,
          capacity: typeCapacity ? parseInt(typeCapacity) : null,
        })
        resetTypeForm()
      } catch (err: any) {
        setError(err.message || 'Failed to create ticket type')
      }
    })
  }

  function handleToggleType(type: EventTicketType) {
    setError(null)
    startTransition(async () => {
      try {
        await updateTicketType({
          id: type.id,
          eventId,
          isActive: !type.is_active,
        })
      } catch (err: any) {
        setError(err.message || 'Failed to update ticket type')
      }
    })
  }

  function handleDeleteType(typeId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await deleteTicketType({ id: typeId, eventId })
      } catch (err: any) {
        setError(err.message || 'Failed to delete ticket type')
      }
    })
  }

  function handleAddGuest() {
    if (!guestName.trim()) return
    setError(null)

    startTransition(async () => {
      try {
        if (showAddGuest === 'comp') {
          await createCompTicket({
            eventId,
            buyerName: guestName.trim(),
            buyerEmail: guestEmail.trim() || `comp-${Date.now()}@cheflowhq.com`,
            quantity: guestQty,
            notes: guestNotes.trim() || undefined,
          })
        } else if (showAddGuest === 'walkin') {
          const paidCents = Math.round(parseFloat(walkInPaid || '0') * 100)
          await createWalkInTicket({
            eventId,
            buyerName: guestName.trim(),
            buyerEmail: guestEmail.trim() || undefined,
            quantity: guestQty,
            paidCents,
            notes: guestNotes.trim() || undefined,
          })
        }
        resetGuestForm()
      } catch (err: any) {
        setError(err.message || 'Failed to add guest')
      }
    })
  }

  function handleRefund(ticketId: string) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await refundTicket({ ticketId, eventId })
        if (!result.success) {
          setError(result.error || 'Refund failed')
        }
      } catch (err: any) {
        setError(err.message || 'Refund failed')
      }
    })
  }

  function handleAttendance(ticketId: string, attended: boolean) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await updateTicketAttendance({ eventId, ticketId, attended })
        if (!result.success) {
          setError(result.error || 'Failed to update check-in')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to update check-in')
      }
    })
  }

  function handleToggleTicketing(enabled: boolean) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await toggleEventTicketing({ eventId, enabled })
        if (!result.success) {
          setError(result.error || 'Failed to toggle ticketing')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to toggle ticketing')
      }
    })
  }

  function handleExportCSV() {
    setError(null)
    startTransition(async () => {
      try {
        const { csv, filename } = await exportGuestListCSV(eventId)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      } catch (err: any) {
        setError(err.message || 'Failed to export CSV')
      }
    })
  }

  function handleResendConfirmation(ticketId: string) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await resendTicketConfirmation({ eventId, ticketId })
        if (!result.success) {
          setError(result.error || 'Failed to resend confirmation')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to resend confirmation')
      }
    })
  }

  function handleNotifyPastGuests() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await notifyPastGuests({ eventId })
        if (!result.success) {
          setError(result.error || 'Failed to notify past guests')
        } else {
          setNotifySent(result.sent)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to notify past guests')
      }
    })
  }

  function handleSendThankYou() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await sendThankYouEmails({ eventId })
        if (!result.success) {
          setError(result.error || 'Failed to send thank-you emails')
        } else {
          setThankYouSent(result.sent)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to send thank-you emails')
      }
    })
  }

  function handleBulkMarkNoShow() {
    setError(null)
    const unchecked = tickets.filter((t) => t.payment_status === 'paid' && t.attended !== true)
    if (unchecked.length === 0) return
    startTransition(async () => {
      try {
        for (const t of unchecked) {
          await updateTicketAttendance({ eventId, ticketId: t.id, attended: false })
        }
      } catch (err: any) {
        setError(err.message || 'Failed to mark no-shows')
      }
    })
  }

  return (
    <EventDetailSection tab="tickets" activeTab={activeTab}>
      <div className="space-y-6">
        {/* Summary Header */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Ticket Sales</h2>
            <div className="flex items-center gap-2">
              {publicUrl && (
                <Button
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText(publicUrl)}
                  className="text-xs"
                >
                  Copy Link
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => handleToggleTicketing(ticketTypes.length > 0 && !summary)}
                disabled={isPending}
                className="text-xs"
              >
                {summary ? 'Disable Sales' : 'Enable Sales'}
              </Button>
            </div>
          </div>

          {/* Sales metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-stone-400">Sold</p>
              <p className="text-2xl font-bold text-white">
                {totalSold}
                {totalCapacity > 0 && (
                  <span className="text-sm font-normal text-stone-500">/{totalCapacity}</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Revenue</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Avg Price</p>
              <p className="text-2xl font-bold text-white">
                {totalSold > 0 ? formatCurrency(Math.round(totalRevenue / totalSold)) : '-'}
              </p>
            </div>
          </div>

          {/* Capacity bar */}
          {totalCapacity > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-stone-400 mb-1">
                <span>{totalSold} sold</span>
                <span>{totalCapacity - totalSold} remaining</span>
              </div>
              <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalSold / totalCapacity) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </Card>

        {error && (
          <div className="rounded-lg bg-red-900/50 border border-red-700 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <Card className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-white">Arrival Check-In</h3>
              <p className="mt-1 text-sm text-stone-400">
                Name-list check-in updates attendance for wrap-up and no-show analysis.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-right">
              <div>
                <p className="text-xs text-stone-500">Arrived</p>
                <p className="text-xl font-semibold text-emerald-400">{checkedIn}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Expected</p>
                <p className="text-xl font-semibold text-white">{expectedArrivals}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Missing</p>
                <p className="text-xl font-semibold text-amber-300">{missingArrivals}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Dietary & Allergy Summary */}
        {tickets.length > 0 &&
          (() => {
            const paidTickets = tickets.filter((t) => t.payment_status === 'paid')
            const dietaryMap = new Map<string, number>()
            const allergyMap = new Map<string, number>()
            for (const t of paidTickets) {
              for (const d of t.dietary_restrictions || []) {
                dietaryMap.set(d, (dietaryMap.get(d) || 0) + t.quantity)
              }
              for (const a of t.allergies || []) {
                allergyMap.set(a, (allergyMap.get(a) || 0) + t.quantity)
              }
            }
            if (dietaryMap.size === 0 && allergyMap.size === 0) return null
            return (
              <Card className="p-5">
                <h3 className="font-semibold text-white mb-3">Guest Dietary Needs</h3>
                <div className="grid grid-cols-2 gap-6">
                  {dietaryMap.size > 0 && (
                    <div>
                      <p className="text-xs text-stone-400 mb-2 uppercase tracking-wide">
                        Restrictions
                      </p>
                      <div className="space-y-1.5">
                        {[...dietaryMap.entries()]
                          .sort((a, b) => b[1] - a[1])
                          .map(([restriction, count]) => (
                            <div key={restriction} className="flex items-center justify-between">
                              <span className="text-sm text-stone-200">{restriction}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900/40 text-orange-300">
                                {count}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  {allergyMap.size > 0 && (
                    <div>
                      <p className="text-xs text-stone-400 mb-2 uppercase tracking-wide">
                        Allergies
                      </p>
                      <div className="space-y-1.5">
                        {[...allergyMap.entries()]
                          .sort((a, b) => b[1] - a[1])
                          .map(([allergy, count]) => (
                            <div key={allergy} className="flex items-center justify-between">
                              <span className="text-sm text-stone-200">{allergy}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-300">
                                {count}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })()}

        {/* Post-Event Thank You */}
        {eventStatus === 'completed' && tickets.length > 0 && (
          <Card className="p-4 border-emerald-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-300">Thank Your Guests</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {thankYouSent !== null
                    ? `Sent to ${thankYouSent} guest${thankYouSent !== 1 ? 's' : ''}`
                    : 'Send a personal thank-you email to all attendees'}
                </p>
              </div>
              <Button
                variant="primary"
                onClick={handleSendThankYou}
                disabled={isPending || thankYouSent !== null}
                className="text-xs shrink-0"
              >
                {isPending ? 'Sending...' : thankYouSent !== null ? 'Sent' : 'Send Thank You'}
              </Button>
            </div>
          </Card>
        )}

        {/* Post-Event No-Show Summary */}
        {eventStatus === 'completed' && missingArrivals > 0 && (
          <Card className="p-4 border-amber-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-300">
                  {missingArrivals} guest{missingArrivals > 1 ? 's' : ''} never checked in
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Mark all unchecked guests as no-shows for your records.
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={handleBulkMarkNoShow}
                disabled={isPending}
                className="text-xs text-amber-300 hover:text-amber-200"
              >
                {isPending ? 'Marking...' : 'Mark All No-Show'}
              </Button>
            </div>
          </Card>
        )}

        {/* Ticket Types */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Ticket Types</h3>
            <Button variant="primary" onClick={() => setShowCreateType(true)} disabled={isPending}>
              Add Type
            </Button>
          </div>

          {ticketTypes.length === 0 && !showCreateType && (
            <p className="text-sm text-stone-500">
              No ticket types yet. Add one to start selling tickets.
            </p>
          )}

          <div className="space-y-3">
            {ticketTypes.map((tt) => (
              <div
                key={tt.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  tt.is_active
                    ? 'border-stone-600 bg-stone-800/50'
                    : 'border-stone-800 bg-stone-900/30 opacity-60'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{tt.name}</span>
                    {!tt.is_active && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-stone-700 text-stone-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  {tt.description && (
                    <p className="text-xs text-stone-400 mt-0.5 truncate">{tt.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                    <span>{formatCurrency(tt.price_cents)}</span>
                    {tt.capacity !== null && (
                      <span>
                        {tt.sold_count}/{tt.capacity} sold
                      </span>
                    )}
                    {tt.capacity === null && <span>{tt.sold_count} sold</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => handleToggleType(tt)}
                    disabled={isPending}
                    className="text-xs"
                  >
                    {tt.is_active ? 'Pause' : 'Resume'}
                  </Button>
                  {tt.sold_count === 0 && (
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteType(tt.id)}
                      disabled={isPending}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Create Type Form */}
          {showCreateType && (
            <div className="mt-4 rounded-lg border border-stone-600 bg-stone-800/50 p-4 space-y-3">
              <h4 className="text-sm font-medium text-white">New Ticket Type</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Name *</label>
                  <input
                    type="text"
                    value={typeName}
                    onChange={(e) => setTypeName(e.target.value)}
                    placeholder="General Admission"
                    className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={typePrice}
                    onChange={(e) => setTypePrice(e.target.value)}
                    placeholder="75.00"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Capacity (optional)</label>
                  <input
                    type="number"
                    value={typeCapacity}
                    onChange={(e) => setTypeCapacity(e.target.value)}
                    placeholder="50"
                    min="1"
                    className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={typeDescription}
                    onChange={(e) => setTypeDescription(e.target.value)}
                    placeholder="Includes dinner and drinks"
                    className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={resetTypeForm}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateType}
                  disabled={isPending || !typeName.trim()}
                >
                  {isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Guest List / Ticket Holders */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Ticket Holders ({tickets.length})</h3>
            <div className="flex items-center gap-2">
              {tickets.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={handleExportCSV}
                  disabled={isPending}
                  className="text-xs"
                >
                  Export CSV
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => setShowAddGuest('comp')}
                disabled={isPending}
                className="text-xs"
              >
                + Comp
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowAddGuest('walkin')}
                disabled={isPending}
                className="text-xs"
              >
                + Walk-in
              </Button>
            </div>
          </div>

          {/* Add guest form */}
          {showAddGuest && (
            <div className="mb-4 rounded-lg border border-stone-600 bg-stone-800/50 p-4 space-y-3">
              <h4 className="text-sm font-medium text-white">
                {showAddGuest === 'comp' ? 'Add Comp Ticket' : 'Add Walk-in'}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Name *</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Guest name"
                    className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="guest@email.com"
                    className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Qty</label>
                  <input
                    type="number"
                    value={guestQty}
                    onChange={(e) => setGuestQty(parseInt(e.target.value) || 1)}
                    min="1"
                    max="20"
                    placeholder="1"
                    title="Quantity"
                    className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
                  />
                </div>
                {showAddGuest === 'walkin' && (
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">Paid ($)</label>
                    <input
                      type="number"
                      value={walkInPaid}
                      onChange={(e) => setWalkInPaid(e.target.value)}
                      placeholder="75.00"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={guestNotes}
                  onChange={(e) => setGuestNotes(e.target.value)}
                  placeholder="VIP, dietary needs, etc."
                  className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={resetGuestForm}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAddGuest}
                  disabled={isPending || !guestName.trim()}
                >
                  {isPending ? 'Adding...' : showAddGuest === 'comp' ? 'Add Comp' : 'Add Walk-in'}
                </Button>
              </div>
            </div>
          )}

          {tickets.length === 0 ? (
            <p className="text-sm text-stone-500">No tickets sold yet.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-800/30 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">{t.buyer_name}</span>
                      <span className="text-xs text-stone-500">{t.buyer_email}</span>
                      {t.source === 'comp' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300">
                          Comp
                        </span>
                      )}
                      {t.source === 'walkin' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300">
                          Walk-in
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-stone-400">
                      {t.ticket_type?.name && <span>{t.ticket_type.name}</span>}
                      <span>x{t.quantity}</span>
                      <span>{formatCurrency(t.total_cents)}</span>
                      <span
                        className={
                          t.payment_status === 'paid'
                            ? 'text-emerald-400'
                            : t.payment_status === 'refunded'
                              ? 'text-red-400'
                              : 'text-amber-400'
                        }
                      >
                        {t.payment_status}
                      </span>
                      {t.attended === true && <span className="text-emerald-300">checked in</span>}
                      {t.dietary_restrictions?.length > 0 && (
                        <span className="text-orange-300">
                          Diet: {t.dietary_restrictions.join(', ')}
                        </span>
                      )}
                      {t.allergies?.length > 0 && (
                        <span className="text-red-300">Allergies: {t.allergies.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  {t.payment_status === 'paid' && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant={t.attended ? 'secondary' : 'primary'}
                        onClick={() => handleAttendance(t.id, !t.attended)}
                        disabled={isPending}
                        className="text-xs"
                      >
                        {t.attended ? 'Undo check-in' : 'Check in'}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleResendConfirmation(t.id)}
                        disabled={isPending}
                        className="text-xs"
                      >
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleRefund(t.id)}
                        disabled={isPending}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Refund
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Public Link */}
        {publicUrl && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Public Ticket Page</p>
                <p className="text-xs text-stone-400 mt-0.5 break-all">{publicUrl}</p>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl)
                }}
                className="text-xs shrink-0"
              >
                Copy
              </Button>
            </div>
          </Card>
        )}
        {/* Past Guest Notifications */}
        {pastGuestCount !== null && pastGuestCount > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Notify Past Guests</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {notifySent !== null
                    ? `Sent to ${notifySent} guest${notifySent !== 1 ? 's' : ''}`
                    : `${pastGuestCount} past guest${pastGuestCount !== 1 ? 's' : ''} from your previous events`}
                </p>
              </div>
              <Button
                variant="primary"
                onClick={handleNotifyPastGuests}
                disabled={isPending || notifySent !== null}
                className="text-xs shrink-0"
              >
                {isPending ? 'Sending...' : notifySent !== null ? 'Sent' : 'Notify All'}
              </Button>
            </div>
          </Card>
        )}

        {/* Co-Host Dashboard - shared metrics for collaborators */}
        {hasCollaborators && <CoHostDashboard eventId={eventId} />}

        {/* Revenue Split - for co-hosted events */}
        {hasCollaborators && <RevenueSplitPanel eventId={eventId} />}

        {/* Weather Alert - outdoor event forecast */}
        <WeatherAlertPanel
          eventDate={eventDate}
          location={null}
          latitude={eventLatitude}
          longitude={eventLongitude}
        />

        {/* Day-of Checklist */}
        <DayOfChecklistPanel eventId={eventId} />

        {/* Prep Timeline */}
        <PrepTimelinePanel eventId={eventId} />

        {/* Distribution */}
        <DistributionPanel eventId={eventId} shareToken={shareToken} />

        {/* Waitlist & Access Control */}
        <TicketWaitlistPanel eventId={eventId} />
      </div>
    </EventDetailSection>
  )
}
