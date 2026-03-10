'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'

const PRESETS = [
  { percent: 15, label: '15%' },
  { percent: 18, label: '18%' },
  { percent: 20, label: '20%' },
  { percent: 25, label: '25%' },
]

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

type TipSelectorProps = {
  /** Event total in cents (base for percentage calculations) */
  baseTotalCents: number
  /** Called when tip amount changes. Passes amount in cents (0 = no tip). */
  onChange: (amountCents: number) => void
  /** Currently selected amount in cents */
  value: number
}

export function TipSelector({ baseTotalCents, onChange, value }: TipSelectorProps) {
  const [mode, setMode] = useState<'preset' | 'custom' | 'none'>('none')
  const [selectedPercent, setSelectedPercent] = useState<number | null>(null)
  const [customDollars, setCustomDollars] = useState('')

  const presetAmounts = useMemo(
    () =>
      PRESETS.map((p) => ({
        ...p,
        amountCents: Math.round((baseTotalCents * p.percent) / 100),
      })),
    [baseTotalCents]
  )

  function selectPreset(percent: number, amountCents: number) {
    setMode('preset')
    setSelectedPercent(percent)
    setCustomDollars('')
    onChange(amountCents)
  }

  function selectNoTip() {
    setMode('none')
    setSelectedPercent(null)
    setCustomDollars('')
    onChange(0)
  }

  function handleCustomChange(val: string) {
    setCustomDollars(val)
    setMode('custom')
    setSelectedPercent(null)

    const parsed = parseFloat(val)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      onChange(0)
    } else {
      onChange(Math.round(parsed * 100))
    }
  }

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900/50 p-4 space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-stone-200">Add a tip (optional)</h3>
        <p className="text-xs text-stone-500">
          Tips are processed as a separate charge and go directly to your chef.
        </p>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {presetAmounts.map((preset) => {
          const isActive = mode === 'preset' && selectedPercent === preset.percent
          return (
            <button
              key={preset.percent}
              type="button"
              onClick={() => selectPreset(preset.percent, preset.amountCents)}
              className={`flex flex-col items-center rounded-lg border px-4 py-2.5 text-sm transition min-w-[72px] ${
                isActive
                  ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                  : 'border-stone-700 bg-stone-800 text-stone-300 hover:border-stone-500'
              }`}
            >
              <span className="font-semibold">{preset.label}</span>
              <span className="text-[11px] text-stone-500 mt-0.5">
                {formatCents(preset.amountCents)}
              </span>
            </button>
          )
        })}

        {/* No tip button */}
        <button
          type="button"
          onClick={selectNoTip}
          className={`flex flex-col items-center rounded-lg border px-4 py-2.5 text-sm transition min-w-[72px] ${
            mode === 'none'
              ? 'border-stone-500 bg-stone-700/50 text-stone-200'
              : 'border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-500'
          }`}
        >
          <span className="font-semibold">No tip</span>
        </button>
      </div>

      {/* Custom input */}
      <div className="space-y-1.5">
        <label htmlFor="tip-custom" className="block text-xs font-medium text-stone-400">
          Custom amount
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">$</span>
          <Input
            id="tip-custom"
            inputMode="decimal"
            placeholder="0.00"
            value={customDollars}
            onChange={(e) => handleCustomChange(e.target.value)}
            className="pl-7"
          />
        </div>
      </div>

      {/* Summary */}
      {value > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-amber-950/20 border border-amber-900/30 px-3 py-2">
          <span className="text-sm text-stone-400">Tip amount</span>
          <span className="text-sm font-semibold text-amber-300">{formatCents(value)}</span>
        </div>
      )}
    </div>
  )
}
