// Commerce Reports Client Wrapper — adds date range picker + export menu
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ExportMenu } from '@/components/commerce/export-menu'

type Props = {
  defaultFrom: string
  defaultTo: string
}

export function ReportsDatePicker({ defaultFrom, defaultTo }: Props) {
  const router = useRouter()
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)

  function handleApply() {
    router.push(`/commerce/reports?from=${from}&to=${to}`)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-stone-400 text-xs block mb-1">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-stone-400 text-xs block mb-1">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button variant="primary" size="sm" onClick={handleApply}>
          Apply
        </Button>
      </div>
      <ExportMenu from={from} to={to} />
    </div>
  )
}
