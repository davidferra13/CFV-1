'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

type Props = {
  selectedYear: number
  years: number[]
}

export function OwnerDrawsYearSelect({ selectedYear, years }: Props) {
  const router = useRouter()
  const [year, setYear] = useState(String(selectedYear))
  const [isPending, startTransition] = useTransition()

  function handleChange(nextYear: string) {
    setYear(nextYear)
    startTransition(() => {
      router.push(`/finance/ledger/owner-draws?year=${encodeURIComponent(nextYear)}`)
    })
  }

  return (
    <select
      value={year}
      onChange={(event) => handleChange(event.currentTarget.value)}
      disabled={isPending}
      aria-label="Owner draws year"
      className="text-sm border border-stone-600 rounded-md px-3 py-2 text-stone-300 bg-stone-900 disabled:opacity-60"
    >
      {years.map((optionYear) => (
        <option key={optionYear} value={optionYear}>
          {optionYear}
        </option>
      ))}
    </select>
  )
}
