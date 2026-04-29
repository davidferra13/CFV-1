'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addEventContact,
  updateEventContact,
  removeEventContact,
  type EventContact,
} from '@/lib/events/contacts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmailHandoff, PhoneHandoff } from '@/components/ui/handoff-actions'
import { toast } from 'sonner'

const ROLE_LABELS: Record<string, string> = {
  primary: 'Primary',
  planner: 'Planner',
  venue_manager: 'Venue Manager',
  host: 'Host',
  coordinator: 'Coordinator',
  assistant: 'Assistant',
  other: 'Other',
}

const ROLE_BADGE_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  primary: 'success',
  planner: 'info',
  venue_manager: 'warning',
  host: 'info',
  coordinator: 'default',
  assistant: 'default',
  other: 'default',
}

const VISIBILITY_LABELS: Record<string, string> = {
  full: 'Full Access',
  logistics_only: 'Logistics Only',
  day_of_only: 'Day-of Only',
}

const ROLES = [
  'primary',
  'planner',
  'venue_manager',
  'host',
  'coordinator',
  'assistant',
  'other',
] as const
const VISIBILITIES = ['full', 'logistics_only', 'day_of_only'] as const

type Props = {
  eventId: string
  contacts: EventContact[]
}

export function EventContactsPanel({ eventId, contacts }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function refresh() {
    router.refresh()
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      try {
        const result = await removeEventContact(id)
        if (!result.success) {
          toast.error(result.error || 'Failed to remove contact.')
          return
        }
        toast.success('Contact removed.')
        refresh()
      } catch {
        toast.error('Failed to remove contact.')
      }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Event Contacts</CardTitle>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
          }}
        >
          + Add Contact
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && !editingId && (
          <ContactForm
            eventId={eventId}
            onSuccess={() => {
              setShowForm(false)
              refresh()
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {contacts.length === 0 && !showForm ? (
          <p className="text-sm text-stone-500">
            No contacts yet. Add planners, venue managers, or assistants involved in this event.
          </p>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id}>
                {editingId === contact.id ? (
                  <ContactForm
                    eventId={eventId}
                    existing={contact}
                    onSuccess={() => {
                      setEditingId(null)
                      refresh()
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <ContactRow
                    contact={contact}
                    onEdit={() => {
                      setEditingId(contact.id)
                      setShowForm(false)
                    }}
                    onRemove={() => handleRemove(contact.id)}
                    isPending={isPending}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Contact Row ─────────────────────────────

function ContactRow({
  contact,
  onEdit,
  onRemove,
  isPending,
}: {
  contact: EventContact
  onEdit: () => void
  onRemove: () => void
  isPending: boolean
}) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 p-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-stone-700 flex items-center justify-center text-sm font-medium text-stone-400 flex-shrink-0">
          {contact.contact_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-100 truncate">{contact.contact_name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge variant={ROLE_BADGE_VARIANTS[contact.role] || 'default'}>
              {ROLE_LABELS[contact.role] || contact.role}
            </Badge>
            <span className="text-xs text-stone-500">
              {VISIBILITY_LABELS[contact.visibility] || contact.visibility}
            </span>
            {contact.receives_notifications && (
              <span className="text-xs text-stone-500">Notified</span>
            )}
          </div>
          {(contact.contact_email || contact.contact_phone) && (
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-stone-400">
              {contact.contact_email && <EmailHandoff email={contact.contact_email} />}
              {contact.contact_phone && <PhoneHandoff phone={contact.contact_phone} />}
            </div>
          )}
          {contact.notes && <p className="text-xs text-stone-500 mt-1 italic">{contact.notes}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onEdit}
            disabled={isPending}
            className="text-xs text-stone-400 hover:text-stone-300 px-1.5 py-0.5 rounded"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={isPending}
            className="text-xs text-red-500 hover:text-red-400 px-1.5 py-0.5 rounded"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Contact Form ────────────────────────────

function ContactForm({
  eventId,
  existing,
  onSuccess,
  onCancel,
}: {
  eventId: string
  existing?: EventContact
  onSuccess: () => void
  onCancel: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(existing?.contact_name ?? '')
  const [email, setEmail] = useState(existing?.contact_email ?? '')
  const [phone, setPhone] = useState(existing?.contact_phone ?? '')
  const [role, setRole] = useState<string>(existing?.role ?? 'planner')
  const [visibility, setVisibility] = useState<string>(existing?.visibility ?? 'full')
  const [receivesNotifications, setReceivesNotifications] = useState(
    existing?.receives_notifications ?? true
  )
  const [notes, setNotes] = useState(existing?.notes ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Contact name is required.')
      return
    }

    startTransition(async () => {
      try {
        if (existing) {
          const result = await updateEventContact(existing.id, {
            contact_name: name.trim(),
            contact_email: email.trim() || null,
            contact_phone: phone.trim() || null,
            role: role as any,
            visibility: visibility as any,
            receives_notifications: receivesNotifications,
            notes: notes.trim() || null,
          })
          if (!result.success) {
            toast.error(result.error || 'Failed to update contact.')
            return
          }
          toast.success('Contact updated.')
        } else {
          const result = await addEventContact({
            event_id: eventId,
            contact_name: name.trim(),
            contact_email: email.trim() || null,
            contact_phone: phone.trim() || null,
            role: role as any,
            visibility: visibility as any,
            receives_notifications: receivesNotifications,
            notes: notes.trim() || null,
          })
          if (!result.success) {
            toast.error(result.error || 'Failed to add contact.')
            return
          }
          toast.success('Contact added.')
        }
        onSuccess()
      } catch {
        toast.error(existing ? 'Failed to update contact.' : 'Failed to add contact.')
      }
    })
  }

  const inputClass =
    'w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-brand-500'
  const labelClass = 'block text-xs font-medium text-stone-300 mb-1'

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-brand-700 bg-brand-950/40 p-4 space-y-3"
    >
      <p className="text-sm font-semibold text-stone-200">
        {existing ? 'Edit Contact' : 'Add Contact'}
      </p>

      <div>
        <label className={labelClass}>Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sarah Miller"
          className={inputClass}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sarah@example.com"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Visibility</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className={inputClass}
          >
            {VISIBILITIES.map((v) => (
              <option key={v} value={v}>
                {VISIBILITY_LABELS[v]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes about this contact"
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
        <input
          type="checkbox"
          checked={receivesNotifications}
          onChange={(e) => setReceivesNotifications(e.target.checked)}
          className="h-4 w-4 rounded border-stone-600"
        />
        Receives event notifications
      </label>

      <div className="flex gap-2">
        <Button variant="primary" size="sm" type="submit" loading={isPending}>
          {isPending ? 'Saving...' : existing ? 'Save Changes' : 'Add Contact'}
        </Button>
        <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
