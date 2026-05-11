'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function TaxYearSelector({ currentYear }: { currentYear: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const thisYear = new Date().getFullYear()
  const years = [thisYear, thisYear - 1, thisYear - 2, thisYear - 3]

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('year', e.target.value)
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <select
      value={currentYear}
      onChange={handleChange}
      className="bg-stone-800 border border-stone-700 text-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  )
}
