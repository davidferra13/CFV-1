'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Minus, Plus, Sparkles } from '@/components/ui/icons'
import type { ChefGoal, ServiceType, ServiceSlotClientMatch } from '@/lib/goals/types'
import { computeServiceMixPlan, formatDollars } from '@/lib/goals/service-mix-utils'
import { getClientMatchesForServiceType, autoSuggestMix } from '@/lib/goals/service-mix-actions'
import { ServiceSlotClientMatchList } from './service-slot-client-match'
import { Button } from '@/components/ui/button'

interface ServiceMixCalculatorProps {
  goal: ChefGoal
  serviceTypes: ServiceType[]
  alreadyBookedCents: number
  alreadyBookedCount: number
  gapCents: number
  targetMonth: string
}

export function ServiceMixCalculator({
  goal,
  serviceTypes,
  alreadyBookedCents,
  alreadyBookedCount,
  gapCents,
  targetMonth,
}: ServiceMixCalculatorProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [clientMatches, setClientMatches] = useState<Record<string, ServiceSlotClientMatch[]>>({})
  const [matchLoading, setMatchLoading] = useState<Record<string, boolean>>({})
  const [autoSuggestPending, startAutoSuggest] = useTransition()
  const prevQuantities = useRef<Record<string, number>>({})

  // Lazy-load client matches when a service type goes from 0 → >0 quantity
  useEffect(() => {
    const prev = prevQuantities.current
    for (const st of serviceTypes) {
      const prevQty = prev[st.id] ?? 0
      const newQty = quantities[st.id] ?? 0
      if (prevQty === 0 && newQty > 0 && !clientMatches[st.id]) {
        // Load matches for this service type
        setMatchLoading((m) => ({ ...m, [st.id]: true }))
        getClientMatchesForServiceType(st.id, 3)
          .then((matches) => {
            setClientMatches((cm) => ({ ...cm, [st.id]: matches }))
            setMatchLoading((m) => ({ ...m, [st.id]: false }))
          })
          .catch(() => {
            setMatchLoading((m) => ({ ...m, [st.id]: false }))
          })
      }
    }
    prevQuantities.current = quantities
  }, [quantities, serviceTypes, clientMatches])

  function setQty(serviceTypeId: string, delta: number) {
    setQuantities((prev) => {
      const current = prev[serviceTypeId] ?? 0
      const next = Math.max(0, current + delta)
      return { ...prev, [serviceTypeId]: next }
    })
  }

  function handleAutoSuggest() {
    startAutoSuggest(async () => {
      const suggestions = await autoSuggestMix(goal.id)
      const newQty: Record<string, number> = {}
      for (const { serviceTypeId, quantity } of suggestions) {
        newQty[serviceTypeId] = quantity
      }
      setQuantities(newQty)
    })
  }

  // Build the mix plan from current quantities
  const activeMixItems = serviceTypes
    .filter((st) => (quantities[st.id] ?? 0) > 0)
    .map((st) => ({
      serviceType: st,
      quantity: quantities[st.id] ?? 0,
      clientMatches: clientMatches[st.id] ?? [],
    }))

  const plan = computeServiceMixPlan(activeMixItems, goal.targetValue, alreadyBookedCents)

  const goalPercent = Math.min(
    100,
    Math.round((plan.totalPlannedCents / Math.max(1, plan.gapCents)) * 100)
  )
  const goalMet = plan.unfilledCents === 0
  const goalExceeded = plan.exceededByCents > 0

  // Format month for display (e.g. "May 2026")
  const [yr, mo] = targetMonth.split('-')
  const monthLabel = new Date(parseInt(yr), parseInt(mo) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-5">
      {/* Already-booked banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-950 px-4 py-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              {monthLabel} — already booked
            </p>
            <p className="text-2xl font-bold text-amber-900 mt-0.5">
              {formatDollars(alreadyBookedCents)}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {alreadyBookedCount} event{alreadyBookedCount === 1 ? '' : 's'} confirmed
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              Gap remaining
            </p>
            <p className="text-2xl font-bold text-amber-900 mt-0.5">
              {gapCents > 0 ? formatDollars(gapCents) : '—'}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Goal: {formatDollars(goal.targetValue)}</p>
          </div>
        </div>

        {gapCents === 0 && (
          <p className="mt-2 text-sm font-medium text-emerald-700">
            You&apos;ve already hit your goal this month!
          </p>
        )}
      </div>

      {gapCents > 0 && (
        <>
          {/* Auto-suggest + instruction */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-stone-300">
              Set quantities below to plan your path to{' '}
              <strong>{formatDollars(goal.targetValue)}</strong>.
            </p>
            <Button
              variant="secondary"
              onClick={handleAutoSuggest}
              disabled={autoSuggestPending || serviceTypes.length === 0}
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              {autoSuggestPending ? 'Calculating…' : 'Auto-suggest mix'}
            </Button>
          </div>

          {/* Service type rows */}
          <div className="space-y-3">
            {serviceTypes.map((st) => {
              const qty = quantities[st.id] ?? 0
              const lineRevenue = st.effectivePriceCents * qty
              const isLoading = matchLoading[st.id]

              return (
                <div
                  key={st.id}
                  className={`rounded-lg border px-4 py-3 transition-colors ${
                    qty > 0 ? 'border-brand-700 bg-brand-950' : 'border-stone-700 bg-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Service info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-100 text-sm">{st.name}</p>
                      <p className="text-xs text-stone-500">
                        {formatDollars(st.effectivePriceCents)} each
                        {st.typicalGuestCount > 1 ? ` · ${st.typicalGuestCount} guests` : ''}
                      </p>
                    </div>

                    {/* Quantity stepper */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setQty(st.id, -1)}
                        disabled={qty === 0}
                        className="rounded-full w-7 h-7 flex items-center justify-center border border-stone-600 text-stone-300 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label={`Decrease ${st.name}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-stone-100">
                        {qty}
                      </span>
                      <button
                        onClick={() => setQty(st.id, 1)}
                        className="rounded-full w-7 h-7 flex items-center justify-center border border-stone-600 text-stone-300 hover:bg-stone-700 transition-colors"
                        aria-label={`Increase ${st.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Line revenue */}
                    <div className="w-24 text-right shrink-0">
                      <p
                        className={`text-sm font-semibold ${qty > 0 ? 'text-brand-400' : 'text-stone-300'}`}
                      >
                        {qty > 0 ? formatDollars(lineRevenue) : '—'}
                      </p>
                      {qty > 1 && (
                        <p className="text-xs text-stone-300">
                          {qty} × {formatDollars(st.effectivePriceCents)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Client matches (lazy-loaded when qty > 0) */}
                  {qty > 0 &&
                    (isLoading ? (
                      <p className="mt-2 text-xs text-stone-300">Loading client suggestions…</p>
                    ) : (
                      <ServiceSlotClientMatchList
                        matches={clientMatches[st.id] ?? []}
                        serviceTypeName={st.name}
                      />
                    ))}
                </div>
              )
            })}
          </div>

          {/* Running total section */}
          <div
            className={`rounded-lg border-2 px-4 py-4 space-y-3 ${
              goalMet ? 'border-emerald-300 bg-emerald-950' : 'border-stone-700 bg-stone-800'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Planned revenue
                </p>
                <p
                  className={`text-2xl font-bold mt-0.5 ${goalMet ? 'text-emerald-700' : 'text-stone-100'}`}
                >
                  {formatDollars(plan.totalPlannedCents)}
                </p>
                <p className="text-xs text-stone-300 mt-0.5">
                  + {formatDollars(alreadyBookedCents)} already booked ={' '}
                  <strong>{formatDollars(plan.totalPlannedCents + alreadyBookedCents)}</strong>{' '}
                  total
                </p>
              </div>

              <div className="text-right">
                {goalMet ? (
                  goalExceeded ? (
                    <div>
                      <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                        Goal exceeded
                      </p>
                      <p className="text-xl font-bold text-emerald-700 mt-0.5">
                        +{formatDollars(plan.exceededByCents)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                        Goal hit exactly
                      </p>
                      <p className="text-xl font-bold text-emerald-700 mt-0.5">✓</p>
                    </div>
                  )
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                      Still needed
                    </p>
                    <p className="text-xl font-bold text-amber-700 mt-0.5">
                      {formatDollars(plan.unfilledCents)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-stone-300 mb-1">
                <span>0</span>
                <span>{formatDollars(plan.gapCents)} gap</span>
              </div>
              <div className="h-2.5 rounded-full bg-stone-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    goalMet ? 'bg-emerald-500' : 'bg-brand-500'
                  }`}
                  style={{ width: `${goalPercent}%` }}
                />
              </div>
              <p className="text-xs text-stone-300 mt-1 text-right">
                {goalPercent}% of gap covered by plan
              </p>
            </div>

            {/* Hint when nothing is planned yet */}
            {plan.totalPlannedCents === 0 && (
              <p className="text-sm text-stone-300 text-center pt-1">
                Use the + buttons above or click{' '}
                <button
                  onClick={handleAutoSuggest}
                  disabled={autoSuggestPending}
                  className="font-medium text-brand-600 hover:text-brand-400 underline"
                >
                  Auto-suggest mix
                </button>{' '}
                to get started.
              </p>
            )}
          </div>

          {/* Summary breakdown (when anything is planned) */}
          {plan.items.length > 0 && (
            <div className="rounded-md border border-stone-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-800 border-b border-stone-700">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                      Service
                    </th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                      Qty
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {plan.items.map((item) => (
                    <tr key={item.serviceType.id}>
                      <td className="px-3 py-2 text-stone-200">{item.serviceType.name}</td>
                      <td className="px-3 py-2 text-center text-stone-300">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-medium text-stone-100">
                        {formatDollars(item.lineRevenueCents)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-stone-800 border-t border-stone-700 font-semibold">
                    <td className="px-3 py-2 text-stone-200">Plan total</td>
                    <td />
                    <td className="px-3 py-2 text-right text-stone-100">
                      {formatDollars(plan.totalPlannedCents)}
                    </td>
                  </tr>
                  <tr className="bg-stone-800 font-semibold">
                    <td className="px-3 py-2 text-stone-200">Already booked</td>
                    <td />
                    <td className="px-3 py-2 text-right text-stone-100">
                      {formatDollars(alreadyBookedCents)}
                    </td>
                  </tr>
                  <tr
                    className={`font-bold ${goalMet ? 'bg-emerald-950 text-emerald-800' : 'bg-amber-950 text-amber-800'}`}
                  >
                    <td className="px-3 py-2">Projected total</td>
                    <td />
                    <td className="px-3 py-2 text-right">
                      {formatDollars(plan.totalPlannedCents + alreadyBookedCents)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
