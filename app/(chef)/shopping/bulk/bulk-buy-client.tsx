'use client'

import { useState, useTransition } from 'react'
import type { BulkBuyOpportunity, ShoppingConsolidation } from '@/lib/intelligence/bulk-buy'
import { getBulkBuyOpportunities, fetchShoppingConsolidation } from '@/lib/intelligence/bulk-buy-actions'
import { BulkBuyCard } from '@/components/intelligence/bulk-buy-card'
import { ConsolidatedShoppingList } from '@/components/intelligence/consolidated-shopping-list'
import { SavingsSummary } from '@/components/intelligence/savings-summary'

interface Props {
  initialOpportunities: BulkBuyOpportunity[]
  initialConsolidation: ShoppingConsolidation
  initialStartDate: string
  initialEndDate: string
}

export function BulkBuyClient({
  initialOpportunities,
  initialConsolidation,
  initialStartDate,
  initialEndDate,
}: Props) {
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)
  const [opportunities, setOpportunities] = useState(initialOpportunities)
  const [consolidation, setConsolidation] = useState(initialConsolidation)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'opportunities' | 'shopping-list'>('opportunities')

  function handleDateChange(newStart: string, newEnd: string) {
    setStartDate(newStart)
    setEndDate(newEnd)
    setError(null)

    startTransition(async () => {
      try {
        const [oppResult, consolidationResult] = await Promise.all([
          getBulkBuyOpportunities(newStart, newEnd),
          fetchShoppingConsolidation(newStart, newEnd),
        ])

        if (oppResult.error) {
          setError(oppResult.error)
        } else {
          setOpportunities(oppResult.opportunities)
        }

        if (consolidationResult.consolidation) {
          setConsolidation(consolidationResult.consolidation)
        }
      } catch {
        setError('Failed to load bulk buy data')
      }
    })
  }

  const totalSavings = opportunities.reduce((sum, o) => sum + o.savingsCents, 0)
  const recommendedCount = opportunities.filter(o => o.recommendation === 'recommended').length
  const cautionCount = opportunities.filter(o => o.recommendation === 'caution').length
  const skipCount = opportunities.filter(o => o.recommendation === 'skip').length
  const eventsCovered = consolidation.eventsCovered

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Bulk Buy Optimizer</h1>
        <p className="text-stone-400 mt-1 text-sm">
          Save money by purchasing shared ingredients across events in bulk
        </p>
      </div>

      {/* Date range selector */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div>
          <label className="block text-xs text-stone-500 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange(e.target.value, endDate)}
            disabled={isPending}
            className="rounded-lg border border-stone-700 bg-stone-800/60 px-3 py-2 text-sm text-stone-200 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange(startDate, e.target.value)}
            disabled={isPending}
            className="rounded-lg border border-stone-700 bg-stone-800/60 px-3 py-2 text-sm text-stone-200 disabled:opacity-50"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const now = new Date()
              const oneWeek = new Date(now)
              oneWeek.setDate(oneWeek.getDate() + 7)
              const toStr = (d: Date) =>
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
              handleDateChange(toStr(now), toStr(oneWeek))
            }}
            disabled={isPending}
            className="px-3 py-2 rounded-lg border border-stone-700 bg-stone-800/60 text-stone-300 hover:bg-stone-700/60 text-xs disabled:opacity-50"
          >
            1 Week
          </button>
          <button
            onClick={() => {
              const now = new Date()
              const twoWeeks = new Date(now)
              twoWeeks.setDate(twoWeeks.getDate() + 14)
              const toStr = (d: Date) =>
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
              handleDateChange(toStr(now), toStr(twoWeeks))
            }}
            disabled={isPending}
            className="px-3 py-2 rounded-lg border border-stone-700 bg-stone-800/60 text-stone-300 hover:bg-stone-700/60 text-xs disabled:opacity-50"
          >
            2 Weeks
          </button>
          <button
            onClick={() => {
              const now = new Date()
              const oneMonth = new Date(now)
              oneMonth.setDate(oneMonth.getDate() + 30)
              const toStr = (d: Date) =>
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
              handleDateChange(toStr(now), toStr(oneMonth))
            }}
            disabled={isPending}
            className="px-3 py-2 rounded-lg border border-stone-700 bg-stone-800/60 text-stone-300 hover:bg-stone-700/60 text-xs disabled:opacity-50"
          >
            1 Month
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {isPending && (
        <div className="text-center py-8">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
          <p className="text-stone-400 text-sm mt-2">Analyzing bulk buy opportunities...</p>
        </div>
      )}

      {!isPending && (
        <>
          {/* Savings summary */}
          <SavingsSummary
            totalSavingsCents={totalSavings}
            recommendedCount={recommendedCount}
            cautionCount={cautionCount}
            skipCount={skipCount}
            eventsCovered={eventsCovered}
          />

          {/* Tab selector */}
          <div className="flex gap-1 rounded-lg bg-stone-800/40 p-1">
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'opportunities'
                  ? 'bg-stone-700 text-stone-100'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Bulk Opportunities ({opportunities.length})
            </button>
            <button
              onClick={() => setActiveTab('shopping-list')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'shopping-list'
                  ? 'bg-stone-700 text-stone-100'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Consolidated List ({consolidation.totalItems})
            </button>
          </div>

          {/* Content */}
          {activeTab === 'opportunities' && (
            <div>
              {opportunities.length === 0 ? (
                <div className="rounded-lg border border-stone-700/40 bg-stone-900/40 p-8 text-center">
                  <p className="text-stone-400 text-sm">
                    No bulk buy opportunities found.
                  </p>
                  <p className="text-stone-500 text-xs mt-1">
                    Bulk opportunities appear when 2 or more events share ingredients. Ensure events have menus with linked recipes.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {opportunities.map((opp, i) => (
                    <BulkBuyCard key={i} opportunity={opp} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'shopping-list' && (
            <ConsolidatedShoppingList consolidation={consolidation} />
          )}
        </>
      )}
    </div>
  )
}
