'use client'

import { useState, useTransition } from 'react'
import {
  Users,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Star,
  Phone,
  Mail,
  UserPlus,
  CheckCircle,
} from '@/components/ui/icons'
import type {
  TrustedStaffContact,
  CreateTrustedStaffInput,
  StaffRole,
} from '@/lib/business-ops/staff-roster-actions'
import {
  createTrustedStaff,
  deleteTrustedStaff,
  promoteToStaff,
} from '@/lib/business-ops/staff-roster-actions'

const ROLE_LABELS: Record<StaffRole, string> = {
  sous_chef: 'Sous Chef',
  line_cook: 'Line Cook',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  assistant: 'Assistant',
  driver: 'Driver',
  other: 'Other',
}

function formatRate(cents: number | null): string {
  if (!cents) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= rating ? 'text-amber-400' : 'text-stone-600'}`}
          weight={i <= rating ? 'fill' : 'regular'}
        />
      ))}
    </span>
  )
}

export function TrustedStaffRoster({ initialData }: { initialData: TrustedStaffContact[] }) {
  const [contacts, setContacts] = useState(initialData)
  const [isOpen, setIsOpen] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterRole, setFilterRole] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  const filtered = filterRole ? contacts.filter((c) => c.role === filterRole) : contacts

  function handleCreate(formData: FormData) {
    const hourlyStr = formData.get('hourly_rate_dollars') as string
    const dayStr = formData.get('day_rate_dollars') as string
    const ratingStr = formData.get('reliability_rating') as string
    const input: CreateTrustedStaffInput = {
      name: formData.get('name') as string,
      role: formData.get('role') as StaffRole,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      hourly_rate_cents: hourlyStr ? Math.round(parseFloat(hourlyStr) * 100) : null,
      day_rate_cents: dayStr ? Math.round(parseFloat(dayStr) * 100) : null,
      availability_notes: (formData.get('availability_notes') as string) || null,
      reliability_rating: ratingStr ? parseInt(ratingStr) : null,
      has_food_handler_cert: formData.get('has_food_handler_cert') === 'on',
      has_servsafe: formData.get('has_servsafe') === 'on',
      notes: (formData.get('notes') as string) || null,
    }
    startTransition(async () => {
      try {
        const result = await createTrustedStaff(input)
        setContacts((prev) => [...prev, result.contact])
        setShowForm(false)
      } catch (e) {
        console.error('Failed to create contact:', e)
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteTrustedStaff(id)
        setContacts((prev) => prev.filter((c) => c.id !== id))
      } catch (e) {
        console.error('Failed to delete contact:', e)
      }
    })
  }

  function handlePromote(id: string) {
    startTransition(async () => {
      try {
        const result = await promoteToStaff(id)
        setContacts((prev) =>
          prev.map((c) => (c.id === id ? { ...c, promoted_to_staff_id: result.staffMemberId } : c))
        )
      } catch (e) {
        console.error('Failed to promote contact:', e)
      }
    })
  }

  return (
    <div className="bg-stone-800 rounded-lg border border-stone-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-750"
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-semibold text-stone-100">Trusted Staff</h2>
          <span className="text-sm text-stone-400">({contacts.length})</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-stone-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {contacts.length > 0 && (
            <div className="flex gap-2 items-center">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-stone-900 border border-stone-600 rounded px-2 py-1 text-xs text-stone-300"
              >
                <option value="">All Roles</option>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filtered.length === 0 && !showForm && (
            <p className="text-stone-500 text-sm py-2">
              {contacts.length === 0
                ? 'No trusted staff contacts yet.'
                : 'No contacts match filter.'}
            </p>
          )}

          {filtered.map((contact) => {
            const isPromoted = !!contact.promoted_to_staff_id
            return (
              <div
                key={contact.id}
                className={`p-3 bg-stone-900 rounded-md border ${isPromoted ? 'border-green-800/50 opacity-60' : 'border-stone-700'} space-y-2`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-100">{contact.name}</span>
                      <span className="text-xs text-stone-500 bg-stone-800 px-1.5 py-0.5 rounded">
                        {ROLE_LABELS[contact.role]}
                      </span>
                      <Stars rating={contact.reliability_rating} />
                      {isPromoted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-900/50 text-green-300">
                          <CheckCircle className="w-3 h-3" />
                          Promoted
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isPromoted && (
                      <button
                        onClick={() => handlePromote(contact.id)}
                        disabled={isPending}
                        title="Promote to full staff member"
                        className="p-1 text-stone-500 hover:text-emerald-400"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}
                    {!isPromoted && (
                      <button
                        onClick={() => handleDelete(contact.id)}
                        disabled={isPending}
                        className="p-1 text-stone-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                    >
                      <Phone className="w-3 h-3" />
                      {contact.phone}
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                    >
                      <Mail className="w-3 h-3" />
                      {contact.email}
                    </a>
                  )}
                  {contact.hourly_rate_cents != null && (
                    <span>{formatRate(contact.hourly_rate_cents)}/hr</span>
                  )}
                  {contact.day_rate_cents != null && (
                    <span>{formatRate(contact.day_rate_cents)}/day</span>
                  )}
                  {contact.availability_notes && <span>{contact.availability_notes}</span>}
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                  {contact.has_food_handler_cert && (
                    <span className="text-green-400">Food Handler Cert</span>
                  )}
                  {contact.has_servsafe && <span className="text-green-400">ServSafe</span>}
                  {contact.last_worked_date && (
                    <span>
                      Last worked: {new Date(contact.last_worked_date).toLocaleDateString()}
                    </span>
                  )}
                  {contact.last_worked_event && <span>({contact.last_worked_event})</span>}
                </div>
                {contact.notes && <p className="text-xs text-stone-500">{contact.notes}</p>}
              </div>
            )
          })}

          {showForm ? (
            <form
              action={handleCreate}
              className="p-3 bg-stone-900 rounded-md border border-stone-700 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="name"
                  placeholder="Name"
                  required
                  className="col-span-2 bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <select
                  name="role"
                  required
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  name="phone"
                  placeholder="Phone"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <input
                  name="hourly_rate_dollars"
                  type="number"
                  step="0.01"
                  placeholder="Hourly rate ($)"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <input
                  name="day_rate_dollars"
                  type="number"
                  step="0.01"
                  placeholder="Day rate ($)"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <select
                  name="reliability_rating"
                  className="bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100"
                >
                  <option value="">Rating</option>
                  <option value="1">1 Star</option>
                  <option value="2">2 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="5">5 Stars</option>
                </select>
                <input
                  name="availability_notes"
                  placeholder="Availability notes"
                  className="col-span-2 bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
                />
                <label className="flex items-center gap-2 text-sm text-stone-300">
                  <input
                    name="has_food_handler_cert"
                    type="checkbox"
                    className="rounded bg-stone-800 border-stone-600"
                  />
                  Food Handler Cert
                </label>
                <label className="flex items-center gap-2 text-sm text-stone-300">
                  <input
                    name="has_servsafe"
                    type="checkbox"
                    className="rounded bg-stone-800 border-stone-600"
                  />
                  ServSafe
                </label>
                <textarea
                  name="notes"
                  placeholder="Notes"
                  rows={2}
                  className="col-span-2 bg-stone-800 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-sm text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1.5 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300"
            >
              <Plus className="w-4 h-4" /> Add Contact
            </button>
          )}
        </div>
      )}
    </div>
  )
}
