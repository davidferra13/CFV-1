'use client'

// MenuScaleDialog - Guest count auto-scaling with preview
// Shows current vs. new scale factors and technique adjustments

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { scaleMenuToGuestCount } from '@/lib/menus/menu-intelligence-actions'
import type { ScalingSummary } from '@/lib/menus/menu-intelligence-actions'

interface MenuScaleDialogProps {
  menuId: string
  currentGuestCount: number
  menuStatus: string
  onScaled?: (summary: ScalingSummary) => void
  className?: string
}

export function MenuScaleDialog({
  menuId,
  currentGuestCount,
  menuStatus,
  onScaled,
  className = '',
}: MenuScaleDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [newGuestCount, setNewGuestCount] = useState(currentGuestCount.toString())
  const [result, setResult] = useState<ScalingSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const isLocked = menuStatus === 'locked'
  const parsedCount = parseInt(newGuestCount, 10)
  const isValid = !isNaN(parsedCount) && parsedCount >= 1 && parsedCount <= 500
  const hasChanged = parsedCount !== currentGuestCount

  function handleScale() {
    if (!isValid || !hasChanged || isLocked) return

    const previous = currentGuestCount
    setError(null)

    startTransition(async () => {
      try {
        const summary = await scaleMenuToGuestCount(menuId, parsedCount)
        setResult(summary)
        onScaled?.(summary)
      } catch (err) {
        setNewGuestCount(previous.toString())
        setError(err instanceof Error ? err.message : 'Failed to scale menu')
        setResult(null)
      }
    })
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        disabled={isLocked}
        className={`flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-800/50 px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:border-stone-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title={isLocked ? 'Cannot scale a locked menu' : 'Scale menu to different guest count'}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
        Scale: {currentGuestCount} guests
      </button>
    )
  }

  return (
    <div
      className={`rounded-lg border border-stone-700 bg-stone-800/50 p-4 space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-300">Scale Menu</h3>
        <button
          onClick={() => {
            setIsOpen(false)
            setResult(null)
            setError(null)
          }}
          className="text-stone-500 hover:text-stone-300 text-xs"
        >
          Close
        </button>
      </div>

      {/* Input */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs text-stone-500 mb-1 block">New Guest Count</label>
          <Input
            type="number"
            min={1}
            max={500}
            value={newGuestCount}
            onChange={(e) => {
              setNewGuestCount(e.target.value)
              setResult(null)
              setError(null)
            }}
            disabled={isPending}
            className="w-full"
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleScale}
          disabled={isPending || !isValid || !hasChanged}
        >
          {isPending ? 'Scaling...' : 'Scale'}
        </Button>
      </div>

      {/* Scale ratio preview */}
      {isValid && hasChanged && !result && (
        <div className="text-xs text-stone-500">
          Scale ratio: {currentGuestCount} → {parsedCount} (
          {((parsedCount / currentGuestCount) * 100).toFixed(0)}%)
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="rounded-lg bg-emerald-950/30 border border-emerald-800/30 px-3 py-2">
            <p className="text-xs text-emerald-300">
              Scaled {result.componentsScaled} component{result.componentsScaled !== 1 ? 's' : ''}{' '}
              from {result.previousGuestCount} to {result.newGuestCount} guests
            </p>
            {result.newCostPerGuest !== null && (
              <p className="text-xs text-emerald-400 mt-1">
                New cost per guest: ${(result.newCostPerGuest / 100).toFixed(2)}
              </p>
            )}
          </div>

          {/* Adjustments */}
          {result.adjustments.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-stone-500 font-medium">Adjustments:</p>
              {result.adjustments.map((adj, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-stone-900/30"
                >
                  <span className="text-stone-300 flex-1 truncate">{adj.componentName}</span>
                  <span className="text-stone-500 font-mono tabular-nums">
                    {adj.previousScale.toFixed(2)}x → {adj.newScale.toFixed(2)}x
                  </span>
                  {adj.note && (
                    <Badge variant={adj.note.includes('batch splitting') ? 'warning' : 'info'}>
                      {adj.note.includes('batch') ? 'Batch' : 'Small'}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
