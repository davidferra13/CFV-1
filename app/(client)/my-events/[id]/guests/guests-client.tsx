'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  AlertTriangle,
  Check,
  Clock,
  X,
} from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  addClientGuest,
  removeClientGuest,
  type ClientGuest,
  type DietaryRollup,
} from '@/lib/events/client-guest-actions'

const RSVP_CONFIG: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'error' | 'info'; icon: any }
> = {
  confirmed: { label: 'Confirmed', variant: 'success', icon: Check },
  attending: { label: 'Attending', variant: 'success', icon: Check },
  pending: { label: 'Pending', variant: 'warning', icon: Clock },
  declined: { label: 'Declined', variant: 'error', icon: X },
}

export function GuestsClient({
  eventId,
  initialGuests,
  rollup,
}: {
  eventId: string
  initialGuests: ClientGuest[]
  rollup: DietaryRollup
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleAdd() {
    if (!name.trim()) {
      toast.error('Guest name is required')
      return
    }
    startTransition(async () => {
      try {
        await addClientGuest(eventId, { name: name.trim(), email: email.trim() || undefined })
        toast.success(`Added ${name}`)
        setName('')
        setEmail('')
        setShowAdd(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Failed to add guest')
      }
    })
  }

  function handleRemove(guest: ClientGuest) {
    if (!confirm(`Remove ${guest.name} from the guest list?`)) return
    startTransition(async () => {
      try {
        await removeClientGuest(eventId, guest.id)
        toast.success(`Removed ${guest.name}`)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message || 'Failed to remove guest')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/my-events/${eventId}`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to event
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Guest List</h1>
          <p className="text-stone-400 mt-1">
            {rollup.totalGuests} guest{rollup.totalGuests !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Guest
        </button>
      </div>

      {/* Dietary rollup */}
      {(rollup.allergies.length > 0 || rollup.dietaryRestrictions.length > 0) && (
        <Card className="border-amber-800/50">
          <CardHeader>
            <CardTitle className="text-sm">Dietary Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rollup.allergies.length > 0 && (
              <div>
                <p className="text-xs text-stone-500 mb-1.5">Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {rollup.allergies.map((a) => (
                    <span
                      key={a.name}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-red-950/50 text-red-300 border border-red-800/50"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {a.name} ({a.count})
                    </span>
                  ))}
                </div>
              </div>
            )}
            {rollup.dietaryRestrictions.length > 0 && (
              <div>
                <p className="text-xs text-stone-500 mb-1.5">Restrictions</p>
                <div className="flex flex-wrap gap-2">
                  {rollup.dietaryRestrictions.map((d) => (
                    <span
                      key={d.name}
                      className="px-2.5 py-1 rounded-full text-xs bg-stone-800 text-stone-300"
                    >
                      {d.name} ({d.count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* RSVP summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{rollup.confirmed}</p>
            <p className="text-xs text-stone-500">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{rollup.pending}</p>
            <p className="text-xs text-stone-500">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{rollup.declined}</p>
            <p className="text-xs text-stone-500">Declined</p>
          </CardContent>
        </Card>
      </div>

      {/* Add guest form */}
      {showAdd && (
        <Card className="border-brand-600/50">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-stone-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  placeholder="Guest name"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  placeholder="guest@email.com"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-3 py-2 rounded-lg text-sm text-stone-400 hover:text-stone-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {isPending ? 'Adding...' : 'Add Guest'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guest list */}
      {initialGuests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 text-stone-600 mx-auto mb-3" />
            <p className="text-stone-400">
              No guests added yet. Share your event link to start collecting RSVPs.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {initialGuests.map((guest) => {
            const rsvp = RSVP_CONFIG[guest.rsvp_status] || RSVP_CONFIG.pending
            return (
              <Card key={guest.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-100">{guest.name}</p>
                    {guest.email && (
                      <p className="text-xs text-stone-500 truncate">{guest.email}</p>
                    )}
                    {(guest.dietary_restrictions.length > 0 || guest.allergies.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {guest.allergies.map((a) => (
                          <span
                            key={a}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xxs bg-red-950/50 text-red-300"
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {a}
                          </span>
                        ))}
                        {guest.dietary_restrictions.map((d) => (
                          <span
                            key={d}
                            className="px-1.5 py-0.5 rounded text-xxs bg-stone-800 text-stone-400"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge variant={rsvp.variant}>{rsvp.label}</Badge>
                  <button
                    type="button"
                    onClick={() => handleRemove(guest)}
                    disabled={isPending}
                    className="p-1.5 rounded text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
