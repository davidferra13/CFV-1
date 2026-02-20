// CallForm — schedule a new call or edit an existing one

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCall, updateCall, type CreateCallInput, type ScheduledCall, type CallType } from '@/lib/calls/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  SelectRoot as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CALL_TYPE_OPTIONS: { value: CallType; label: string }[] = [
  { value: 'discovery',            label: 'Discovery' },
  { value: 'follow_up',            label: 'Follow-up' },
  { value: 'proposal_walkthrough', label: 'Proposal Walkthrough' },
  { value: 'pre_event_logistics',  label: 'Pre-Event Logistics' },
  { value: 'vendor_supplier',      label: 'Vendor / Supplier' },
  { value: 'partner',              label: 'Partner' },
  { value: 'general',              label: 'General' },
]

const DURATION_OPTIONS = [
  { value: '15',  label: '15 min' },
  { value: '30',  label: '30 min' },
  { value: '45',  label: '45 min' },
  { value: '60',  label: '1 hour' },
  { value: '90',  label: '1.5 hours' },
  { value: '120', label: '2 hours' },
]

type Props = {
  // When editing, pass the existing call
  existing?: ScheduledCall
  // Pre-populate from context
  defaultClientId?: string
  defaultClientName?: string
  defaultInquiryId?: string
  defaultEventId?: string
}

/**
 * Converts a local datetime-local input value to a UTC ISO string.
 * The browser datetime-local value is in local time, not UTC.
 */
function localToIso(value: string): string {
  return new Date(value).toISOString()
}

/**
 * Converts a UTC ISO string to the format expected by datetime-local input.
 */
function isoToLocal(iso: string): string {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

export function CallForm({ existing, defaultClientId, defaultClientName, defaultInquiryId, defaultEventId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [callType, setCallType] = useState<CallType>(existing?.call_type ?? 'general')
  const [scheduledAt, setScheduledAt] = useState(
    existing ? isoToLocal(existing.scheduled_at) : ''
  )
  const [duration, setDuration] = useState(String(existing?.duration_minutes ?? 30))
  const [title, setTitle] = useState(existing?.title ?? '')
  const [contactName, setContactName] = useState(existing?.contact_name ?? defaultClientName ?? '')
  const [contactPhone, setContactPhone] = useState(existing?.contact_phone ?? '')
  const [contactCompany, setContactCompany] = useState(existing?.contact_company ?? '')
  const [prepNotes, setPrepNotes] = useState(existing?.prep_notes ?? '')
  const [notifyClient, setNotifyClient] = useState(existing?.notify_client ?? false)
  const [clientId] = useState(existing?.client_id ?? defaultClientId ?? null)
  const [inquiryId] = useState(existing?.inquiry_id ?? defaultInquiryId ?? null)
  const [eventId] = useState(existing?.event_id ?? defaultEventId ?? null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!scheduledAt) {
      setError('Please set a date and time for the call.')
      return
    }

    startTransition(async () => {
      try {
        if (existing) {
          await updateCall(existing.id, {
            call_type: callType,
            scheduled_at: localToIso(scheduledAt),
            duration_minutes: parseInt(duration),
            title: title.trim() || null,
            contact_name: contactName.trim() || null,
            contact_phone: contactPhone.trim() || null,
            contact_company: contactCompany.trim() || null,
            prep_notes: prepNotes.trim() || null,
            notify_client: notifyClient,
          })
          router.push(`/calls/${existing.id}`)
        } else {
          const input: CreateCallInput = {
            call_type: callType,
            scheduled_at: localToIso(scheduledAt),
            duration_minutes: parseInt(duration),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            title: title.trim() || null,
            client_id: clientId,
            contact_name: contactName.trim() || null,
            contact_phone: contactPhone.trim() || null,
            contact_company: contactCompany.trim() || null,
            inquiry_id: inquiryId,
            event_id: eventId,
            prep_notes: prepNotes.trim() || null,
            notify_client: notifyClient,
          }
          const result = await createCall(input)
          router.push(`/calls/${result.call.id}`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Call type */}
      <div className="space-y-1.5">
        <Label htmlFor="call_type">Call type</Label>
        <Select value={callType} onValueChange={v => setCallType(v as CallType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CALL_TYPE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date & time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="scheduled_at">Date & time</Label>
          <Input
            id="scheduled_at"
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration">Duration</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Optional title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Title <span className="text-gray-400 font-normal">(optional)</span></Label>
        <Input
          id="title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Initial consultation with the Hendersons"
          maxLength={200}
        />
      </div>

      {/* Contact info */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact_name">Name</Label>
            <Input
              id="contact_name"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              placeholder="Full name"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_phone">Phone</Label>
            <Input
              id="contact_phone"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              type="tel"
              maxLength={50}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact_company">Company / occasion <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input
            id="contact_company"
            value={contactCompany}
            onChange={e => setContactCompany(e.target.value)}
            placeholder="e.g. Whole Foods, The Hendersons' wedding"
            maxLength={200}
          />
        </div>
      </div>

      {/* Prep notes */}
      <div className="space-y-1.5">
        <Label htmlFor="prep_notes">Prep notes <span className="text-gray-400 font-normal">(optional)</span></Label>
        <Textarea
          id="prep_notes"
          value={prepNotes}
          onChange={e => setPrepNotes(e.target.value)}
          placeholder="Anything you want to remember or prepare before this call…"
          rows={3}
          maxLength={5000}
        />
      </div>

      {/* Notify client toggle — only if this is a client call */}
      {clientId && (
        <div className="flex items-center gap-3">
          <Switch
            id="notify_client"
            checked={notifyClient}
            onCheckedChange={setNotifyClient}
          />
          <Label htmlFor="notify_client" className="cursor-pointer">
            Send client a notification email about this call
          </Label>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : existing ? 'Save changes' : 'Schedule call'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
