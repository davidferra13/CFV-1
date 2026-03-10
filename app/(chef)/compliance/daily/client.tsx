'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemperatureLogForm } from '@/components/haccp/temperature-log-form'
import { CleaningChecklist } from '@/components/haccp/cleaning-checklist'
import type { TempLogEntry, CleaningLogEntry } from '@/lib/haccp/compliance-log-actions'

type Tab = 'temperature' | 'cleaning'

type Props = {
  date: string
  initialTempLogs: TempLogEntry[]
  initialCleaningTasks: CleaningLogEntry[]
}

export function ComplianceDailyClient({ date, initialTempLogs, initialCleaningTasks }: Props) {
  const [tab, setTab] = useState<Tab>('temperature')
  const router = useRouter()

  function handleDateChange(newDate: string) {
    router.push(`/compliance/daily?date=${newDate}`)
  }

  return (
    <div className="space-y-4">
      {/* Date Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-stone-400">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="rounded-md border border-stone-700 bg-stone-800 px-3 py-1.5 text-stone-100"
        />
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 rounded-lg bg-stone-800 p-1 w-fit">
        <button
          onClick={() => setTab('temperature')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'temperature'
              ? 'bg-stone-700 text-stone-100'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Temperature Logs
        </button>
        <button
          onClick={() => setTab('cleaning')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'cleaning'
              ? 'bg-stone-700 text-stone-100'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Cleaning Checklist
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'temperature' ? (
        <TemperatureLogForm date={date} initialLogs={initialTempLogs} />
      ) : (
        <CleaningChecklist date={date} initialTasks={initialCleaningTasks} />
      )}
    </div>
  )
}
