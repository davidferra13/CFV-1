'use client'

import { useState, useTransition, useEffect } from 'react'
import { Select } from '@/components/ui/select'
import { getActiveSeriesOptions, linkEventToSeries } from '@/lib/events/series-actions'

type Props = {
  eventId: string
  currentSeriesId: string | null
}

type SeriesOption = { id: string; name: string; event_count: number }

export function SeriesSelector({ eventId, currentSeriesId }: Props) {
  const [options, setOptions] = useState<SeriesOption[]>([])
  const [value, setValue] = useState(currentSeriesId ?? '')
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getActiveSeriesOptions().then((opts) => {
      setOptions(opts)
      setLoaded(true)
    })
  }, [])

  function handleChange(nextValue: string) {
    setValue(nextValue)
    startTransition(async () => {
      try {
        await linkEventToSeries({
          eventId,
          seriesId: nextValue || null,
        })
      } catch {
        setValue(currentSeriesId ?? '')
      }
    })
  }

  if (!loaded) return null
  if (options.length === 0 && !currentSeriesId) return null

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Event Series</label>
      <Select value={value} onChange={(e) => handleChange(e.target.value)} disabled={isPending}>
        <option value="">No series</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name} ({opt.event_count} events)
          </option>
        ))}
      </Select>
    </div>
  )
}
