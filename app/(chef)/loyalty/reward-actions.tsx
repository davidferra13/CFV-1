'use client'

// Reward management actions — inline edit form + deactivate
// Appears on each row of the Rewards Catalog on the loyalty dashboard.

import { useState, useTransition } from 'react'
import { updateReward, deactivateReward, type LoyaltyReward, type UpdateRewardInput } from '@/lib/loyalty/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const REWARD_TYPES = [
  { value: 'free_course', label: 'Free Course' },
  { value: 'discount_fixed', label: 'Fixed Discount ($)' },
  { value: 'discount_percent', label: 'Percent Discount (%)' },
  { value: 'free_dinner', label: 'Free Dinner' },
  { value: 'upgrade', label: 'Upgrade / Enhancement' },
] as const

export function RewardActions({ reward }: { reward: LoyaltyReward }) {
  const [mode, setMode] = useState<'idle' | 'editing'>('idle')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Edit form state — pre-populated from current reward
  const [name, setName] = useState(reward.name)
  const [description, setDescription] = useState(reward.description || '')
  const [points, setPoints] = useState(reward.points_required)
  const [rewardType, setRewardType] = useState(reward.reward_type)
  const [valueDollars, setValueDollars] = useState(
    reward.reward_value_cents ? (reward.reward_value_cents / 100).toFixed(2) : ''
  )
  const [valuePercent, setValuePercent] = useState(
    reward.reward_percent ? String(reward.reward_percent) : ''
  )

  function handleDeactivate() {
    if (!confirm(`Remove "${reward.name}"? Clients will no longer be able to redeem it.`)) return
    startTransition(async () => {
      try {
        await deactivateReward(reward.id)
      } catch {
        setError('Failed to remove reward')
      }
    })
  }

  function handleSave() {
    setError(null)
    if (!name.trim()) { setError('Name is required'); return }
    if (points < 1) { setError('Points must be at least 1'); return }
    if (rewardType === 'discount_fixed' && !valueDollars) {
      setError('Enter a discount amount'); return
    }
    if (rewardType === 'discount_percent' && !valuePercent) {
      setError('Enter a discount percentage'); return
    }

    const input: UpdateRewardInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      points_required: points,
      reward_type: rewardType,
      reward_value_cents: rewardType === 'discount_fixed'
        ? Math.round(parseFloat(valueDollars) * 100)
        : null,
      reward_percent: rewardType === 'discount_percent'
        ? parseInt(valuePercent)
        : null,
    }

    startTransition(async () => {
      try {
        await updateReward(reward.id, input)
        setMode('idle')
      } catch (err: any) {
        setError(err?.message || 'Failed to save reward')
      }
    })
  }

  function handleCancel() {
    // Reset to original values
    setName(reward.name)
    setDescription(reward.description || '')
    setPoints(reward.points_required)
    setRewardType(reward.reward_type)
    setValueDollars(reward.reward_value_cents ? (reward.reward_value_cents / 100).toFixed(2) : '')
    setValuePercent(reward.reward_percent ? String(reward.reward_percent) : '')
    setError(null)
    setMode('idle')
  }

  if (mode === 'idle') {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode('editing')}
          disabled={isPending}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeactivate}
          disabled={isPending}
          className="text-stone-400 hover:text-red-600"
        >
          {isPending ? 'Removing...' : 'Remove'}
        </Button>
      </div>
    )
  }

  // Inline edit form
  return (
    <div className="mt-4 p-4 rounded-xl border border-brand-200 bg-brand-50/30 space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-stone-600 mb-1">Reward Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Complimentary appetizer course"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-stone-600 mb-1">Description (optional)</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description shown to clients"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Points Required</label>
          <Input
            type="number"
            min="1"
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
            className="w-32"
          />
        </div>
      </div>

      {/* Reward type selector */}
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-2">Reward Type</label>
        <div className="flex flex-wrap gap-2">
          {REWARD_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setRewardType(t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                rewardType === t.value
                  ? 'border-brand-500 bg-brand-100 text-brand-700'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional value fields */}
      {rewardType === 'discount_fixed' && (
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Discount Amount ($)</label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={valueDollars}
            onChange={(e) => setValueDollars(e.target.value)}
            placeholder="e.g., 25.00"
            className="w-32"
          />
        </div>
      )}
      {rewardType === 'discount_percent' && (
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Discount Percentage</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              max="100"
              value={valuePercent}
              onChange={(e) => setValuePercent(e.target.value)}
              placeholder="e.g., 15"
              className="w-24"
            />
            <span className="text-sm text-stone-500">%</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
