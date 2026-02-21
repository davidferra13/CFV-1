// BudgetTracker — per-event food cost budget card
// Shows budget vs. actual spend with a progress bar.
// Chef can set a custom budget amount; falls back to the formula-derived guardrail.

'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/currency'
import { setEventFoodCostBudget } from '@/lib/events/actions'

interface BudgetGuardrail {
  quotedPriceCents: number
  targetMarginPercent: number
  maxGrocerySpendCents: number
  currentSpendCents: number
  remainingBudgetCents: number
  historicalAvgSpendCents: number | null
  status: 'under' | 'near' | 'over'
  message: string
  budgetSource: 'manual' | 'formula'
}

interface BudgetTrackerProps {
  eventId: string
  guardrail: BudgetGuardrail
}

export function BudgetTracker({ eventId, guardrail }: BudgetTrackerProps) {
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    maxGrocerySpendCents,
    currentSpendCents,
    remainingBudgetCents,
    historicalAvgSpendCents,
    status,
    budgetSource,
    targetMarginPercent,
    quotedPriceCents,
  } = guardrail

  const spentPercent = maxGrocerySpendCents > 0
    ? Math.min(Math.round((currentSpendCents / maxGrocerySpendCents) * 100), 100)
    : 0
  const isOver = status === 'over'
  const isNear = status === 'near'

  const barColor = isOver
    ? 'bg-red-500'
    : isNear
    ? 'bg-yellow-500'
    : 'bg-green-500'

  const statusLabel = isOver ? 'OVER BUDGET' : isNear ? 'NEAR LIMIT' : 'ON TRACK'
  const statusColor = isOver
    ? 'text-red-700'
    : isNear
    ? 'text-yellow-700'
    : 'text-green-700'

  const borderColor = isOver
    ? 'border-red-200'
    : isNear
    ? 'border-yellow-200'
    : 'border-green-200'

  const bgColor = isOver
    ? 'bg-red-50'
    : isNear
    ? 'bg-yellow-50'
    : 'bg-green-50'

  function handleEditStart() {
    // Pre-fill with the current budget in dollars
    setInputValue((maxGrocerySpendCents / 100).toFixed(2))
    setError(null)
    setEditing(true)
  }

  function handleCancel() {
    setEditing(false)
    setError(null)
  }

  function handleSave() {
    const dollars = parseFloat(inputValue)
    if (isNaN(dollars) || dollars < 0) {
      setError('Enter a valid dollar amount (e.g. 380)')
      return
    }
    const cents = Math.round(dollars * 100)
    startTransition(async () => {
      const result = await setEventFoodCostBudget(eventId, cents)
      if (result.success) {
        setEditing(false)
        setError(null)
      } else {
        setError(result.error ?? 'Failed to save budget')
      }
    })
  }

  function handleClearManual() {
    startTransition(async () => {
      await setEventFoodCostBudget(eventId, null)
      setEditing(false)
    })
  }

  if (quotedPriceCents === 0) return null

  return (
    <Card className={`p-6 ${borderColor} ${bgColor}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-gray-900">Food Cost Budget</h2>
            <span className="text-xs text-gray-500">
              {budgetSource === 'manual' ? '(custom)' : `(${targetMarginPercent}% margin formula)`}
            </span>
          </div>

          {editing ? (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-gray-600">$</span>
              <Input
                type="number"
                min="0"
                step="1"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                className="w-32 h-8 text-sm"
                placeholder="380"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') handleCancel()
                }}
              />
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                {isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
              {budgetSource === 'manual' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearManual}
                  disabled={isPending}
                  className="text-gray-400 text-xs"
                >
                  Use formula
                </Button>
              )}
              {error && <span className="text-xs text-red-600">{error}</span>}
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(maxGrocerySpendCents)}
                </span>
                <span className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</span>
              </div>

              {/* Progress bar */}
              <div className="mt-3 mb-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`${barColor} h-2.5 rounded-full transition-all`}
                    style={{ width: `${spentPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-4 text-sm text-gray-600">
                <span>Spent: <strong>{formatCurrency(currentSpendCents)}</strong></span>
                <span>
                  {isOver
                    ? <span className="text-red-700 font-semibold">Over by {formatCurrency(Math.abs(remainingBudgetCents))}</span>
                    : <>Remaining: <strong>{formatCurrency(Math.max(0, remainingBudgetCents))}</strong></>
                  }
                </span>
                <span className="text-gray-400">{spentPercent}%</span>
              </div>

              {historicalAvgSpendCents && (
                <p className="text-xs text-gray-500 mt-2">
                  Your avg grocery spend: {formatCurrency(historicalAvgSpendCents)}
                </p>
              )}
            </>
          )}
        </div>

        {!editing && (
          <Button size="sm" variant="secondary" onClick={handleEditStart}>
            Set Budget
          </Button>
        )}
      </div>
    </Card>
  )
}
