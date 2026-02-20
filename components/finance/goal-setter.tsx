'use client'

import { useState } from 'react'
import { updateChefPreferences } from '@/lib/chef/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface GoalSetterProps {
  currentTargetCents: number
}

export function GoalSetter({ currentTargetCents }: GoalSetterProps) {
  const currentDollars = (currentTargetCents / 100).toFixed(0)
  const [value, setValue] = useState(currentDollars)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const dollars = parseFloat(value.replace(/[^0-9.]/g, ''))
    if (isNaN(dollars) || dollars < 0) {
      setError('Please enter a valid dollar amount.')
      return
    }

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const cents = Math.round(dollars * 100)
      await updateChefPreferences({
        target_annual_revenue_cents: cents,
        revenue_goal_program_enabled: true,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save goal.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">
        Set your annual revenue target. ChefFlow will track your progress and suggest ways to reach it.
      </p>
      <div className="flex items-start gap-3">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm pointer-events-none">
            $
          </span>
          <Input
            type="number"
            min={0}
            step={1000}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setSaved(false)
            }}
            className="pl-7"
            placeholder="120000"
            aria-label="Annual revenue target in dollars"
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Set Goal'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {saved && (
        <p className="text-sm text-green-600">Goal saved successfully.</p>
      )}
      <p className="text-xs text-stone-400">
        Current target: ${(currentTargetCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })} / year
      </p>
    </div>
  )
}
