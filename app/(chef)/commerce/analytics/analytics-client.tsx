'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AnalyticsDatePickerProps {
  defaultDate: string
  defaultFrom: string
  defaultTo: string
}

export function AnalyticsDatePicker({
  defaultDate,
  defaultFrom,
  defaultTo,
}: AnalyticsDatePickerProps) {
  const router = useRouter()
  const [date, setDate] = useState(defaultDate)
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)

  function apply() {
    const params = new URLSearchParams()
    params.set('date', date)
    params.set('from', from)
    params.set('to', to)
    router.push(`/commerce/analytics?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs text-stone-500 block mb-1">Today&apos;s Date</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-40"
        />
      </div>
      <div>
        <label className="text-xs text-stone-500 block mb-1">Range Start</label>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-40"
        />
      </div>
      <div>
        <label className="text-xs text-stone-500 block mb-1">Range End</label>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
      </div>
      <Button variant="primary" onClick={apply}>
        Apply
      </Button>
    </div>
  )
}
