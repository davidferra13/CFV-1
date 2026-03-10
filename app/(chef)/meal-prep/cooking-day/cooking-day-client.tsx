'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, ListChecks } from '@/components/ui/icons'
import { generateCookingDayPlan, getCookingDayPlan } from '@/lib/meal-prep/cooking-day-actions'
import type { CookingDayPlan } from '@/lib/meal-prep/cooking-day-actions'
import { CookingDayChecklist } from '@/components/meal-prep/cooking-day-checklist'

function getMonday(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export function CookingDayView() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [plan, setPlan] = useState<CookingDayPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasCheckedSaved, setHasCheckedSaved] = useState(false)

  const weekDate = new Date(weekStart + 'T00:00:00')
  const weekLabel = weekDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  async function handleLoadOrGenerate() {
    setLoading(true)
    setError(null)
    try {
      // First try to load an existing plan
      if (!hasCheckedSaved) {
        const saved = await getCookingDayPlan(weekStart)
        if (saved) {
          setPlan(saved)
          setHasCheckedSaved(true)
          setLoading(false)
          return
        }
        setHasCheckedSaved(true)
      }

      // No saved plan, generate fresh
      const result = await generateCookingDayPlan(weekStart)
      setPlan(result)
    } catch (err: any) {
      setError(err.message || 'Failed to generate cooking day plan')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerate() {
    setLoading(true)
    setError(null)
    try {
      const result = await generateCookingDayPlan(weekStart)
      setPlan(result)
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate plan')
    } finally {
      setLoading(false)
    }
  }

  function changeWeek(delta: number) {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + delta * 7)
    setWeekStart(d.toISOString().split('T')[0])
    setPlan(null)
    setError(null)
    setHasCheckedSaved(false)
  }

  return (
    <div className="space-y-4">
      {/* Week selector */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => changeWeek(-1)}>
            &larr; Prev
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-400" />
            <span className="font-medium text-stone-200">Week of {weekLabel}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => changeWeek(1)}>
            Next &rarr;
          </Button>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-400">
          {error}
        </div>
      )}

      {!plan && !loading && (
        <div className="text-center py-8">
          <ListChecks className="w-12 h-12 text-stone-600 mx-auto mb-4" />
          <p className="text-stone-400 mb-4">
            Generate an assembly-line task breakdown for your cooking day.
          </p>
          <Button variant="primary" onClick={handleLoadOrGenerate} disabled={loading}>
            Generate Plan
          </Button>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <p className="text-stone-400">Generating cooking day plan...</p>
        </div>
      )}

      {plan && (
        <>
          {plan.tasks.length > 0 ? (
            <>
              <CookingDayChecklist plan={plan} />
              <div className="flex justify-center">
                <Button variant="secondary" size="sm" onClick={handleRegenerate} disabled={loading}>
                  Regenerate Plan
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-stone-500">
                No dishes found for this week. Make sure your meal prep programs have menus or
                custom dishes assigned to their current rotation week.
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={handleRegenerate}
                disabled={loading}
              >
                Try Again
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
