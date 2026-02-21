// Natural Language Event Form
// Chef describes an event in free text → AI parses → preview shown for confirmation.
// AI policy compliant: parsed draft is shown for chef review before any data is saved.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { parseEventFromText, type ParsedEventDraft } from '@/lib/events/parse-event-from-text'
import { createEvent, type CreateEventInput } from '@/lib/events/actions'

type Client = {
  id: string
  full_name: string
  email: string
}

type Props = {
  clients: Client[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number | null): string {
  if (cents === null) return ''
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function DraftField({
  label,
  value,
  uncertain,
}: {
  label: string
  value: string | null
  uncertain?: boolean
}) {
  if (value === null) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-stone-400 uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-medium ${uncertain ? 'text-amber-700' : 'text-stone-800'}`}>
        {value}
        {uncertain && <span className="ml-1 text-amber-500 text-xs">(uncertain)</span>}
      </span>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EventNLForm({ clients }: Props) {
  const router = useRouter()
  const [rawText, setRawText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [draft, setDraft] = useState<ParsedEventDraft | null>(null)

  // Editable fields after parse
  const [clientId, setClientId] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [serveTime, setServeTime] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [occasion, setOccasion] = useState('')
  const [locationDescription, setLocationDescription] = useState('')
  const [notes, setNotes] = useState('')

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // ── Parse ──────────────────────────────────────────────────────────────────

  async function handleParse() {
    setParsing(true)
    setParseError(null)
    setDraft(null)

    const result = await parseEventFromText(rawText)
    setParsing(false)

    if (result.error || !result.draft) {
      setParseError(result.error ?? 'Parsing failed')
      return
    }

    const d = result.draft
    setDraft(d)

    // Pre-fill editable fields from draft
    setEventDate(d.event_date ?? '')
    setServeTime(d.serve_time ?? '')
    setGuestCount(d.guest_count?.toString() ?? '')
    setOccasion(d.occasion ?? '')
    setLocationDescription(d.location_description ?? '')
    setNotes([d.dietary_notes, d.notes].filter(Boolean).join('\n'))

    // Try to auto-match client by name
    if (d.client_name) {
      const lower = d.client_name.toLowerCase()
      const match = clients.find((c) => c.full_name.toLowerCase().includes(lower))
      if (match) setClientId(match.id)
    }
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async function handleCreate() {
    setCreateError(null)

    if (!clientId) {
      setCreateError('Please select a client')
      return
    }
    if (!eventDate) {
      setCreateError('Event date is required')
      return
    }
    if (!serveTime) {
      setCreateError('Serve time is required')
      return
    }
    if (!guestCount || parseInt(guestCount) <= 0) {
      setCreateError('Guest count is required')
      return
    }

    setCreating(true)
    try {
      const input: CreateEventInput = {
        client_id: clientId,
        event_date: eventDate,
        serve_time: serveTime,
        guest_count: parseInt(guestCount),
        location_address: locationDescription || 'TBD',
        location_city: 'TBD',
        location_zip: '00000',
        occasion: occasion || undefined,
        special_requests: notes || undefined,
        quoted_price_cents: draft?.quoted_price_cents ?? undefined,
        deposit_amount_cents: draft?.deposit_amount_cents ?? undefined,
      }

      const result = await createEvent(input)
      if (result.success && result.event) {
        router.push(`/events/${result.event.id}`)
      } else {
        throw new Error('Failed to create event')
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create event')
      setCreating(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Input phase */}
      <Card className="p-6 space-y-4">
        <Textarea
          label="Describe the event"
          placeholder={`e.g. "Private dinner for the Hendersons — 8 guests, Saturday March 28th at 7pm, their home in Pacific Heights. Quoting $2,800 with a $500 deposit."`}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={5}
          helperText="Write naturally — include the client name, date, time, guests, location, and pricing."
        />

        {parseError && (
          <Alert variant="error" title="Parsing failed">
            {parseError}
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={handleParse}
            loading={parsing}
            disabled={parsing || !rawText.trim()}
          >
            {parsing ? 'Parsing...' : 'Parse Event →'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </Card>

      {/* Draft preview + editable fields */}
      {draft && (
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-800">Parsed Draft</h2>
            {draft.confidence_notes && (
              <span className="text-xs text-stone-400">{draft.confidence_notes}</span>
            )}
          </div>

          {/* Read-only summary row */}
          {(draft.quoted_price_cents !== null || draft.deposit_amount_cents !== null) && (
            <div className="flex flex-wrap gap-6 p-3 bg-stone-50 rounded-lg">
              <DraftField
                label="Quoted Price"
                value={formatCents(draft.quoted_price_cents)}
                uncertain={draft.uncertain_fields.includes('quoted_price_cents')}
              />
              <DraftField
                label="Deposit"
                value={formatCents(draft.deposit_amount_cents)}
                uncertain={draft.uncertain_fields.includes('deposit_amount_cents')}
              />
              {draft.client_name && (
                <DraftField
                  label="Client (detected)"
                  value={draft.client_name}
                  uncertain={draft.uncertain_fields.includes('client_name')}
                />
              )}
            </div>
          )}

          <div className="space-y-4">
            {/* Client selector — required, pre-filtered by parsed name */}
            <Select
              label="Client"
              required
              options={clients.map((c) => ({
                value: c.id,
                label: `${c.full_name} (${c.email})`,
              }))}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              helperText={
                draft.client_name
                  ? `Detected: "${draft.client_name}"`
                  : 'Select the client for this event'
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Event Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Serve Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={serveTime}
                  onChange={(e) => setServeTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Guest Count <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Occasion</label>
                <input
                  type="text"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Location / Address
              </label>
              <input
                type="text"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
                placeholder="Full address (you can update this on the event page)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Notes / Dietary
              </label>
              <textarea
                rows={3}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {createError && (
            <Alert variant="error" title="Error">
              {createError}
            </Alert>
          )}

          <p className="text-xs text-stone-400">
            Review the fields above. Pricing and full address can be updated on the event page.
          </p>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={handleCreate}
              loading={creating}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Event'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDraft(null)
                setRawText('')
              }}
            >
              Start over
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
