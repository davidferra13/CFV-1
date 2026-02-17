'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

type TimeData = {
  time_shopping_minutes: number | null
  time_prep_minutes: number | null
  time_travel_minutes: number | null
  time_service_minutes: number | null
  time_reset_minutes: number | null
}

export function TimeTracking({
  eventId,
  initialData,
  onSave,
}: {
  eventId: string
  initialData: TimeData
  onSave: (eventId: string, data: TimeData) => Promise<{ success: boolean }>
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shopping, setShopping] = useState(initialData.time_shopping_minutes?.toString() ?? '')
  const [prep, setPrep] = useState(initialData.time_prep_minutes?.toString() ?? '')
  const [travel, setTravel] = useState(initialData.time_travel_minutes?.toString() ?? '')
  const [service, setService] = useState(initialData.time_service_minutes?.toString() ?? '')
  const [reset, setReset] = useState(initialData.time_reset_minutes?.toString() ?? '')

  const totalMinutes = (parseInt(shopping) || 0) + (parseInt(prep) || 0) + (parseInt(travel) || 0) + (parseInt(service) || 0) + (parseInt(reset) || 0)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  const hasData = initialData.time_shopping_minutes !== null || initialData.time_prep_minutes !== null ||
    initialData.time_travel_minutes !== null || initialData.time_service_minutes !== null || initialData.time_reset_minutes !== null

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(eventId, {
        time_shopping_minutes: shopping ? parseInt(shopping) : null,
        time_prep_minutes: prep ? parseInt(prep) : null,
        time_travel_minutes: travel ? parseInt(travel) : null,
        time_service_minutes: service ? parseInt(service) : null,
        time_reset_minutes: reset ? parseInt(reset) : null,
      })
      setEditing(false)
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Time Invested</CardTitle>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              {hasData ? 'Edit' : 'Log Time'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <p className="text-sm text-stone-500">Track how long each phase took to calculate your effective hourly rate.</p>
          ) : (
            <div>
              <dl className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {initialData.time_shopping_minutes !== null && (
                  <div>
                    <dt className="text-xs font-medium text-stone-500">Shopping</dt>
                    <dd className="text-lg font-semibold text-stone-900">{initialData.time_shopping_minutes}m</dd>
                  </div>
                )}
                {initialData.time_prep_minutes !== null && (
                  <div>
                    <dt className="text-xs font-medium text-stone-500">Prep</dt>
                    <dd className="text-lg font-semibold text-stone-900">{initialData.time_prep_minutes}m</dd>
                  </div>
                )}
                {initialData.time_travel_minutes !== null && (
                  <div>
                    <dt className="text-xs font-medium text-stone-500">Travel</dt>
                    <dd className="text-lg font-semibold text-stone-900">{initialData.time_travel_minutes}m</dd>
                  </div>
                )}
                {initialData.time_service_minutes !== null && (
                  <div>
                    <dt className="text-xs font-medium text-stone-500">Service</dt>
                    <dd className="text-lg font-semibold text-stone-900">{initialData.time_service_minutes}m</dd>
                  </div>
                )}
                {initialData.time_reset_minutes !== null && (
                  <div>
                    <dt className="text-xs font-medium text-stone-500">Reset</dt>
                    <dd className="text-lg font-semibold text-stone-900">{initialData.time_reset_minutes}m</dd>
                  </div>
                )}
              </dl>
              <p className="text-sm text-stone-600 mt-3 font-medium">
                Total: {hours > 0 ? `${hours}h ` : ''}{mins}m
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Time Invested</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-600">Shopping (min)</label>
            <Input type="number" placeholder="0" value={shopping} onChange={(e) => setShopping(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Prep (min)</label>
            <Input type="number" placeholder="0" value={prep} onChange={(e) => setPrep(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Travel (min)</label>
            <Input type="number" placeholder="0" value={travel} onChange={(e) => setTravel(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Service (min)</label>
            <Input type="number" placeholder="0" value={service} onChange={(e) => setService(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600">Reset (min)</label>
            <Input type="number" placeholder="0" value={reset} onChange={(e) => setReset(e.target.value)} />
          </div>
        </div>
        {totalMinutes > 0 && (
          <p className="text-sm text-stone-600 mt-2">
            Total: {hours > 0 ? `${hours}h ` : ''}{mins}m
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
