'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function MonthSelector({ currentMonth }: { currentMonth: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const now = new Date()
  // Generate last 6 months as options
  const months: { value: string; label: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    months.push({ value, label })
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('month', e.target.value)
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <select
      value={currentMonth}
      onChange={handleChange}
      className="bg-stone-800 border border-stone-700 text-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      {months.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </select>
  )
}
