'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ChefGoal, ServiceType } from '@/lib/goals/types'
import { ServiceTypeManager } from './service-type-manager'
import { ServiceMixCalculator } from './service-mix-calculator'

interface RevenuePathPanelProps {
  revenueGoal: ChefGoal
  initialServiceTypes: ServiceType[]
  alreadyBookedCents: number
  alreadyBookedCount: number
  gapCents: number
  targetMonth: string
}

type Tab = 'services' | 'calculator'

export function RevenuePathPanel({
  revenueGoal,
  initialServiceTypes,
  alreadyBookedCents,
  alreadyBookedCount,
  gapCents,
  targetMonth,
}: RevenuePathPanelProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>(
    initialServiceTypes.length === 0 ? 'services' : 'calculator'
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_pending, startRefresh] = useTransition()

  function handleServiceTypesChanged() {
    startRefresh(() => {
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-stone-700">
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'services'
              ? 'border-brand-600 text-brand-400'
              : 'border-transparent text-stone-500 hover:text-stone-300'
          }`}
        >
          My Service Types
          {initialServiceTypes.length > 0 && (
            <span className="ml-2 rounded-full bg-stone-800 px-1.5 py-0.5 text-xs text-stone-400">
              {initialServiceTypes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('calculator')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'calculator'
              ? 'border-brand-600 text-brand-400'
              : 'border-transparent text-stone-500 hover:text-stone-300'
          }`}
        >
          Build My Path
        </button>
      </div>

      {activeTab === 'services' && (
        <ServiceTypeManager
          serviceTypes={initialServiceTypes}
          onChanged={handleServiceTypesChanged}
          onGoToCalculator={() => setActiveTab('calculator')}
        />
      )}

      {activeTab === 'calculator' &&
        (initialServiceTypes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-600 p-10 text-center space-y-2">
            <p className="text-stone-500 text-sm">
              Add at least one service type before building your path.
            </p>
            <button
              onClick={() => setActiveTab('services')}
              className="text-sm font-medium text-brand-600 hover:text-brand-400"
            >
              Add service types →
            </button>
          </div>
        ) : (
          <ServiceMixCalculator
            goal={revenueGoal}
            serviceTypes={initialServiceTypes}
            alreadyBookedCents={alreadyBookedCents}
            alreadyBookedCount={alreadyBookedCount}
            gapCents={gapCents}
            targetMonth={targetMonth}
          />
        ))}
    </div>
  )
}
