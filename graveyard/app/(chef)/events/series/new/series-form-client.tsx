'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createEventSeries } from '@/lib/events/series-actions'

const SERVICE_MODES = [
  { value: 'recurring', label: 'Recurring (weekly, monthly, etc.)' },
  { value: 'multi_day', label: 'Multi-day event' },
  { value: 'package', label: 'Package deal' },
  { value: 'one_time', label: 'One-time collection' },
]

export function SeriesFormClient() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [serviceMode, setServiceMode] = useState('recurring')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [baseGuestCount, setBaseGuestCount] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const series = await createEventSeries({
          name: name.trim(),
          description: description.trim() || null,
          serviceMode: serviceMode as 'one_time' | 'recurring' | 'multi_day' | 'package',
          startDate: startDate || null,
          endDate: endDate || null,
          baseGuestCount: baseGuestCount ? parseInt(baseGuestCount, 10) : null,
        })
        router.push(`/events/series/${series.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create series')
      }
    })
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Series Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Farm-to-Table Thursdays"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this series about?"
              rows={3}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={serviceMode}
                onChange={(e) => setServiceMode(e.target.value)}
                disabled={isPending}
              >
                {SERVICE_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Base Guest Count</label>
              <Input
                type="number"
                value={baseGuestCount}
                onChange={(e) => setBaseGuestCount(e.target.value)}
                placeholder="Typical capacity"
                min={1}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? 'Creating...' : 'Create Series'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
