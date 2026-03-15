'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  cancelRegistration,
  type ClassRegistrationRow,
  type ClassCapacityStatus,
  type ClassDietarySummary,
} from '@/lib/classes/class-actions'
import { useConfirm } from '@/lib/hooks/use-confirm'
import { toast } from 'sonner'

type ClassRegistrationsProps = {
  registrations: ClassRegistrationRow[]
  capacity: ClassCapacityStatus
  dietarySummary: ClassDietarySummary
  classId: string
}

const REG_STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  registered: 'success',
  waitlisted: 'warning',
  confirmed: 'info',
  cancelled: 'error',
  no_show: 'default',
}

export function ClassRegistrations({
  registrations,
  capacity,
  dietarySummary,
  classId,
}: ClassRegistrationsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'registered' | 'waitlisted'>('registered')
  const [error, setError] = useState<string | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const registered = registrations.filter(
    (r) => r.status === 'registered' || r.status === 'confirmed'
  )
  const waitlisted = registrations.filter((r) => r.status === 'waitlisted')
  const activeList = activeTab === 'registered' ? registered : waitlisted

  async function handleCancel(regId: string) {
    const ok = await confirm({
      title: 'Cancel this registration?',
      description:
        'The attendee will be removed from the class. If there is a waitlist, the next person will be notified.',
      confirmLabel: 'Cancel Registration',
      variant: 'danger',
    })
    if (!ok) return
    setError(null)
    startTransition(async () => {
      try {
        await cancelRegistration(regId)
        toast.success('Registration cancelled')
        router.refresh()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to cancel registration'
        setError(msg)
        toast.error(msg)
      }
    })
  }

  const capacityPercent =
    capacity.maxCapacity > 0 ? Math.round((capacity.registered / capacity.maxCapacity) * 100) : 0

  return (
    <div className="space-y-6">
      <ConfirmDialog />
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Capacity overview */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Capacity</h3>
        <div className="flex items-center gap-4 text-sm mb-2">
          <span>{capacity.registered} registered</span>
          <span>{capacity.waitlisted} waitlisted</span>
          <span>{capacity.available} available</span>
          <span className="text-gray-400">/ {capacity.maxCapacity} max</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              capacity.isFull ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(capacityPercent, 100)}%` }}
          />
        </div>
        {capacity.isFull && (
          <p className="text-sm text-red-600 mt-1">
            Class is full. New registrations will be waitlisted.
          </p>
        )}
      </Card>

      {/* Dietary summary */}
      {dietarySummary.totalAttendees > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">
            Dietary Summary ({dietarySummary.totalAttendees} attendees)
          </h3>

          {Object.keys(dietarySummary.allergies).length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-red-700 mb-1">Allergies</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(dietarySummary.allergies)
                  .sort(([, a], [, b]) => b - a)
                  .map(([allergy, count]) => (
                    <Badge key={allergy} variant="error">
                      {allergy} ({count})
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {Object.keys(dietarySummary.dietaryRestrictions).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-amber-700 mb-1">Dietary Restrictions</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(dietarySummary.dietaryRestrictions)
                  .sort(([, a], [, b]) => b - a)
                  .map(([restriction, count]) => (
                    <Badge key={restriction} variant="warning">
                      {restriction} ({count})
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {Object.keys(dietarySummary.allergies).length === 0 &&
            Object.keys(dietarySummary.dietaryRestrictions).length === 0 && (
              <p className="text-sm text-gray-500">
                No allergies or dietary restrictions reported.
              </p>
            )}
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-1">
        <button
          onClick={() => setActiveTab('registered')}
          className={`px-3 py-1 text-sm font-medium rounded-t ${
            activeTab === 'registered'
              ? 'bg-white border border-b-white -mb-px text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Registered ({registered.length})
        </button>
        <button
          onClick={() => setActiveTab('waitlisted')}
          className={`px-3 py-1 text-sm font-medium rounded-t ${
            activeTab === 'waitlisted'
              ? 'bg-white border border-b-white -mb-px text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Waitlisted ({waitlisted.length})
        </button>
      </div>

      {/* Attendee list */}
      {activeList.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          {activeTab === 'registered' ? 'No registered attendees yet.' : 'No one on the waitlist.'}
        </p>
      ) : (
        <div className="space-y-3">
          {activeList.map((reg) => (
            <Card key={reg.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{reg.attendee_name}</span>
                    <Badge variant={REG_STATUS_BADGE[reg.status] ?? 'default'}>{reg.status}</Badge>
                    {reg.payment_status && (
                      <Badge variant={reg.payment_status === 'paid' ? 'success' : 'default'}>
                        {reg.payment_status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{reg.attendee_email}</p>

                  {reg.allergies && reg.allergies.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {reg.allergies.map((a, i) => (
                        <span
                          key={i}
                          className="text-xs bg-red-100 text-red-700 rounded px-2 py-0.5"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}

                  {reg.dietary_restrictions && reg.dietary_restrictions.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {reg.dietary_restrictions.map((d, i) => (
                        <span
                          key={i}
                          className="text-xs bg-amber-100 text-amber-700 rounded px-2 py-0.5"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}

                  {reg.notes && <p className="text-sm text-gray-400 mt-1">{reg.notes}</p>}

                  <p className="text-xs text-gray-400 mt-1">
                    Registered {new Date(reg.registered_at).toLocaleDateString()}
                  </p>
                </div>

                {(reg.status === 'registered' ||
                  reg.status === 'confirmed' ||
                  reg.status === 'waitlisted') && (
                  <Button
                    variant="danger"
                    onClick={() => handleCancel(reg.id)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
