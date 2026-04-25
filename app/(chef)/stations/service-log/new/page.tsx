'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createServiceDay } from '@/lib/service-days/actions'
import { Card, CardContent } from '@/components/ui/card'

export default function NewServiceDayPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const [serviceDate, setServiceDate] = useState(today)
  const [shiftLabel, setShiftLabel] = useState('dinner')
  const [expectedCovers, setExpectedCovers] = useState('')
  const [notes, setNotes] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const result = await createServiceDay({
          service_date: serviceDate,
          shift_label: shiftLabel,
          expected_covers: expectedCovers ? parseInt(expectedCovers, 10) : null,
          notes: notes.trim() || null,
        })

        if (!result.success) {
          setError(result.error || 'Failed to create service day')
          return
        }

        router.push('/stations/service-log')
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const inputClass =
    'w-full bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2'
  const labelClass = 'block text-sm font-medium text-stone-300 mb-1'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">New Service Day</h1>
        <p className="mt-1 text-sm text-stone-500">
          Plan your day of service. Fill in expected covers, shift, and any notes.
        </p>
      </div>

      <Card>
        <CardContent className="py-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Service Date</label>
              <input
                type="date"
                required
                className={inputClass}
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Shift</label>
              <select
                className={inputClass}
                value={shiftLabel}
                onChange={(e) => setShiftLabel(e.target.value)}
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="brunch">Brunch</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Expected Covers</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={expectedCovers}
                onChange={(e) => setExpectedCovers(e.target.value)}
                placeholder="e.g. 50"
              />
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                className={inputClass + ' min-h-[80px]'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="VIP tables, special requests, prep reminders..."
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Creating...' : 'Create Service Day'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/stations/service-log')}
                className="rounded-lg bg-stone-700 px-4 py-2 text-sm font-medium text-stone-300 hover:bg-stone-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
