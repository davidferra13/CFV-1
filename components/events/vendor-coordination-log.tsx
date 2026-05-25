'use client'

import { useState, useTransition, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VendorContactEntry } from './vendor-contact-entry'
import {
  logVendorContact,
  getEventVendorCoordination,
  getVendorsForEventPicker,
} from '@/lib/vendors/vendor-coordination-actions'
import type { VendorCoordinationEntry } from '@/lib/vendors/vendor-coordination-actions'

type Props = {
  eventId: string
  initialEntries?: VendorCoordinationEntry[]
}

const CHANNELS = [
  { value: 'call', label: 'Call' },
  { value: 'text', label: 'Text' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'in_person', label: 'In Person' },
  { value: 'other', label: 'Other' },
]

const STATUSES = [
  { value: 'contacted', label: 'Contacted' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'issue', label: 'Issue' },
]

export function VendorCoordinationLog({ eventId, initialEntries }: Props) {
  const [entries, setEntries] = useState<VendorCoordinationEntry[]>(initialEntries ?? [])
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [vendors, setVendors] = useState<
    Array<{ id: string; name: string; category: string | null }>
  >([])

  // Form state
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [vendorName, setVendorName] = useState('')
  const [channel, setChannel] = useState('call')
  const [status, setStatus] = useState('contacted')
  const [notes, setNotes] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!initialEntries) {
      getEventVendorCoordination(eventId)
        .then(setEntries)
        .catch(() => {})
    }
    getVendorsForEventPicker()
      .then(setVendors)
      .catch(() => {})
  }, [eventId, initialEntries])

  function resetForm() {
    setVendorId(null)
    setVendorName('')
    setChannel('call')
    setStatus('contacted')
    setNotes('')
    setFollowUpDate('')
    setFormError(null)
  }

  function handleSubmit() {
    if (!vendorName.trim() || !notes.trim()) {
      setFormError('Vendor name and notes are required.')
      return
    }

    startTransition(async () => {
      const result = await logVendorContact({
        eventId,
        vendorId,
        vendorName: vendorName.trim(),
        channel: channel as any,
        status: status as any,
        notes: notes.trim(),
        followUpDate: followUpDate || null,
      })

      if (result.success) {
        // Refresh entries
        const updated = await getEventVendorCoordination(eventId).catch(() => entries)
        setEntries(updated)
        resetForm()
        setShowForm(false)
      } else {
        setFormError(result.error || 'Failed to save vendor contact')
      }
    })
  }

  // Count by status for summary badges
  const statusCounts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1
    return acc
  }, {})

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Vendor Coordination</CardTitle>
          <div className="flex items-center gap-2">
            {statusCounts.confirmed ? (
              <span className="inline-flex items-center rounded-full bg-emerald-950 px-2 py-0.5 text-xs font-medium text-emerald-400">
                {statusCounts.confirmed} confirmed
              </span>
            ) : null}
            {statusCounts.waiting ? (
              <span className="inline-flex items-center rounded-full bg-amber-950 px-2 py-0.5 text-xs font-medium text-amber-400">
                {statusCounts.waiting} waiting
              </span>
            ) : null}
            {statusCounts.issue ? (
              <span className="inline-flex items-center rounded-full bg-red-950 px-2 py-0.5 text-xs font-medium text-red-400">
                {statusCounts.issue} issue
              </span>
            ) : null}
            <Button size="sm" variant="secondary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ Vendor Contact'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="rounded-lg border border-stone-700 bg-stone-800/80 p-4 space-y-3">
            {formError && <p className="text-sm text-red-400">{formError}</p>}

            {/* Vendor picker */}
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Vendor *</label>
              <div className="flex gap-2">
                <select
                  value={vendorId ?? ''}
                  onChange={(e) => {
                    const id = e.target.value || null
                    setVendorId(id)
                    if (id) {
                      const v = vendors.find((v) => v.id === id)
                      if (v) setVendorName(v.name)
                    }
                  }}
                  className="flex-1 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Select or type below</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                      {v.category ? ` (${v.category})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => {
                  setVendorName(e.target.value)
                  setVendorId(null)
                }}
                placeholder="Or type vendor name"
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Channel + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
                >
                  {CHANNELS.map((ch) => (
                    <option key={ch.value} value={ch.value}>
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">Notes *</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What was discussed or confirmed"
                rows={2}
                maxLength={2000}
                className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none resize-none"
              />
            </div>

            {/* Follow-up date */}
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Follow-up date
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <Button onClick={handleSubmit} disabled={isPending} className="w-full">
              {isPending ? 'Saving...' : 'Log Vendor Contact'}
            </Button>
          </div>
        )}

        {entries.length === 0 && !showForm ? (
          <p className="text-sm text-stone-500 text-center py-4">
            No vendor contacts logged for this event yet.
          </p>
        ) : (
          entries.map((entry) => <VendorContactEntry key={entry.id} entry={entry} />)
        )}
      </CardContent>
    </Card>
  )
}
